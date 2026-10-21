const assert = require("node:assert/strict");
const test = require("node:test");
const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const { buildInitialOcrSeeds } = loadTypeScript("lib/ocr-tracking/initial-source.ts");

test("reviewed source contains 41 distinct documents and exactly 28 original notes", () => {
  const seeds = buildInitialOcrSeeds();
  assert.equal(seeds.length, 41);
  assert.equal(new Set(seeds.map((seed) => seed.item.source_key)).size, 41);
  assert.equal(seeds.filter((seed) => seed.item.source_notes.trim()).length, 28);
  assert.equal(seeds.filter((seed) => seed.item.source_match.startsWith("Associação revisada")).length, 39);
  assert.ok(seeds.every((seed) => seed.item.source_record.Status !== undefined));
});

test("duplicate external ID does not merge LinkedIn with Club Coworking", () => {
  const duplicates = buildInitialOcrSeeds().filter((seed) => seed.item.layout_id === "ceb3cb4d-3ded-4442-9cea-4abb40176586");
  assert.equal(duplicates.length, 2);
  assert.notEqual(duplicates[0].item.source_key, duplicates[1].item.source_key);
  assert.ok(duplicates.every((seed) => seed.issues.some((issue) => issue.description.includes("compartilham"))));
});

test("source records preserve accents, semicolons, regex alternation and unconfirmed tests", () => {
  const seeds = buildInitialOcrSeeds(), bridge = seeds.find((seed) => seed.item.filename.includes("THE BRIDGE"));
  assert.ok(bridge.item.source_notes.includes("1000112; CNPJ"));
  assert.equal(bridge.fields.find((field) => field.key === "partner_code").expected_value, "1000112");
  assert.ok(seeds.flatMap((seed) => seed.fields).every((field) => field.triage_status === "unknown" && field.magnifier_status === "unknown"));
  assert.ok(seeds.flatMap((seed) => seed.fields).some((field) => field.regex.includes("|")));
  assert.ok(seeds.flatMap((seed) => seed.fields).every((field) => !field.regex.includes("\\|")));
  assert.ok(seeds.every((seed) => seed.fields.filter((field) => field.required).length === 6));
});

test("BTG topics remain distinct and R10 incomplete date is not treated as absent", () => {
  const seeds = buildInitialOcrSeeds(), btg = seeds.find((seed) => seed.item.supplier === "BTG PACTUAL"), r10 = seeds.find((seed) => seed.item.filename.includes("17641"));
  assert.ok(btg.issues.some((issue) => issue.kind === "category"));
  assert.ok(btg.issues.filter((issue) => issue.kind === "missing_field").length >= 2);
  assert.equal(r10.fields.find((field) => field.key === "issue_date").availability, "incomplete");
  assert.ok(r10.issues.some((issue) => issue.kind === "tax_values"));
  const sourceWithLine = seeds.find((seed) => seed.item.supplier.includes("CORREIOS"));
  assert.equal(sourceWithLine.fields.find((field) => field.label.toLowerCase().includes("digitável")).availability, "present");
});
