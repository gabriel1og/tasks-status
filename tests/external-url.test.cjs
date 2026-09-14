const assert = require("node:assert/strict");
const test = require("node:test");
const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const { getExternalHref } = loadTypeScript("lib/external-url.ts");

test("normalizes only non-empty external links", () => {
  assert.equal(getExternalHref(""), "");
  assert.equal(getExternalHref("   "), "");
  assert.equal(getExternalHref(null), "");
  assert.equal(getExternalHref("github.com/org/repo"), "https://github.com/org/repo");
  assert.equal(getExternalHref("https://github.com/org/repo"), "https://github.com/org/repo");
  assert.equal(getExternalHref("HTTP://example.com"), "HTTP://example.com");
});
