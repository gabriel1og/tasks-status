const assert = require("node:assert/strict");
const test = require("node:test");

const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const {
  DEFAULT_DAILY_GOAL_MINUTES,
  parseDailyGoalMinutes,
  splitDailyGoalMinutes,
} = loadTypeScript("lib/time-tracking/daily-goal.ts");

test("converts the editable daily goal without losing minutes", () => {
  assert.equal(DEFAULT_DAILY_GOAL_MINUTES, 360);
  assert.equal(parseDailyGoalMinutes("6", "0"), 360);
  assert.equal(parseDailyGoalMinutes("6", "30"), 390);
  assert.deepEqual(splitDailyGoalMinutes(390), { hours: 6, minutes: 30 });
});

for (const [hours, minutes] of [
  ["0", "0"],
  ["-1", "0"],
  ["6.5", "0"],
  ["6", "60"],
  ["seis", "0"],
  ["", "30"],
]) {
  test(`rejects invalid daily goal parts ${hours}:${minutes}`, () => {
    assert.throws(
      () => parseDailyGoalMinutes(hours, minutes),
      /Meta diária inválida/,
    );
  });
}
