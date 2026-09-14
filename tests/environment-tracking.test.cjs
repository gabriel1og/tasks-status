const assert = require("node:assert/strict");
const test = require("node:test");

const { loadTypeScript } = require("./helpers/load-typescript.cjs");

function createTask(overrides = {}) {
  return {
    id: "task-1",
    ambiente: "Desenvolvimento",
    ...overrides,
  };
}

function createTag(id, nome) {
  return { id, nome, tipo: "ambiente" };
}

test("resolves tracked columns using aliases with and without accents", () => {
  const { resolveTrackedEnvironmentColumns } = loadTypeScript(
    "lib/environment-tracking.ts",
  );
  const columns = resolveTrackedEnvironmentColumns([
    createTag("local", "Sem Ambiente"),
    createTag("dev", "Dev"),
    createTag("hom", "Homologação"),
    createTag("prod", "Producao"),
  ]);

  assert.deepEqual(
    columns.map((column) => column.tag?.id),
    ["local", "dev", "hom", "prod"],
  );
});

test("lists only missing tracked environment definitions", () => {
  const { getMissingTrackedEnvironmentDefinitions } = loadTypeScript(
    "lib/environment-tracking.ts",
  );
  const missing = getMissingTrackedEnvironmentDefinitions([
    createTag("dev", "Desenvolvimento"),
    createTag("prod", "Produção"),
  ]);

  assert.deepEqual(
    missing.map((definition) => definition.key),
    ["local", "homologation"],
  );
});

test("marks a task compatible when progression and current environment agree", () => {
  const {
    analyzeTaskEnvironmentConsistency,
    resolveTrackedEnvironmentColumns,
  } = loadTypeScript("lib/environment-tracking.ts");
  const columns = resolveTrackedEnvironmentColumns([
    createTag("local", "Sem Ambiente"),
    createTag("dev", "Desenvolvimento"),
    createTag("hom", "Homologacao"),
    createTag("prod", "Producao"),
  ]);
  const report = analyzeTaskEnvironmentConsistency(
    createTask({ ambiente: "Homologacao" }),
    columns,
    { "task-1": { dev: true, hom: true, prod: false } },
  );

  assert.equal(report.status, "compatible");
  assert.equal(report.availableEnvironmentCount, 2);
});

test("reports progression gaps and current environment divergence", () => {
  const {
    analyzeTaskEnvironmentConsistency,
    resolveTrackedEnvironmentColumns,
  } = loadTypeScript("lib/environment-tracking.ts");
  const columns = resolveTrackedEnvironmentColumns([
    createTag("local", "Sem Ambiente"),
    createTag("dev", "Desenvolvimento"),
    createTag("hom", "Homologacao"),
    createTag("prod", "Producao"),
  ]);
  const report = analyzeTaskEnvironmentConsistency(
    createTask({ ambiente: "Homologacao" }),
    columns,
    { "task-1": { dev: false, hom: false, prod: true } },
  );

  assert.equal(report.status, "incompatible");
  assert.match(report.reasons.join(" "), /Produção está disponível/);
  assert.match(report.reasons.join(" "), /ambiente atual/);
});

test("marks tasks without availability as untracked", () => {
  const {
    analyzeTaskEnvironmentConsistency,
    resolveTrackedEnvironmentColumns,
  } = loadTypeScript("lib/environment-tracking.ts");
  const columns = resolveTrackedEnvironmentColumns([
    createTag("dev", "Desenvolvimento"),
  ]);
  const report = analyzeTaskEnvironmentConsistency(
    createTask(),
    columns,
    {},
  );

  assert.equal(report.status, "untracked");
});

test("summarizes consistency and calculates organization percentage", () => {
  const { summarizeEnvironmentConsistency } = loadTypeScript(
    "lib/environment-tracking.ts",
  );
  const summary = summarizeEnvironmentConsistency([
    { status: "compatible" },
    { status: "compatible" },
    { status: "incompatible" },
    { status: "untracked" },
  ]);

  assert.deepEqual(summary, {
    total: 4,
    compatible: 2,
    incompatible: 1,
    untracked: 1,
    organizationPercentage: 50,
  });
});
