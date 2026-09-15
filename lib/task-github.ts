import type { TaskGithubReference } from "@/types/database";

function isGithubReference(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Creates an editable blank reference, e.g. createEmptyTaskGithubReference(). */
export function createEmptyTaskGithubReference(): TaskGithubReference {
  return { branch: "", pr_url: "" };
}

/** Sanitizes persisted references, e.g. sanitizeTaskGithubReferences(task.github_references). */
export function sanitizeTaskGithubReferences(
  references: unknown,
): TaskGithubReference[] {
  if (!Array.isArray(references)) return [];
  return references.flatMap((reference) => {
    if (!isGithubReference(reference)) return [];
    const branch = typeof reference.branch === "string" ? reference.branch.trim() : "";
    const prUrl = typeof reference.pr_url === "string" ? reference.pr_url.trim() : "";
    return branch || prUrl ? [{ branch, pr_url: prUrl }] : [];
  });
}

/** Ensures one editable row, e.g. getEditableTaskGithubReferences([]). */
export function getEditableTaskGithubReferences(
  references: unknown,
): TaskGithubReference[] {
  const sanitizedReferences = sanitizeTaskGithubReferences(references);
  return sanitizedReferences.length
    ? sanitizedReferences
    : [createEmptyTaskGithubReference()];
}

/** Lists searchable branches and PRs, e.g. getTaskGithubReferenceValues(references). */
export function getTaskGithubReferenceValues(references: unknown): string[] {
  return sanitizeTaskGithubReferences(references).flatMap((reference) =>
    [reference.branch, reference.pr_url].filter(Boolean),
  );
}
