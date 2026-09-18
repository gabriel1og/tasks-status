const assert = require("node:assert/strict");
const test = require("node:test");
const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const {
  QUERY_FIELDS,
  QUERY_OPERATOR_LABELS,
  createQueryCondition,
  getQueryOperators,
  validateQueryDefinition,
  filterQueryTasks,
  getTaskCalendarDate,
} = loadTypeScript("lib/task-queries.ts");

function task(overrides = {}) {
  return {
    id: "task-1",
    user_id: "user-1",
    nome: "Revisão da Integração",
    azure: "12345",
    azure_url: "https://dev.azure.com/team/_workitems/edit/12345?view=a+b",
    liveops_url: "https://liveops.example/ticket/456",
    github_references: [
      {
        branch: "feature/github-info",
        pr_url: "https://github.com/gabriel1og/tasks-status/pull/4",
      },
      {
        branch: "fix/github-review",
        pr_url: "https://github.com/gabriel1og/tasks-status/pull/5",
      },
    ],
    areas: ["frontend", "backend"],
    sprint: "Sprint 10",
    sprint_id: "sprint-10",
    is_future: false,
    status: "Em andamento",
    ambiente: "Homologação",
    created_at: "2026-09-11T12:00:00.000Z",
    ...overrides,
  };
}

function condition(field, operator, value = "", id = field) {
  return { id, field, operator, value };
}

function query(conditions, match = "all") {
  return { match, conditions };
}

function matches(taskRow, field, operator, value = "") {
  return (
    filterQueryTasks([taskRow], query([condition(field, operator, value)]))
      .length === 1
  );
}

test("exposes every persisted task field with suitable operators and labels", () => {
  assert.deepEqual(
    QUERY_FIELDS.map((field) => field.value).sort(),
    Object.keys(task()).sort(),
  );
  assert.deepEqual(getQueryOperators("is_future"), ["eq", "neq"]);
  assert.ok(getQueryOperators("github_references").includes("contains"));
  assert.ok(getQueryOperators("created_at").includes("on_or_after"));
  assert.ok(!getQueryOperators("created_at").includes("contains"));
  assert.ok(!getQueryOperators("nome").includes("before"));
  assert.deepEqual(getQueryOperators("unknown"), []);
  QUERY_FIELDS.forEach(({ value }) =>
    getQueryOperators(value).forEach((operator) => {
      assert.equal(typeof QUERY_OPERATOR_LABELS[operator], "string");
    }),
  );
});

test("creates unique editable conditions and a valid boolean default", () => {
  const first = createQueryCondition();
  const second = createQueryCondition();
  assert.notEqual(first.id, second.id);
  assert.equal(first.field, "nome");
  assert.equal(first.operator, "contains");
  assert.equal(createQueryCondition("is_future").value, "true");
  assert.equal(
    validateQueryDefinition(query([createQueryCondition("is_future")])),
    null,
  );
});

test("filters every text field, including ids and links", () => {
  const currentTask = task();
  for (const field of QUERY_FIELDS.filter((field) => field.type === "text")) {
    assert.ok(
      matches(currentTask, field.value, "eq", currentTask[field.value]),
      field.value,
    );
    assert.ok(
      !matches(currentTask, field.value, "eq", "never-matches"),
      field.value,
    );
  }
});

test("filters each GitHub branch and PR independently", () => {
  assert.ok(matches(task(), "github_references", "eq", "fix/github-review"));
  assert.ok(matches(task(), "github_references", "contains", "pull/5"));
  assert.ok(matches(task(), "github_references", "starts_with", "feature/"));
  assert.ok(matches(task(), "github_references", "neq", "feature/missing"));
  assert.ok(!matches(task(), "github_references", "not_contains", "pull/4"));
  assert.ok(matches(task({ github_references: [] }), "github_references", "is_empty"));
});

test("filters the optional task areas independently", () => {
  assert.ok(matches(task(), "areas", "eq", "frontend"));
  assert.ok(matches(task(), "areas", "contains", "BACK"));
  assert.ok(matches(task({ areas: ["frontend"] }), "areas", "neq", "backend"));
  assert.ok(matches(task({ areas: [] }), "areas", "is_empty"));
});

test("combines all and any conditions without mutating the task list", () => {
  const tasks = [
    task(),
    task({ id: "task-2", status: "Concluído", ambiente: "Produção" }),
  ];
  const conditions = [
    condition("status", "eq", "Concluído"),
    condition("ambiente", "eq", "Homologação"),
  ];
  assert.deepEqual(filterQueryTasks(tasks, query(conditions)), []);
  assert.deepEqual(filterQueryTasks(tasks, query(conditions, "any")), tasks);
  assert.equal(tasks.length, 2);
});

test("empty valid definitions intentionally include all current tasks", () => {
  const tasks = [task(), task({ id: "task-2", is_future: true })];
  assert.equal(validateQueryDefinition(query([])), null);
  assert.deepEqual(filterQueryTasks(tasks, query([])), tasks);
  assert.deepEqual(filterQueryTasks(tasks, query([], "any")), tasks);
  assert.notEqual(filterQueryTasks(tasks, query([])), tasks);
});

test("text operations ignore case, accents and surrounding whitespace", () => {
  assert.ok(matches(task(), "nome", "eq", " revisão da integração "));
  assert.ok(matches(task(), "nome", "contains", "INTEGRACAO"));
  assert.ok(matches(task(), "nome", "starts_with", "revisao"));
  assert.ok(matches(task(), "nome", "neq", "Outra tarefa"));
  assert.ok(matches(task(), "nome", "not_contains", "deploy"));
  assert.ok(!matches(task(), "nome", "not_contains", "revisao"));
  assert.ok(!matches(task(), "nome", "starts_with", "integracao"));
});

test("punctuation and query-like values remain literal text", () => {
  const literal = task({ nome: "SQL [%_.*] OR status.eq.Done; 'test'" });
  assert.ok(matches(literal, "nome", "contains", "[%_.*]"));
  assert.ok(!matches(literal, "nome", "contains", "^SQL.*test$"));
  assert.ok(matches(task(), "azure_url", "contains", "?view=a+b"));
});

test("empty operators handle null, missing and whitespace text values", () => {
  for (const emptyValue of [null, undefined, "", "   "]) {
    assert.ok(
      matches(task({ sprint_id: emptyValue }), "sprint_id", "is_empty"),
    );
    assert.ok(
      !matches(task({ sprint_id: emptyValue }), "sprint_id", "is_not_empty"),
    );
  }
  assert.ok(matches(task(), "azure_url", "is_not_empty"));
  assert.ok(
    matches(task({ sprint_id: null }), "sprint_id", "neq", "sprint-10"),
  );
});

test("boolean filters distinguish true and false for eq and neq", () => {
  for (const isFuture of [true, false]) {
    assert.ok(
      matches(
        task({ is_future: isFuture }),
        "is_future",
        "eq",
        String(isFuture),
      ),
    );
    assert.ok(
      matches(
        task({ is_future: isFuture }),
        "is_future",
        "neq",
        String(!isFuture),
      ),
    );
    assert.ok(
      !matches(
        task({ is_future: isFuture }),
        "is_future",
        "eq",
        String(!isFuture),
      ),
    );
  }
  assert.ok(!matches(task({ is_future: null }), "is_future", "neq", "true"));
});

test("date filters use the local calendar day and inclusive/exclusive boundaries", () => {
  const lastMinute = new Date(2026, 8, 11, 23, 59, 59).toISOString();
  const dateTask = task({ created_at: lastMinute });
  assert.ok(matches(dateTask, "created_at", "eq", "2026-09-11"));
  assert.ok(!matches(dateTask, "created_at", "neq", "2026-09-11"));
  assert.ok(!matches(dateTask, "created_at", "before", "2026-09-11"));
  assert.ok(!matches(dateTask, "created_at", "after", "2026-09-11"));
  assert.ok(matches(dateTask, "created_at", "on_or_before", "2026-09-11"));
  assert.ok(matches(dateTask, "created_at", "on_or_after", "2026-09-11"));
  assert.ok(matches(dateTask, "created_at", "before", "2026-09-12"));
  assert.ok(matches(dateTask, "created_at", "after", "2026-09-10"));
});

test("calendar dates can be reused by results without a UTC day shift", () => {
  const firstMinute = new Date(2026, 8, 11, 0, 0, 1).toISOString();
  const lastMinute = new Date(2026, 8, 11, 23, 59, 59).toISOString();
  assert.equal(getTaskCalendarDate(firstMinute), "2026-09-11");
  assert.equal(getTaskCalendarDate(lastMinute), "2026-09-11");
  assert.equal(getTaskCalendarDate(null), null);
  assert.equal(getTaskCalendarDate(""), null);
  assert.equal(getTaskCalendarDate("invalid"), null);
});

test("missing dates are empty, and invalid timestamps never satisfy date comparisons", () => {
  assert.ok(matches(task({ created_at: null }), "created_at", "is_empty"));
  assert.ok(
    !matches(
      task({ created_at: "invalid" }),
      "created_at",
      "after",
      "2026-09-11",
    ),
  );
  assert.ok(
    !matches(
      task({ created_at: "invalid" }),
      "created_at",
      "neq",
      "2026-09-11",
    ),
  );
});

test("validates real calendar dates, including leap days", () => {
  assert.equal(
    validateQueryDefinition(
      query([condition("created_at", "eq", "2024-02-29")]),
    ),
    null,
  );
  for (const invalidDate of [
    "2025-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-09-00",
    "0000-01-01",
    "11/09/2026",
    "2026-9-11",
  ]) {
    assert.ok(
      validateQueryDefinition(
        query([condition("created_at", "eq", invalidDate)]),
      ),
      invalidDate,
    );
  }
});

test("rejects malformed definitions instead of returning every task", () => {
  const malformed = [
    null,
    undefined,
    [],
    {},
    { match: "all" },
    { match: "unknown", conditions: [] },
    { match: "all", conditions: {} },
    query([null]),
    query([{}]),
    query([condition("unknown", "eq", "x")]),
    query([condition("nome", "unknown", "x")]),
    query([condition("nome", "before", "x")]),
    query([condition("created_at", "contains", "2026")]),
    query([condition("is_future", "eq", "Sim")]),
    query([condition("is_future", "is_empty")]),
    query([condition("nome", "contains", " ")]),
    query([condition("nome", "eq", 1)]),
    query([condition("nome", "eq", "x", "")]),
    query([condition("nome", "eq", "x".repeat(2001))]),
  ];
  for (const definition of malformed) {
    assert.equal(typeof validateQueryDefinition(definition), "string");
    assert.deepEqual(filterQueryTasks([task()], definition), []);
  }
});

test("enforces unique condition ids and the 50 condition limit", () => {
  const conditions = Array.from({ length: 50 }, (_, index) =>
    condition("nome", "contains", "Revisão", String(index)),
  );
  assert.equal(validateQueryDefinition(query(conditions)), null);
  assert.ok(
    validateQueryDefinition(
      query([...conditions, condition("nome", "eq", "x", "extra")]),
    ),
  );
  assert.ok(validateQueryDefinition(query([conditions[0], conditions[0]])));
});

test("a bad condition cannot hide behind a successful any condition", () => {
  const definition = query(
    [
      condition("nome", "contains", "Revisão"),
      condition("status", "unknown", "x"),
    ],
    "any",
  );
  assert.deepEqual(filterQueryTasks([task()], definition), []);
});
