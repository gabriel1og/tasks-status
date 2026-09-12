const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const repositoryPath = path.resolve(__dirname, "../../lib/query-repository.ts");
const repositoryCode = ts.transpileModule(
  readFileSync(repositoryPath, "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const ownerId = "account-owner";
const otherOwnerId = "another-account";
const tableNames = [
  "saved_queries",
  "query_folders",
  "task_statuses",
  "tag_options",
  "sprints",
];

function createDefinition() {
  return {
    match: "all",
    conditions: [
      {
        id: "condition-1",
        field: "status",
        operator: "eq",
        value: "Concluído",
      },
    ],
  };
}

function createQueryInput() {
  return {
    nome: "  Entregas  ",
    descricao: "  Em homologação  ",
    folder_id: "folder-1",
    definition: createDefinition(),
  };
}

function createRecord(id, userId = ownerId, overrides = {}) {
  return {
    id,
    user_id: userId,
    nome: id,
    descricao: "",
    folder_id: null,
    is_favorite: false,
    definition: createDefinition(),
    created_at: "2026-09-11T12:00:00.000Z",
    updated_at: "2026-09-11T12:00:00.000Z",
    ...overrides,
  };
}

class FakeQueryValidator {
  calls = [];
  error = null;

  validateQueryDefinition(definition) {
    this.calls.push(definition);
    return this.error;
  }
}

// No fake RLS is applied: missing frontend owner filters must be visible in these tests.
class FakeSupabaseClient {
  constructor(records = {}, responseCap = 1000, countOverride) {
    this.records = Object.fromEntries(
      tableNames.map((table) => [table, structuredClone(records[table] ?? [])]),
    );
    this.responseCap = responseCap;
    this.hasCountOverride = arguments.length >= 3;
    this.countOverride = countOverride;
    this.calls = [];
    this.failures = new Map();
  }

  from(table) {
    assert.ok(tableNames.includes(table), `Unexpected table: ${table}`);
    return new FakeSupabaseRequest(this, table);
  }

  fail(table, operation, error) {
    this.failures.set(`${table}:${operation}`, error);
  }

  execute(request) {
    this.calls.push(request.snapshot());
    const error = this.failures.get(`${request.table}:${request.operation}`);
    if (error) return { data: null, count: null, error };
    const matchingRows = this.records[request.table].filter((row) =>
      request.filters.every(([field, value]) => row[field] === value),
    );
    if (request.operation === "insert") return this.insertRow(request);
    if (request.operation === "update")
      matchingRows.forEach((row) => Object.assign(row, request.payload));
    if (request.operation === "delete")
      this.records[request.table] = this.records[request.table].filter(
        (row) => !matchingRows.includes(row),
      );
    return this.respond(request, matchingRows);
  }

  insertRow(request) {
    const record = createRecord(
      `inserted-${this.calls.length}`,
      request.payload.user_id,
      request.payload,
    );
    this.records[request.table].push(record);
    return this.respond(request, [record]);
  }

  respond(request, matchingRows) {
    if (request.singleRow && matchingRows.length !== 1)
      return {
        data: null,
        error: { code: "PGRST116", message: "Expected one owned row." },
        count: matchingRows.length,
      };
    const orderedRows = [...matchingRows].sort((left, right) =>
      String(left.id).localeCompare(String(right.id)),
    );
    const [first, last] = request.requestedRange ?? [0, this.responseCap - 1];
    const resultRows = orderedRows.slice(
      first,
      Math.min(last + 1, first + this.responseCap),
    );
    return {
      data: structuredClone(request.singleRow ? resultRows[0] : resultRows),
      error: null,
      count: this.hasCountOverride ? this.countOverride : matchingRows.length,
    };
  }
}

class FakeSupabaseRequest {
  operation = "select";
  payload = null;
  filters = [];
  requestedRange = null;
  singleRow = false;
  selectOptions = null;

  constructor(client, table) {
    this.client = client;
    this.table = table;
  }
  select(columns, options) {
    this.selectOptions = options ?? null;
    return this;
  }
  eq(field, value) {
    this.filters.push([field, value]);
    return this;
  }
  order(field) {
    this.orderField = field;
    return this;
  }
  range(first, last) {
    this.requestedRange = [first, last];
    return this;
  }
  insert(payload) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }
  update(payload) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.operation = "delete";
    return this;
  }
  single() {
    this.singleRow = true;
    return this;
  }
  then(resolve, reject) {
    return Promise.resolve()
      .then(() => this.client.execute(this))
      .then(resolve, reject);
  }

  snapshot() {
    return structuredClone({
      table: this.table,
      operation: this.operation,
      payload: this.payload,
      filters: this.filters,
      range: this.requestedRange,
      selectOptions: this.selectOptions,
      orderField: this.orderField,
    });
  }
}

function loadRepository(
  client = new FakeSupabaseClient(),
  validator = new FakeQueryValidator(),
) {
  const repositoryModule = new Module(repositoryPath, module);
  repositoryModule.filename = repositoryPath;
  repositoryModule.require = (specifier) => {
    if (specifier === "@/lib/supabase") return { supabase: client };
    if (specifier === "@/lib/task-queries")
      return {
        validateQueryDefinition:
          validator.validateQueryDefinition.bind(validator),
      };
    throw new Error(`Unexpected runtime dependency: ${specifier}`);
  };
  repositoryModule._compile(repositoryCode, repositoryPath);
  return repositoryModule.exports;
}

function assertOwnedRequests(client) {
  assert.ok(client.calls.length > 0);
  for (const request of client.calls) {
    if (request.operation === "insert")
      assert.equal(request.payload.user_id, ownerId);
    else
      assert.ok(
        request.filters.some(
          ([field, value]) => field === "user_id" && value === ownerId,
        ),
        `${request.operation} ${request.table} requires user_id`,
      );
  }
}

module.exports = {
  FakeQueryValidator,
  FakeSupabaseClient,
  assertOwnedRequests,
  createQueryInput,
  createRecord,
  ownerId,
  otherOwnerId,
  tableNames,
  loadRepository,
};
