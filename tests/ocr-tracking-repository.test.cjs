const assert = require("node:assert/strict");
const test = require("node:test");
const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const { ocrFixture } = require("./helpers/ocr-fixtures.cjs");
const { FakeOcrClient } = require("./helpers/ocr-repository-fakes.cjs");
const { ocrTables, readOwnedRows, loadOcrWorkspace, importOcrSeeds, updateOcrRow, insertOcrChild, loadOcrEvents } = loadTypeScript("lib/ocr-tracking/repository.ts");

test("repository reads every owned page even when the server returns fewer than requested", async () => {
  const rows = Array.from({ length: 1207 }, (_, index) => ({ id: `row-${index}`, user_id: "owner" }));
  rows.push({ id: "foreign", user_id: "other" });
  const client = new FakeOcrClient({ ocr_tracking_items: rows });
  const owned = await readOwnedRows(client, ocrTables.items, "owner");
  assert.equal(owned.length, 1207);
  assert.ok(client.calls.every((call) => call.filters.some(([key, value]) => key === "user_id" && value === "owner")));
});

test("workspace reads only its four domain tables and excludes foreign child rows", async () => {
  const fixture = ocrFixture();
  const records = Object.fromEntries(Object.entries(ocrTables).map(([key, table]) => [table, [...fixture[key], { id: "foreign", user_id: "other" }]]));
  const client = new FakeOcrClient(records), workspace = await loadOcrWorkspace(client, "owner");
  for (const rows of Object.values(workspace)) assert.ok(rows.every((row) => row.user_id === "owner"));
  assert.deepEqual(new Set(client.calls.map((call) => call.table)), new Set(Object.values(ocrTables)));
});

test("updates filter by owner, ID and previous timestamp and reject stale writes", async () => {
  const item = ocrFixture().items[0], client = new FakeOcrClient({ ocr_tracking_items: [item] });
  const saved = await updateOcrRow(client, ocrTables.items, { ...item, assignee: "Pessoa" }, item);
  assert.equal(saved.assignee, "Pessoa");
  assert.deepEqual(client.calls[0].filters, [["user_id", "owner"], ["id", item.id], ["updated_at", item.updated_at]]);
  await assert.rejects(updateOcrRow(client, ocrTables.items, item, { ...item, updated_at: "stale" }));
});

test("RPC supplies the owner explicitly and propagates transaction failures", async () => {
  const client = new FakeOcrClient();
  assert.equal(await importOcrSeeds(client, "owner", [{}]), 1);
  assert.equal(client.calls[0].name, "import_ocr_tracking");
  assert.equal(client.calls[0].args.p_user_id, "owner");
  client.failure = { message: "Rollback" };
  await assert.rejects(importOcrSeeds(client, "owner", [{}]));
});

test("child insert binds owner and parent and event reads filter both", async () => {
  const client = new FakeOcrClient({ ocr_tracking_fields: [], ocr_tracking_events: [
    { id: "a", user_id: "owner", item_id: "parent", created_at: "2026-10-20" },
    { id: "b", user_id: "owner", item_id: "parent", created_at: "2026-10-21" },
    { id: "c", user_id: "other", item_id: "parent", created_at: "2026-10-22" },
  ] });
  await insertOcrChild(client, ocrTables.fields, "owner", "parent", { label: "Novo" });
  assert.equal(client.calls[0].payload.user_id, "owner");
  assert.equal(client.calls[0].payload.item_id, "parent");
  const events = await loadOcrEvents(client, "owner", "parent");
  assert.deepEqual(events.map((event) => event.id), ["b", "a"]);
});
