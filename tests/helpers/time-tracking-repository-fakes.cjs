const assert = require("node:assert/strict");

const ownerId = "account-owner";
const otherOwnerId = "another-account";
const tableNames = [
  "time_tracking_settings",
  "time_categories",
  "time_entries",
];

function createSettings(userId = ownerId, overrides = {}) {
  return {
    user_id: userId,
    daily_goal_minutes: 360,
    created_at: "2026-09-19T12:00:00.000Z",
    updated_at: "2026-09-19T12:00:00.000Z",
    ...overrides,
  };
}

function createCategory(id, userId = ownerId, overrides = {}) {
  return {
    id,
    user_id: userId,
    name: id,
    color: "#2563eb",
    archived_at: null,
    created_at: "2026-09-19T12:00:00.000Z",
    updated_at: "2026-09-19T12:00:00.000Z",
    ...overrides,
  };
}

function createEntry(id, userId = ownerId, overrides = {}) {
  return {
    id,
    user_id: userId,
    entry_date: "2026-09-19",
    duration_minutes: 60,
    task: id,
    category_id: "category-1",
    created_at: "2026-09-19T12:00:00.000Z",
    updated_at: "2026-09-19T12:00:00.000Z",
    ...overrides,
  };
}

class FakeTimeTrackingClient {
  constructor(records = {}) {
    this.records = {
      time_tracking_settings: structuredClone(
        records.time_tracking_settings ?? [],
      ),
      time_categories: structuredClone(records.time_categories ?? []),
      time_entries: structuredClone(records.time_entries ?? []),
    };
    this.calls = [];
    this.failures = new Map();
    this.nextId = 1;
  }

  from(table) {
    assert.ok(tableNames.includes(table), `Unexpected table: ${table}`);
    return new FakeTimeTrackingRequest(this, table);
  }

  fail(table, operation, error) {
    this.failures.set(`${table}:${operation}`, error);
  }

  execute(request) {
    this.calls.push(request.snapshot());
    const failure = this.failures.get(`${request.table}:${request.operation}`);
    if (failure) return { data: null, error: failure };
    if (request.operation === "insert") return this.insert(request);
    if (request.operation === "upsert") return this.upsert(request);
    const matchingRows = this.getMatchingRows(request);
    if (request.operation === "update") {
      matchingRows.forEach((row) => Object.assign(row, request.payload));
    }
    if (request.operation === "delete") {
      this.records[request.table] = this.records[request.table].filter(
        (row) => !matchingRows.includes(row),
      );
    }
    return this.respond(request, matchingRows);
  }

  insert(request) {
    const payloads = Array.isArray(request.payload)
      ? request.payload
      : [request.payload];
    const inserted = payloads.map((payload) => this.createRow(request.table, payload));
    this.records[request.table].push(...inserted);
    return this.respond(request, inserted);
  }

  upsert(request) {
    const payloads = Array.isArray(request.payload)
      ? request.payload
      : [request.payload];
    const conflictFields = request.options.onConflict.split(",");
    const affected = payloads.map((payload) => {
      const existing = this.records[request.table].find((row) =>
        conflictFields.every((field) => row[field] === payload[field]),
      );
      if (!existing) {
        const created = this.createRow(request.table, payload);
        this.records[request.table].push(created);
        return created;
      }
      if (!request.options.ignoreDuplicates) Object.assign(existing, payload);
      return existing;
    });
    return this.respond(request, affected);
  }

  createRow(table, payload) {
    if (table === "time_tracking_settings") return createSettings(payload.user_id, payload);
    if (table === "time_categories") {
      return createCategory(`category-${this.nextId++}`, payload.user_id, payload);
    }
    return createEntry(`entry-${this.nextId++}`, payload.user_id, payload);
  }

  getMatchingRows(request) {
    return this.records[request.table].filter((row) =>
      request.filters.every(({ operator, field, value }) => {
        if (operator === "eq") return row[field] === value;
        if (operator === "is") return row[field] === value;
        if (operator === "gte") return row[field] >= value;
        if (operator === "lte") return row[field] <= value;
        if (operator === "ilike") return matchesIlike(row[field], value);
        return false;
      }),
    );
  }

  respond(request, rows) {
    let selectedRows = [...rows];
    const totalCount = selectedRows.length;
    if (request.orders.length > 0) {
      selectedRows.sort((left, right) => compareRows(left, right, request.orders));
    }
    if (request.rangeStart !== null) {
      selectedRows = selectedRows.slice(request.rangeStart, request.rangeEnd + 1);
    }
    if (request.singleRow && selectedRows.length !== 1) {
      return {
        data: null,
        error: { code: "PGRST116", message: "Expected one owned row." },
      };
    }
    const selected = request.singleRow ? selectedRows[0] : selectedRows;
    return {
      count: request.includeCount ? totalCount : null,
      data: structuredClone(selected ?? null),
      error: null,
    };
  }
}

class FakeTimeTrackingRequest {
  operation = "select";
  payload = null;
  options = null;
  filters = [];
  singleRow = false;
  optionalSingleRow = false;
  orders = [];
  includeCount = false;
  rangeStart = null;
  rangeEnd = null;

  constructor(client, table) {
    this.client = client;
    this.table = table;
  }

  select(_columns, options = {}) {
    this.includeCount = options.count === "exact";
    return this;
  }

  eq(field, value) {
    this.filters.push({ operator: "eq", field, value });
    return this;
  }

  is(field, value) {
    this.filters.push({ operator: "is", field, value });
    return this;
  }

  gte(field, value) {
    this.filters.push({ operator: "gte", field, value });
    return this;
  }

  lte(field, value) {
    this.filters.push({ operator: "lte", field, value });
    return this;
  }

  ilike(field, value) {
    this.filters.push({ operator: "ilike", field, value });
    return this;
  }

  order(field, options = {}) {
    this.orders.push({ field, ascending: options.ascending ?? true });
    return this;
  }

  range(start, end) {
    this.rangeStart = start;
    this.rangeEnd = end;
    return this;
  }

  insert(payload) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  upsert(payload, options) {
    this.operation = "upsert";
    this.payload = payload;
    this.options = options;
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

  maybeSingle() {
    this.optionalSingleRow = true;
    return this;
  }

  then(resolve, reject) {
    return Promise.resolve()
      .then(() => {
        if (!this.optionalSingleRow) return this.client.execute(this);
        const response = this.client.execute(this);
        if (response.error || response.data.length > 1) return response;
        return { data: response.data[0] ?? null, error: null };
      })
      .then(resolve, reject);
  }

  snapshot() {
    return structuredClone({
      table: this.table,
      operation: this.operation,
      payload: this.payload,
      options: this.options,
      filters: this.filters,
      orders: this.orders,
      includeCount: this.includeCount,
      rangeStart: this.rangeStart,
      rangeEnd: this.rangeEnd,
    });
  }
}

function matchesIlike(fieldValue, pattern) {
  const searchValue = pattern
    .replace(/^%|%$/g, "")
    .replace(/\\([\\%_])/g, "$1")
    .toLocaleLowerCase("pt-BR");
  return String(fieldValue).toLocaleLowerCase("pt-BR").includes(searchValue);
}

function compareRows(left, right, orders) {
  for (const order of orders) {
    const comparison = String(left[order.field]).localeCompare(
      String(right[order.field]),
    );
    if (comparison !== 0) return order.ascending ? comparison : -comparison;
  }
  return 0;
}

function assertOwnedRequests(client) {
  assert.ok(client.calls.length > 0);
  for (const request of client.calls) {
    if (["insert", "upsert"].includes(request.operation)) {
      const payloads = Array.isArray(request.payload)
        ? request.payload
        : [request.payload];
      assert.ok(payloads.every((payload) => payload.user_id === ownerId));
      continue;
    }
    assert.ok(
      request.filters.some(
        (filter) => filter.field === "user_id" && filter.value === ownerId,
      ),
      `${request.operation} ${request.table} requires user_id`,
    );
  }
}

module.exports = {
  FakeTimeTrackingClient,
  assertOwnedRequests,
  createCategory,
  createEntry,
  createSettings,
  otherOwnerId,
  ownerId,
};
