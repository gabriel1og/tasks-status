const assert = require("node:assert/strict");
const test = require("node:test");

const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const { formatDuration, formatSignedDuration, parseDurationToMinutes } = loadTypeScript(
  "lib/time-tracking/duration.ts",
);

for (const [input, expected] of [
  ["1h30", 90],
  ["1h 30min", 90],
  ["1:30", 90],
  ["90min", 90],
  ["90", 90],
  ["2h", 120],
]) {
  test(`parses duration ${input}`, () => {
    assert.equal(parseDurationToMinutes(input), expected);
  });
}

for (const input of ["", "0", "1:60", "1.5h", "abc", "-30min"]) {
  test(`rejects invalid duration ${input}`, () => {
    assert.throws(() => parseDurationToMinutes(input), /Duração inválida/);
  });
}

test("formats durations for the interface", () => {
  assert.equal(formatDuration(0), "0min");
  assert.equal(formatDuration(30), "30min");
  assert.equal(formatDuration(60), "1h");
  assert.equal(formatDuration(90), "1h 30min");
  assert.throws(() => formatDuration(-1), /Duração inválida/);
});

test("formats positive, negative and neutral balances", () => {
  assert.equal(formatSignedDuration(90), "+1h 30min");
  assert.equal(formatSignedDuration(-30), "−30min");
  assert.equal(formatSignedDuration(0), "0min");
  assert.throws(() => formatSignedDuration(1.5), /Saldo inválido/);
});
