const assert = require("node:assert/strict");
const test = require("node:test");

const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const {
  FakeTimeTrackingClient,
  assertOwnedRequests,
  createCategory,
  createEntry,
  createSettings,
  otherOwnerId,
  ownerId,
} = require("./helpers/time-tracking-repository-fakes.cjs");
const { createTimeTrackingRepository } = loadTypeScript(
  "lib/time-tracking/time-tracking-repository.ts",
);

const fixedClock = { now: () => new Date("2026-09-19T15:00:00.000Z") };

function createRepository(client) {
  return createTimeTrackingRepository(client, fixedClock);
}

function createEntryInput(overrides = {}) {
  return {
    entry_date: "2026-09-19",
    duration_minutes: 60,
    task: "  Implementação  ",
    category_id: "category-1",
    ...overrides,
  };
}

test("reads settings, categories and entries only through the owner", async () => {
  const client = new FakeTimeTrackingClient({
    time_tracking_settings: [createSettings(), createSettings(otherOwnerId)],
    time_categories: [
      createCategory("category-1"),
      createCategory("category-2", otherOwnerId),
    ],
    time_entries: [
      createEntry("entry-1"),
      createEntry("entry-2", otherOwnerId),
    ],
  });
  const repository = createRepository(client);
  assert.equal((await repository.getSettings(ownerId)).user_id, ownerId);
  assert.deepEqual(
    (await repository.listCategories(ownerId)).map((row) => row.id),
    ["category-1"],
  );
  assert.deepEqual(
    (await repository.listEntries(ownerId)).map((row) => row.id),
    ["entry-1"],
  );
  assertOwnedRequests(client);
});

test("creates and updates the daily goal with owner isolation", async () => {
  const client = new FakeTimeTrackingClient();
  const repository = createRepository(client);
  const created = await repository.saveSettings(ownerId, {
    daily_goal_minutes: 360,
  });
  const updated = await repository.saveSettings(ownerId, {
    daily_goal_minutes: 420,
  });
  assert.equal(created.daily_goal_minutes, 360);
  assert.equal(updated.daily_goal_minutes, 420);
  assert.equal(client.records.time_tracking_settings.length, 1);
  assertOwnedRequests(client);
});

test("creates default categories idempotently", async () => {
  const client = new FakeTimeTrackingClient();
  const repository = createRepository(client);
  const first = await repository.ensureDefaultCategories(ownerId);
  const second = await repository.ensureDefaultCategories(ownerId);
  assert.equal(first.length, 4);
  assert.deepEqual(second, first);
  assert.equal(client.records.time_categories.length, 4);
  assertOwnedRequests(client);
});

test("runs the complete category lifecycle", async () => {
  const client = new FakeTimeTrackingClient();
  const repository = createRepository(client);
  const created = await repository.createCategory(ownerId, {
    name: "  Reunião  ",
    color: "#AABBCC",
  });
  const updated = await repository.updateCategory(ownerId, created.id, {
    name: "Cerimônia",
    color: "#7c3aed",
  });
  const archived = await repository.archiveCategory(ownerId, created.id);
  assert.equal(updated.name, "Cerimônia");
  assert.equal(archived.archived_at, "2026-09-19T15:00:00.000Z");
  assert.deepEqual(await repository.listCategories(ownerId, false), []);
  const restored = await repository.restoreCategory(ownerId, created.id);
  assert.equal(restored.archived_at, null);
  await repository.deleteCategory(ownerId, created.id);
  assert.deepEqual(client.records.time_categories, []);
  assertOwnedRequests(client);
});

test("checks category usage without crossing the owner boundary", async () => {
  const client = new FakeTimeTrackingClient({
    time_entries: [
      createEntry("entry-1", ownerId, { category_id: "category-used" }),
      createEntry("entry-2", otherOwnerId, { category_id: "category-private" }),
    ],
  });
  const repository = createRepository(client);
  assert.equal(
    await repository.categoryHasEntries(ownerId, "category-used"),
    true,
  );
  assert.equal(
    await repository.categoryHasEntries(ownerId, "category-unused"),
    false,
  );
  assert.equal(
    await repository.categoryHasEntries(ownerId, "category-private"),
    false,
  );
  assertOwnedRequests(client);
});

test("preserves used categories even when deletion bypasses the interface", async () => {
  const usedCategory = createCategory("category-used");
  const client = new FakeTimeTrackingClient({
    time_categories: [usedCategory],
    time_entries: [
      createEntry("entry-1", ownerId, { category_id: usedCategory.id }),
    ],
  });
  await assert.rejects(
    () => createRepository(client).deleteCategory(ownerId, usedCategory.id),
    { code: "TIME_CATEGORY_IN_USE" },
  );
  assert.deepEqual(client.records.time_categories, [usedCategory]);
  assertOwnedRequests(client);
});

test("runs the complete entry lifecycle and applies date filters", async () => {
  const client = new FakeTimeTrackingClient({
    time_categories: [createCategory("category-1")],
  });
  const repository = createRepository(client);
  const created = await repository.createEntry(ownerId, createEntryInput());
  assert.equal(created.task, "Implementação");
  const updated = await repository.updateEntry(
    ownerId,
    created.id,
    createEntryInput({ duration_minutes: 90 }),
  );
  assert.equal(updated.duration_minutes, 90);
  const listed = await repository.listEntries(ownerId, {
    startDate: "2026-09-01",
    endDate: "2026-09-30",
  });
  assert.deepEqual(listed.map((entry) => entry.id), [created.id]);
  await repository.deleteEntry(ownerId, created.id);
  assert.deepEqual(client.records.time_entries, []);
  assertOwnedRequests(client);
});

test("filters and paginates the entry history with an exact count", async () => {
  const client = new FakeTimeTrackingClient({
    time_entries: [
      createEntry("entry-1", ownerId, {
        entry_date: "2026-09-18",
        task: "Relatório mensal",
        category_id: "category-1",
      }),
      createEntry("entry-2", ownerId, {
        entry_date: "2026-09-17",
        task: "Relatório semanal",
        category_id: "category-1",
      }),
      createEntry("entry-3", ownerId, {
        entry_date: "2026-09-16",
        task: "Cerimônia",
        category_id: "category-2",
      }),
      createEntry("entry-4", otherOwnerId, { task: "Relatório externo" }),
    ],
  });
  const page = await createRepository(client).listEntriesPage(ownerId, {
    categoryId: "category-1",
    page: 2,
    pageSize: 1,
    task: "relatório",
  });
  assert.deepEqual(page, {
    entries: [client.records.time_entries[1]],
    page: 2,
    pageSize: 1,
    totalCount: 2,
    totalPages: 2,
  });
  assertOwnedRequests(client);
});

test("rejects invalid history pagination before database I/O", async () => {
  const client = new FakeTimeTrackingClient();
  await assert.rejects(
    () =>
      createRepository(client).listEntriesPage(ownerId, {
        page: 0,
        pageSize: 101,
      }),
    /Paginação inválida/,
  );
  assert.deepEqual(client.calls, []);
});

test("cannot mutate records owned by another account", async () => {
  const foreignCategory = createCategory("category-1", otherOwnerId);
  const foreignEntry = createEntry("entry-1", otherOwnerId);
  const client = new FakeTimeTrackingClient({
    time_categories: [foreignCategory],
    time_entries: [foreignEntry],
  });
  const repository = createRepository(client);
  await assert.rejects(
    () =>
      repository.updateCategory(ownerId, foreignCategory.id, {
        name: "Alterada",
        color: "#2563eb",
      }),
    { code: "PGRST116" },
  );
  await assert.rejects(
    () => repository.deleteEntry(ownerId, foreignEntry.id),
    { code: "PGRST116" },
  );
  await assert.rejects(
    () => repository.deleteCategory(ownerId, foreignCategory.id),
    { code: "PGRST116" },
  );
  assert.deepEqual(client.records.time_categories, [foreignCategory]);
  assert.deepEqual(client.records.time_entries, [foreignEntry]);
  assertOwnedRequests(client);
});

test("rejects invalid input before database I/O", async () => {
  const client = new FakeTimeTrackingClient();
  const repository = createRepository(client);
  await assert.rejects(
    () => repository.saveSettings(ownerId, { daily_goal_minutes: 0 }),
    /Meta diária inválida/,
  );
  await assert.rejects(
    () =>
      repository.createCategory(ownerId, { name: " ", color: "#2563eb" }),
    /Nome de categoria inválido/,
  );
  await assert.rejects(
    () =>
      repository.createEntry(
        ownerId,
        createEntryInput({ entry_date: "2026-09-20" }),
      ),
    /não pode estar no futuro/,
  );
  assert.deepEqual(client.calls, []);
});

test("propagates Supabase failures without reporting success", async () => {
  const client = new FakeTimeTrackingClient();
  const failure = { code: "42501", message: "Simulated insert failure" };
  client.fail("time_categories", "insert", failure);
  await assert.rejects(
    () =>
      createRepository(client).createCategory(ownerId, {
        name: "Reunião",
        color: "#2563eb",
      }),
    (error) => error === failure,
  );
  assertOwnedRequests(client);
});
