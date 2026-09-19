const assert = require("node:assert/strict");
const test = require("node:test");

const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const {
  buildNonWorkingDayInputs,
  isNonWorkingDate,
  isWorkingWeekday,
} = loadTypeScript("lib/time-tracking/non-working-days.ts");

test("identifies weekdays without treating weekends as working days", () => {
  assert.equal(isWorkingWeekday("2026-09-18"), true);
  assert.equal(isWorkingWeekday("2026-09-19"), false);
  assert.equal(isWorkingWeekday("2026-09-20"), false);
});

test("expands a vacation range using weekdays only", () => {
  const days = buildNonWorkingDayInputs({
    startDate: "2026-09-17",
    endDate: "2026-09-21",
    reason: "vacation",
    note: "  Recesso  ",
  });
  assert.deepEqual(days, [
    { non_working_date: "2026-09-17", reason: "vacation", note: "Recesso" },
    { non_working_date: "2026-09-18", reason: "vacation", note: "Recesso" },
    { non_working_date: "2026-09-21", reason: "vacation", note: "Recesso" },
  ]);
});

test("rejects invalid ranges and detects stored exclusions", () => {
  assert.throws(
    () => buildNonWorkingDayInputs({
      startDate: "2026-09-19",
      endDate: "2026-09-20",
      reason: "holiday",
      note: "",
    }),
    /pelo menos um dia útil/,
  );
  assert.equal(
    isNonWorkingDate("2026-09-18", [{ non_working_date: "2026-09-18" }]),
    true,
  );
});
