const assert = require("node:assert/strict");
const test = require("node:test");

const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const { normalizeRequestError } = loadTypeScript("lib/request-feedback.ts");

test("normalizes unknown request failures", () => {
  const requestError = { code: "42501", message: "Forbidden" };
  assert.equal(normalizeRequestError(requestError), requestError);
  assert.deepEqual(normalizeRequestError("offline"), { message: "offline" });
});
