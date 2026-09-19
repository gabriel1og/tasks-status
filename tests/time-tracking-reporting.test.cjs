const assert = require("node:assert/strict");
const test = require("node:test");

const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const {
  buildTimeTrackingReport,
  createDefaultTimeReportFilters,
  normalizeTimeReportFilters,
} = loadTypeScript("lib/time-tracking/reporting.ts");

function createEntry(id, date, minutes, task, categoryId) {
  return {
    id,
    user_id: "owner",
    entry_date: date,
    duration_minutes: minutes,
    task,
    category_id: categoryId,
    created_at: "2026-09-19T12:00:00.000Z",
    updated_at: "2026-09-19T12:00:00.000Z",
  };
}

const categories = [
  { id: "development", name: "Desenvolvimento", color: "#2563eb" },
  { id: "meeting", name: "Reunião", color: "#7c3aed" },
];

test("creates and validates the default report period", () => {
  assert.deepEqual(createDefaultTimeReportFilters("2026-09-19"), {
    categoryId: "",
    endDate: "2026-09-19",
    startDate: "2026-09-01",
    task: "",
  });
  assert.deepEqual(
    normalizeTimeReportFilters(
      {
        categoryId: "meeting",
        endDate: "2026-09-19",
        startDate: "2026-09-01",
        task: "  Status  ",
      },
      "2026-09-19",
    ),
    {
      categoryId: "meeting",
      endDate: "2026-09-19",
      startDate: "2026-09-01",
      task: "Status",
    },
  );
});

test("rejects invalid, inverted and future report dates", () => {
  const base = createDefaultTimeReportFilters("2026-09-19");
  assert.throws(
    () => normalizeTimeReportFilters({ ...base, startDate: "2026-02-30" }, "2026-09-19"),
    /inválida/,
  );
  assert.throws(
    () => normalizeTimeReportFilters({ ...base, startDate: "2026-09-20" }, "2026-09-19"),
    /posterior/,
  );
  assert.throws(
    () => normalizeTimeReportFilters({ ...base, endDate: "2026-09-20" }, "2026-09-19"),
    /futuro/,
  );
});

test("derives day, week, task, category and goal totals from entries", () => {
  const entries = [
    createEntry("1", "2026-09-14", 120, "Implementação", "development"),
    createEntry("2", "2026-09-14", 60, "Implementação", "meeting"),
    createEntry("3", "2026-09-16", 90, "Cerimônia", "meeting"),
  ];
  const report = buildTimeTrackingReport(entries, categories, 360, {
    categoryId: "",
    endDate: "2026-09-16",
    startDate: "2026-09-14",
    task: "",
  });
  assert.equal(report.actualMinutes, 270);
  assert.equal(report.goalMinutes, 1080);
  assert.equal(report.balanceMinutes, -810);
  assert.equal(report.daysWithEntries, 2);
  assert.equal(report.missingDays, 1);
  assert.deepEqual(
    report.dailyTotals.map(({ date, totalMinutes }) => ({ date, totalMinutes })),
    [
      { date: "2026-09-14", totalMinutes: 180 },
      { date: "2026-09-15", totalMinutes: 0 },
      { date: "2026-09-16", totalMinutes: 90 },
    ],
  );
  assert.deepEqual(
    report.taskTotals.map(({ label, totalMinutes }) => ({ label, totalMinutes })),
    [
      { label: "Implementação", totalMinutes: 180 },
      { label: "Cerimônia", totalMinutes: 90 },
    ],
  );
  assert.deepEqual(
    report.categoryTotals.map(({ label, totalMinutes }) => ({ label, totalMinutes })),
    [
      { label: "Reunião", totalMinutes: 150 },
      { label: "Desenvolvimento", totalMinutes: 120 },
    ],
  );
  assert.equal(report.weeklyTotals[0].totalMinutes, 270);
});

test("honors task and category filters and preserves removed categories", () => {
  const entries = [
    createEntry("1", "2026-09-14", 60, "Relatório mensal", "removed"),
    createEntry("2", "2026-09-15", 30, "Cerimônia", "meeting"),
  ];
  const removedCategoryReport = buildTimeTrackingReport(entries, categories, 360, {
    categoryId: "removed",
    endDate: "2026-09-15",
    startDate: "2026-09-14",
    task: "RELATÓRIO",
  });
  assert.equal(removedCategoryReport.actualMinutes, 60);
  assert.equal(removedCategoryReport.categoryTotals[0].label, "Categoria removida");
});
