const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const taskEnvironmentsPath = path.resolve(
  __dirname,
  "../lib/task-environments.ts",
);
const taskEnvironmentsCode = ts.transpileModule(
  readFileSync(taskEnvironmentsPath, "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

function loadTaskEnvironments() {
  const environmentsModule = new Module(taskEnvironmentsPath, module);
  environmentsModule.filename = taskEnvironmentsPath;
  environmentsModule._compile(taskEnvironmentsCode, taskEnvironmentsPath);
  return environmentsModule.exports;
}

test("builds availability lookup by task and environment", () => {
  const {
    buildTaskEnvironmentAvailability,
    getEnvironmentAvailability,
  } = loadTaskEnvironments();

  const availability = buildTaskEnvironmentAvailability([
    { task_id: "task-1", environment_tag_id: "dev", available: true },
    { task_id: "task-1", environment_tag_id: "hom", available: false },
    { task_id: "task-2", environment_tag_id: "prod", available: true },
  ]);

  assert.equal(getEnvironmentAvailability(availability, "task-1", "dev"), true);
  assert.equal(getEnvironmentAvailability(availability, "task-1", "hom"), false);
  assert.equal(getEnvironmentAvailability(availability, "task-2", "prod"), true);
  assert.equal(getEnvironmentAvailability(availability, "task-2", "dev"), false);
});

test("filters tasks by available environment", () => {
  const { taskMatchesAvailableEnvironment } = loadTaskEnvironments();
  const task = { id: "task-1" };
  const availability = {
    "task-1": { dev: true, hom: false },
  };

  assert.equal(taskMatchesAvailableEnvironment(task, availability, ""), true);
  assert.equal(taskMatchesAvailableEnvironment(task, availability, "dev"), true);
  assert.equal(taskMatchesAvailableEnvironment(task, availability, "hom"), false);
  assert.equal(taskMatchesAvailableEnvironment(task, availability, "prod"), false);
});
