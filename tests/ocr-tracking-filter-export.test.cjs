const assert = require("node:assert/strict");
const test = require("node:test");
const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const { ocrRow, ocrFixture } = require("./helpers/ocr-fixtures.cjs");
const { emptyOcrFilters, filterOcrItems, summarizeOcrItems, nextOcrAction } = loadTypeScript("lib/ocr-tracking/filtering.ts");
const { toOcrCsv, exportOcrItems, exportOcrIssues, exportOcrMarkdown } = loadTypeScript("lib/ocr-tracking/exports.ts");

test("search ignores accents and combines with pending issue kind and status", () => {
  const workspace = ocrFixture(), item = workspace.items[0];
  item.source_notes = "Emissão incompleta";
  workspace.issues = [ocrRow("issue", { item_id: item.id, kind: "missing_field", status: "pending", next_action: "Pedir documento" })];
  assert.equal(filterOcrItems(workspace, { ...emptyOcrFilters, query: "emissao", issueKind: "missing_field", issueStatus: "pending" }, "name").length, 1);
  assert.equal(filterOcrItems(workspace, { ...emptyOcrFilters, issueStatus: "resolved" }, "name").length, 0);
  assert.equal(summarizeOcrItems([item], workspace).open, 1);
  assert.equal(nextOcrAction(item, workspace), "Pedir documento");
});

test("archive filter, missing fields, assignee and active recut are independent", () => {
  const workspace = ocrFixture(), item = workspace.items[0];
  item.archived_at = "2026-10-21";
  assert.equal(filterOcrItems(workspace, emptyOcrFilters, "name").length, 0);
  assert.equal(filterOcrItems(workspace, { ...emptyOcrFilters, archive: "archived", assignee: "__none" }, "updated").length, 1);
  workspace.fields[0].availability = "absent";
  assert.equal(filterOcrItems(workspace, { ...emptyOcrFilters, archive: "all", required: "missing" }, "issues").length, 1);
});

test("pending view filters by the action assignee without confusing the document owner", () => {
  const workspace = ocrFixture(), item = workspace.items[0];
  item.assignee = "Responsável do documento";
  workspace.issues = [ocrRow("issue", { item_id: item.id, assignee: "Pessoa do time", status: "pending", kind: "review", description: "Conferir" })];
  const filters = { ...emptyOcrFilters, assignee: "Pessoa do time" };
  assert.equal(filterOcrItems(workspace, filters, "name", true).length, 1);
  assert.equal(filterOcrItems(workspace, filters, "name").length, 0);
});

test("CSV preserves multiline quoted data and neutralizes spreadsheet formulas", () => {
  const csv = toOcrCsv([["=SUM(1;1)", "@teste", "\tcomando", 'Observação; "nova"\nlinha', "CPF/CNPJ"]]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"\'=SUM(1;1)"'));
  assert.ok(csv.includes('"\'@teste"'));
  assert.ok(csv.includes('"\'\tcomando"'));
  assert.ok(csv.includes('"Observação; ""nova""\nlinha"'));
});

test("exports receive every filtered document rather than the current page", () => {
  const workspace = ocrFixture();
  workspace.items = Array.from({ length: 41 }, (_, index) => ({ ...workspace.items[0], id: `item-${index}`, filename: `arquivo-${index}.pdf` }));
  const csv = exportOcrItems(workspace.items, workspace), markdown = exportOcrMarkdown(workspace.items, workspace);
  assert.ok(csv.includes("arquivo-40.pdf"));
  assert.ok(markdown.includes("arquivo-40.pdf"));
  assert.ok(exportOcrIssues([], workspace).includes("Pendência"));
  assert.equal(csv.split("\r\n").length, 42);
});
