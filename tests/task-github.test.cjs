const assert = require("node:assert/strict");
const test = require("node:test");
const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const {
  createEmptyTaskGithubReference,
  getEditableTaskGithubReferences,
  getTaskGithubReferenceValues,
  sanitizeTaskGithubReferences,
} = loadTypeScript("lib/task-github.ts");

test("sanitizes valid GitHub references and removes empty or malformed items", () => {
  assert.deepEqual(
    sanitizeTaskGithubReferences([
      { branch: " feature/one ", pr_url: " https://github.com/org/repo/pull/1 " },
      { branch: "feature/two", pr_url: "" },
      { branch: "", pr_url: "https://github.com/org/repo/pull/2" },
      { branch: " ", pr_url: " " },
      null,
    ]),
    [
      { branch: "feature/one", pr_url: "https://github.com/org/repo/pull/1" },
      { branch: "feature/two", pr_url: "" },
      { branch: "", pr_url: "https://github.com/org/repo/pull/2" },
    ],
  );
  assert.deepEqual(sanitizeTaskGithubReferences("invalid"), []);
});

test("keeps one blank row available for editing", () => {
  assert.deepEqual(createEmptyTaskGithubReference(), { branch: "", pr_url: "" });
  assert.deepEqual(getEditableTaskGithubReferences([]), [{ branch: "", pr_url: "" }]);
});

test("lists branches and PR links as independent searchable values", () => {
  assert.deepEqual(
    getTaskGithubReferenceValues([
      { branch: "feature/one", pr_url: "https://github.com/org/repo/pull/1" },
      { branch: "feature/two", pr_url: "" },
    ]),
    ["feature/one", "https://github.com/org/repo/pull/1", "feature/two"],
  );
});
