const { loadTypeScript } = require("./load-typescript.cjs");
const definitions = loadTypeScript("lib/ocr-tracking/definitions.ts");

function ocrRow(id, input = {}) {
  return { id, user_id: "owner", created_at: "2026-10-21T12:00:00Z", updated_at: "2026-10-21T12:00:00Z", ...input };
}

function ocrFixture() {
  const item = ocrRow("item-1", { ...definitions.newOcrItem(), source_key: "test:1", supplier: "Fornecedor", filename: "documento.pdf" });
  return { items: [item], checklist: definitions.newChecklist().map((entry, index) => ocrRow(`check-${index}`, { ...entry, item_id: item.id })),
    fields: definitions.requiredFields.map(([key, label], index) => ocrRow(`field-${index}`, { ...definitions.newOcrField(key, label, true), item_id: item.id })), issues: [] };
}

function completeOcrFixture() {
  const workspace = ocrFixture();
  workspace.checklist.forEach((entry) => Object.assign(entry, { status: "done", evidence: "Documento conferido", confirmed_by: "Pessoa", confirmed_on: "2026-10-21" }));
  workspace.fields.forEach((field) => Object.assign(field, { availability: "present", configuration: "configured", magnifier_status: "approved", triage_status: "approved", evidence: "Teste no Inbound" }));
  return workspace;
}

module.exports = { ocrRow, ocrFixture, completeOcrFixture, definitions };
