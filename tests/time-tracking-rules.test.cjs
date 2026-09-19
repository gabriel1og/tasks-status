const assert = require("node:assert/strict");
const test = require("node:test");

const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const {
  buildTimeCategoryChanges,
  buildTimeEntryChanges,
  buildTimeTrackingSettingsChanges,
} = loadTypeScript("lib/time-tracking/time-tracking-rules.ts");
const { buildDefaultTimeCategories } = loadTypeScript(
  "lib/time-tracking/default-time-categories.ts",
);

test("normalizes valid settings, categories and entries", () => {
  assert.deepEqual(buildTimeTrackingSettingsChanges({ daily_goal_minutes: 360 }), {
    daily_goal_minutes: 360,
  });
  assert.deepEqual(
    buildTimeCategoryChanges({ name: "  Reunião  ", color: "#AABBCC" }),
    { name: "Reunião", color: "#aabbcc" },
  );
  assert.deepEqual(
    buildTimeEntryChanges(
      {
        entry_date: "2026-09-19",
        duration_minutes: 90,
        task: "  Planejamento  ",
        category_id: "  category-1  ",
      },
      "2026-09-19",
    ),
    {
      entry_date: "2026-09-19",
      duration_minutes: 90,
      task: "Planejamento",
      category_id: "category-1",
    },
  );
});

for (const dailyGoal of [0, -1, 30.5, Number.NaN]) {
  test(`rejects invalid daily goal ${dailyGoal}`, () => {
    assert.throws(
      () => buildTimeTrackingSettingsChanges({ daily_goal_minutes: dailyGoal }),
      /Meta diária inválida/,
    );
  });
}

for (const category of [
  { name: "   ", color: "#2563eb" },
  { name: "x".repeat(81), color: "#2563eb" },
  { name: "Reunião", color: "azul" },
]) {
  test(`rejects invalid category ${JSON.stringify(category)}`, () => {
    assert.throws(() => buildTimeCategoryChanges(category), /inválid/);
  });
}

for (const [label, changes] of [
  ["future date", { entry_date: "2026-09-20" }],
  ["impossible date", { entry_date: "2026-02-30" }],
  ["duration", { duration_minutes: 0 }],
  ["fractional duration", { duration_minutes: 30.5 }],
  ["empty task", { task: "   " }],
  ["long task", { task: "x".repeat(201) }],
  ["empty category", { category_id: "   " }],
]) {
  test(`rejects entry with invalid ${label}`, () => {
    const input = {
      entry_date: "2026-09-19",
      duration_minutes: 60,
      task: "Implementação",
      category_id: "category-1",
      ...changes,
    };
    assert.throws(() => buildTimeEntryChanges(input, "2026-09-19"), /inválid/);
  });
}

test("builds stable default categories for the account without duplicate names", () => {
  const first = buildDefaultTimeCategories("owner-1");
  const second = buildDefaultTimeCategories("owner-1");
  assert.deepEqual(first, second);
  assert.equal(new Set(first.map((category) => category.name)).size, first.length);
  assert.ok(first.every((category) => category.user_id === "owner-1"));
});

test("rejects default categories without an owner", () => {
  assert.throws(() => buildDefaultTimeCategories("  "), /Usuário inválido/);
});
