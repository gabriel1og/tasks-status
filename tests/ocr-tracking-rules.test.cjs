const assert = require("node:assert/strict");
const test = require("node:test");
const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const { ocrRow, ocrFixture, completeOcrFixture, definitions } = require("./helpers/ocr-fixtures.cjs");
const { analyzeOcrItem, stageProgress, hasOcrWaiver, isOpenIssue, validateOcrField, validateOcrIssue } = loadTypeScript("lib/ocr-tracking/rules.ts");

test("new documents preserve unknown information and six mandatory fields", () => {
  const workspace = ocrFixture(), report = analyzeOcrItem(workspace.items[0], workspace);
  assert.equal(workspace.fields.length, 6);
  assert.equal(report.status, "unknown");
  assert.equal(report.requiredLabel, "Sem validação informada");
  assert.equal(report.unvalidated, 6);
  assert.equal(stageProgress([], 1), "unknown");
});

test("all stages, mandatory fields and conditional decisions are required for completion", () => {
  const workspace = completeOcrFixture(), item = workspace.items[0];
  assert.equal(analyzeOcrItem(item, workspace).status, "done");
  workspace.fields.push(ocrRow("extra", { ...definitions.newOcrField("tax", "Imposto"), item_id: item.id }));
  assert.notEqual(analyzeOcrItem(item, workspace).status, "done");
  Object.assign(workspace.fields.at(-1), { applicability: "no", notes: "Sem imposto nesta amostra" });
  assert.equal(analyzeOcrItem(item, workspace).status, "done");
});

test("missing mandatory row, unvalidated field and unresolved issue prevent completion", () => {
  const workspace = completeOcrFixture(), item = workspace.items[0];
  workspace.fields.pop();
  assert.notEqual(analyzeOcrItem(item, workspace).status, "done");
  workspace.issues.push(ocrRow("issue", { item_id: item.id, status: "blocked" }));
  assert.equal(analyzeOcrItem(item, workspace).status, "blocked");
  assert.equal(isOpenIssue(workspace.issues[0]), true);
  assert.equal(isOpenIssue({ status: "waived" }), false);
});

test("waivers are distinct from approvals and require reason, author and date", () => {
  const workspace = completeOcrFixture(), field = workspace.fields[0];
  Object.assign(field, { triage_status: "unknown", waiver_reason: "Exceção aprovada", waiver_by: "Responsável", waiver_on: "2026-10-21" });
  assert.equal(hasOcrWaiver(field), true);
  const report = analyzeOcrItem(workspace.items[0], workspace);
  assert.equal(report.status, "done");
  assert.equal(report.approved, 5);
  assert.equal(report.waived, 1);
  field.waiver_on = null;
  assert.throws(() => validateOcrField(field), /Dispensa incompleta/);
});

test("changing a regex invalidates both tests and clears obtained values", () => {
  const original = completeOcrFixture().fields[0];
  const updated = validateOcrField({ ...original, regex: "(45\\d{8})", magnifier_value: "old", triage_value: "old" }, original);
  assert.equal(updated.magnifier_status, "pending");
  assert.equal(updated.triage_status, "pending");
  assert.equal(updated.magnifier_value, "");
  assert.equal(updated.triage_value, "");
});

test("conditional checklist needs justification and mandatory fields cannot become optional", () => {
  const workspace = completeOcrFixture();
  const last = workspace.checklist.at(-1);
  Object.assign(last, { status: "not_applicable", evidence: "Não houve correção" });
  assert.equal(stageProgress(workspace.checklist, 4), "done");
  last.evidence = "";
  assert.notEqual(stageProgress(workspace.checklist, 4), "done");
  assert.throws(() => validateOcrField({ ...workspace.fields[0], applicability: "no" }), /obrigatório/);
  assert.throws(() => validateOcrField({ ...workspace.fields[0], evidence: "" }), /evidência/);
});

test("resolutions and waivers cannot be saved without their supporting data", () => {
  const issue = { description: "Pedido ausente", status: "resolved", resolution: "", authorized_by: "", authorized_on: null };
  assert.throws(() => validateOcrIssue(issue), /Resolução vazia/);
  Object.assign(issue, { status: "waived", resolution: "Dispensado pelo time" });
  assert.throws(() => validateOcrIssue(issue), /Dispensa incompleta/);
  Object.assign(issue, { authorized_by: "Pessoa", authorized_on: "2026-10-21" });
  assert.doesNotThrow(() => validateOcrIssue(issue));
});
