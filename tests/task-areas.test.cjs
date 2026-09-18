const assert = require("node:assert/strict");
const test = require("node:test");
const { loadTypeScript } = require("./helpers/load-typescript.cjs");

test("sanitizes duplicated and unknown task areas", () => {
  const { sanitizeTaskAreas } = loadTypeScript("lib/task-areas.ts");

  assert.deepEqual(
    sanitizeTaskAreas(["backend", "frontend", "backend", "mobile"]),
    ["frontend", "backend"],
  );
  assert.deepEqual(sanitizeTaskAreas(null), []);
});

test("does not compare tasks that belong to only one area", () => {
  const { compareTaskAreas } = loadTypeScript("lib/task-areas.ts");

  assert.deepEqual(compareTaskAreas(["frontend"], "available"), {
    status: "not_applicable",
    label: "Comparação não aplicável",
  });
});

test("distinguishes unclassified tasks from single-area tasks", () => {
  const { compareTaskAreas } = loadTypeScript("lib/task-areas.ts");

  assert.deepEqual(compareTaskAreas([]), {
    status: "unclassified",
    label: "Áreas não definidas",
  });
});

test("distinguishes incomplete, aligned, blocked and leading areas", () => {
  const { compareTaskAreas } = loadTypeScript("lib/task-areas.ts");
  const areas = ["frontend", "backend"];

  assert.equal(compareTaskAreas(areas, "available").status, "incomplete");
  assert.equal(
    compareTaskAreas(areas, "in_progress", "in_progress").status,
    "aligned",
  );
  assert.equal(
    compareTaskAreas(areas, "blocked", "in_progress").status,
    "blocked",
  );
  assert.equal(
    compareTaskAreas(areas, "available", "in_progress").status,
    "frontend_ahead",
  );
  assert.equal(
    compareTaskAreas(areas, "not_started", "available").status,
    "backend_ahead",
  );
});
