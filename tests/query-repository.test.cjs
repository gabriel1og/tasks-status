const assert = require("node:assert/strict");
const test = require("node:test");
const {
  FakeQueryValidator,
  FakeSupabaseClient,
  assertOwnedRequests,
  createQueryInput,
  createRecord,
  loadRepository,
  ownerId,
  otherOwnerId,
  tableNames,
} = require("./helpers/query-repository-fakes.cjs");

test("workspace reads every table through user_id and excludes other accounts", async () => {
  const records = Object.fromEntries(
    tableNames.map((table) => [
      table,
      [createRecord("owned"), createRecord("foreign", otherOwnerId)],
    ]),
  );
  const client = new FakeSupabaseClient(records);
  const workspace = await loadRepository(client).loadQueryWorkspace(ownerId);
  for (const rows of Object.values(workspace))
    assert.deepEqual(
      rows.map((row) => row.id),
      ["owned"],
    );
  assertOwnedRequests(client);
  assert.deepEqual(
    new Set(client.calls.map((request) => request.table)),
    new Set(tableNames),
  );
});

for (const responseCap of [1000, 137]) {
  test(`workspace returns all 1207 tasks when server cap is ${responseCap}`, async () => {
    const tasks = Array.from({ length: 1207 }, (_, index) =>
      createRecord(`task-${String(index).padStart(4, "0")}`),
    );
    const client = new FakeSupabaseClient(
      { task_statuses: tasks },
      responseCap,
    );
    const workspace = await loadRepository(client).loadQueryWorkspace(ownerId);
    assert.equal(workspace.tasks.length, tasks.length);
    assert.equal(
      new Set(workspace.tasks.map((row) => row.id)).size,
      tasks.length,
    );
    const requests = client.calls.filter(
      (request) => request.table === "task_statuses",
    );
    assert.equal(
      requests.length,
      Math.ceil(tasks.length / Math.min(responseCap, 500)),
    );
    requests.forEach((request, index) =>
      assert.equal(request.range[0], index * Math.min(responseCap, 500)),
    );
    requests.forEach((request) =>
      assert.deepEqual(request.selectOptions, { count: "exact" }),
    );
    assertOwnedRequests(client);
  });
}

test("workspace keeps paging when Supabase omits the exact count", async () => {
  const tasks = Array.from({ length: 1001 }, (_, index) =>
    createRecord(`task-${String(index).padStart(4, "0")}`),
  );
  const client = new FakeSupabaseClient({ task_statuses: tasks }, 500, null);
  const workspace = await loadRepository(client).loadQueryWorkspace(ownerId);
  assert.equal(workspace.tasks.length, tasks.length);
  assert.deepEqual(
    client.calls
      .filter((request) => request.table === "task_statuses")
      .map((request) => request.range),
    [
      [0, 499],
      [500, 999],
      [1000, 1499],
      [1001, 1500],
    ],
  );
  assertOwnedRequests(client);
});

test("list workspace skips task, tag and sprint reads", async () => {
  const client = new FakeSupabaseClient();
  const workspace = await loadRepository(client).loadQueryWorkspace(
    ownerId,
    false,
  );
  assert.deepEqual(client.calls.map((request) => request.table).sort(), [
    "query_folders",
    "saved_queries",
  ]);
  assert.deepEqual(workspace.tasks, []);
  assert.deepEqual(workspace.tags, []);
  assert.deepEqual(workspace.sprints, []);
  assertOwnedRequests(client);
});

test("workspace orders recent queries and tasks first and folders by name", async () => {
  const older = createRecord("a", ownerId, {
    nome: "Zulu",
    updated_at: "2026-09-01",
    created_at: "2026-09-01",
  });
  const newer = createRecord("z", ownerId, {
    nome: "Alpha",
    updated_at: "2026-09-11",
    created_at: "2026-09-11",
  });
  const client = new FakeSupabaseClient({
    saved_queries: [older, newer],
    task_statuses: [older, newer],
    query_folders: [older, newer],
  });
  const workspace = await loadRepository(client).loadQueryWorkspace(ownerId);
  for (const property of ["queries", "tasks", "folders"])
    assert.deepEqual(
      workspace[property].map((row) => row.id),
      ["z", "a"],
    );
});

test("creating a query saves its folder and definition, trims text and assigns the owner", async () => {
  const client = new FakeSupabaseClient();
  const validator = new FakeQueryValidator();
  const input = createQueryInput();
  const result = await loadRepository(client, validator).saveQuery(
    ownerId,
    input,
  );
  assert.deepEqual(client.calls[0].payload, {
    ...input,
    nome: "Entregas",
    descricao: "Em homologação",
    user_id: ownerId,
  });
  assert.deepEqual(validator.calls, [input.definition]);
  assert.equal(result.folder_id, input.folder_id);
  assert.deepEqual(result.definition, input.definition);
  assert.equal(input.nome, "  Entregas  ");
  assertOwnedRequests(client);
});

test("editing a query persists new criteria and folder without resetting favorite", async () => {
  const existing = createRecord("query-1", ownerId, {
    is_favorite: true,
    folder_id: "old-folder",
  });
  const client = new FakeSupabaseClient({ saved_queries: [existing] });
  const input = createQueryInput();
  const result = await loadRepository(client).saveQuery(
    ownerId,
    input,
    existing.id,
  );
  assert.deepEqual(client.calls[0].filters, [
    ["id", existing.id],
    ["user_id", ownerId],
  ]);
  assert.equal(result.folder_id, input.folder_id);
  assert.deepEqual(result.definition, input.definition);
  assert.equal(result.is_favorite, true);
  assert.equal(Object.hasOwn(client.calls[0].payload, "is_favorite"), false);
  assertOwnedRequests(client);
});

test("editing a query can move it back to the root folder", async () => {
  const client = new FakeSupabaseClient({
    saved_queries: [
      createRecord("query-1", ownerId, { folder_id: "folder-1" }),
    ],
  });
  const result = await loadRepository(client).saveQuery(
    ownerId,
    { ...createQueryInput(), folder_id: null },
    "query-1",
  );
  assert.equal(result.folder_id, null);
  assertOwnedRequests(client);
});

test("favorite changes update only is_favorite for the owned query", async () => {
  const existing = createRecord("query-1", ownerId, { folder_id: "folder-1" });
  const client = new FakeSupabaseClient({ saved_queries: [existing] });
  const repository = loadRepository(client);
  await repository.setQueryFavorite(ownerId, existing.id, true);
  assert.deepEqual(client.records.saved_queries[0], {
    ...existing,
    is_favorite: true,
  });
  await repository.setQueryFavorite(ownerId, existing.id, false);
  assert.deepEqual(client.records.saved_queries[0], existing);
  assert.deepEqual(
    client.calls.map((request) => request.payload),
    [{ is_favorite: true }, { is_favorite: false }],
  );
  assertOwnedRequests(client);
});

test("query deletion preserves tasks and targets only its own saved query", async () => {
  const task = createRecord("task-1");
  const client = new FakeSupabaseClient({
    saved_queries: [createRecord("query-1"), createRecord("query-2")],
    task_statuses: [task],
  });
  await loadRepository(client).deleteQuery(ownerId, "query-1");
  assert.deepEqual(
    client.records.saved_queries.map((row) => row.id),
    ["query-2"],
  );
  assert.deepEqual(client.records.task_statuses, [task]);
  assert.deepEqual(
    client.calls.map((request) => request.table),
    ["saved_queries"],
  );
  assertOwnedRequests(client);
});

test("creating and renaming folders saves trimmed names with owner isolation", async () => {
  const client = new FakeSupabaseClient();
  const repository = loadRepository(client);
  const folder = await repository.saveQueryFolder(ownerId, "  Homologação  ");
  assert.equal(folder.nome, "Homologação");
  assert.deepEqual(client.calls[0].payload, {
    nome: "Homologação",
    user_id: ownerId,
  });
  const renamed = await repository.saveQueryFolder(
    ownerId,
    "  Produção  ",
    folder.id,
  );
  assert.equal(renamed.nome, "Produção");
  assert.deepEqual(client.calls[1].filters, [
    ["id", folder.id],
    ["user_id", ownerId],
  ]);
  assertOwnedRequests(client);
});

test("folder deletion targets only its owned folder and never deletes queries or tasks", async () => {
  const task = createRecord("task-1");
  const query = createRecord("query-1", ownerId, { folder_id: "folder-1" });
  const client = new FakeSupabaseClient({
    query_folders: [createRecord("folder-1")],
    saved_queries: [query],
    task_statuses: [task],
  });
  await loadRepository(client).deleteQueryFolder(ownerId, "folder-1");
  assert.deepEqual(client.records.query_folders, []);
  assert.deepEqual(client.records.saved_queries, [query]);
  assert.deepEqual(client.records.task_statuses, [task]);
  assert.deepEqual(
    client.calls.map((request) => request.table),
    ["query_folders"],
  );
  assertOwnedRequests(client);
});

const mutationCases = [
  [
    "create query",
    "saved_queries",
    "insert",
    (repository) => repository.saveQuery(ownerId, createQueryInput()),
  ],
  [
    "edit query",
    "saved_queries",
    "update",
    (repository) =>
      repository.saveQuery(ownerId, createQueryInput(), "record-1"),
  ],
  [
    "favorite query",
    "saved_queries",
    "update",
    (repository) => repository.setQueryFavorite(ownerId, "record-1", true),
  ],
  [
    "delete query",
    "saved_queries",
    "delete",
    (repository) => repository.deleteQuery(ownerId, "record-1"),
  ],
  [
    "create folder",
    "query_folders",
    "insert",
    (repository) => repository.saveQueryFolder(ownerId, "Entregas"),
  ],
  [
    "rename folder",
    "query_folders",
    "update",
    (repository) => repository.saveQueryFolder(ownerId, "Entregas", "record-1"),
  ],
  [
    "delete folder",
    "query_folders",
    "delete",
    (repository) => repository.deleteQueryFolder(ownerId, "record-1"),
  ],
];

for (const [label, table, operation, invoke] of mutationCases) {
  test(`${label} propagates Supabase failures without reporting success`, async () => {
    const client = new FakeSupabaseClient({
      [table]: [createRecord("record-1")],
    });
    const error = { code: "42501", message: `Simulated ${label} failure` };
    client.fail(table, operation, error);
    await assert.rejects(
      () => invoke(loadRepository(client)),
      (failure) => failure === error,
    );
    assertOwnedRequests(client);
  });
  if (operation === "insert") continue;
  test(`${label} cannot mutate another account's record`, async () => {
    const foreignRecord = createRecord("record-1", otherOwnerId);
    const client = new FakeSupabaseClient({ [table]: [foreignRecord] });
    await assert.rejects(() => invoke(loadRepository(client)), {
      code: "PGRST116",
    });
    assert.deepEqual(client.records[table], [foreignRecord]);
    assertOwnedRequests(client);
  });
}

for (const table of tableNames) {
  test(`workspace propagates ${table} read errors`, async () => {
    const client = new FakeSupabaseClient();
    const error = { code: "42P01", message: `Cannot load ${table}` };
    client.fail(table, "select", error);
    await assert.rejects(
      () => loadRepository(client).loadQueryWorkspace(ownerId),
      (failure) => failure === error,
    );
    assertOwnedRequests(client);
  });
}

test("invalid definitions are rejected before any database request", async () => {
  const client = new FakeSupabaseClient();
  const validator = new FakeQueryValidator();
  validator.error = "Critério inválido para a query.";
  await assert.rejects(
    () =>
      loadRepository(client, validator).saveQuery(ownerId, createQueryInput()),
    { message: validator.error },
  );
  assert.deepEqual(client.calls, []);
});

for (const name of ["   ", "x".repeat(121)]) {
  test(`invalid query and folder names of length ${name.length} are rejected before I/O`, async () => {
    const client = new FakeSupabaseClient();
    const repository = loadRepository(client);
    await assert.rejects(
      () =>
        repository.saveQuery(ownerId, { ...createQueryInput(), nome: name }),
      /Nome da query/,
    );
    await assert.rejects(
      () => repository.saveQueryFolder(ownerId, name),
      /Nome da pasta/,
    );
    assert.deepEqual(client.calls, []);
  });
}
