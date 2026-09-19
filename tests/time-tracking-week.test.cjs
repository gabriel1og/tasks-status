const assert = require("node:assert/strict");
const test = require("node:test");

const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const {
  getSaoPauloToday,
  getWeekRange,
  shiftWeekReference,
  summarizeWeek,
} = loadTypeScript("lib/time-tracking/week.ts");

test("finds the Monday to Sunday range across year boundaries", () => {
  assert.deepEqual(getWeekRange("2027-01-01"), {
    startDate: "2026-12-28",
    endDate: "2027-01-03",
  });
  assert.deepEqual(getWeekRange("2027-01-03"), {
    startDate: "2026-12-28",
    endDate: "2027-01-03",
  });
});

test("moves references by complete weeks", () => {
  assert.equal(shiftWeekReference("2026-09-19", -1), "2026-09-12");
  assert.equal(shiftWeekReference("2026-09-19", 1), "2026-09-26");
  assert.throws(() => shiftWeekReference("2026-09-19", 0.5), /inválido/);
});

test("uses Sao Paulo civil time", () => {
  assert.equal(
    getSaoPauloToday(new Date("2026-09-20T01:00:00.000Z")),
    "2026-09-19",
  );
});

test("summarizes entries for each day without stored totals", () => {
  const entries = [
    { entry_date: "2026-09-14", duration_minutes: 60 },
    { entry_date: "2026-09-14", duration_minutes: 30 },
    { entry_date: "2026-09-16", duration_minutes: 120 },
  ];
  const days = summarizeWeek(entries, "2026-09-14");
  assert.equal(days.length, 7);
  assert.deepEqual(
    days.map(({ date, entryCount, totalMinutes }) => ({
      date,
      entryCount,
      totalMinutes,
    })),
    [
      { date: "2026-09-14", entryCount: 2, totalMinutes: 90 },
      { date: "2026-09-15", entryCount: 0, totalMinutes: 0 },
      { date: "2026-09-16", entryCount: 1, totalMinutes: 120 },
      { date: "2026-09-17", entryCount: 0, totalMinutes: 0 },
      { date: "2026-09-18", entryCount: 0, totalMinutes: 0 },
      { date: "2026-09-19", entryCount: 0, totalMinutes: 0 },
      { date: "2026-09-20", entryCount: 0, totalMinutes: 0 },
    ],
  );
});

test("rejects invalid civil dates and non-Monday week starts", () => {
  assert.throws(() => getWeekRange("2026-02-30"), /Data civil inválida/);
  assert.throws(() => summarizeWeek([], "2026-09-15"), /Início de semana inválido/);
});
