import type { TaskStatusRow } from "@/types/database";
import type {
  QueryCondition,
  QueryDefinition,
  QueryOperator,
} from "@/types/queries";
import { validateQueryDefinition } from "@/lib/task-query-validation";
import { getTaskGithubReferenceValues } from "@/lib/task-github";

export {
  QUERY_FIELDS,
  QUERY_OPERATOR_LABELS,
  getQueryOperators,
  createQueryCondition,
} from "@/lib/task-query-fields";
export { validateQueryDefinition } from "@/lib/task-query-validation";

function normalizeQueryText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

/** Returns the task's local calendar day, e.g. getTaskCalendarDate(task.created_at). */
export function getTaskCalendarDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return null;
  const year = String(timestamp.getFullYear()).padStart(4, "0");
  const month = String(timestamp.getMonth() + 1).padStart(2, "0");
  const day = String(timestamp.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function matchesQueryDate(value: unknown, condition: QueryCondition): boolean {
  const actualDate = getTaskCalendarDate(value);
  if (!actualDate)
    return condition.operator === "neq" && !normalizeQueryText(value);
  if (condition.operator === "eq") return actualDate === condition.value;
  if (condition.operator === "neq") return actualDate !== condition.value;
  if (condition.operator === "before") return actualDate < condition.value;
  if (condition.operator === "after") return actualDate > condition.value;
  if (condition.operator === "on_or_before")
    return actualDate <= condition.value;
  return condition.operator === "on_or_after" && actualDate >= condition.value;
}

function matchesQueryText(
  actual: string,
  expected: string,
  operator: QueryOperator,
): boolean {
  if (operator === "eq") return actual === expected;
  if (operator === "neq") return actual !== expected;
  if (operator === "contains") return actual.includes(expected);
  if (operator === "not_contains") return !actual.includes(expected);
  return operator === "starts_with" && actual.startsWith(expected);
}

function matchesGithubReferences(
  references: unknown,
  condition: QueryCondition,
): boolean {
  const values = getTaskGithubReferenceValues(references).map(normalizeQueryText);
  if (condition.operator === "is_empty") return values.length === 0;
  if (condition.operator === "is_not_empty") return values.length > 0;
  const expected = normalizeQueryText(condition.value);
  if (["neq", "not_contains"].includes(condition.operator)) {
    return values.every((value) =>
      matchesQueryText(value, expected, condition.operator),
    );
  }
  return values.some((value) =>
    matchesQueryText(value, expected, condition.operator),
  );
}

function matchesTextList(
  value: unknown,
  condition: QueryCondition,
): boolean {
  const values = Array.isArray(value) ? value.map(normalizeQueryText) : [];
  if (condition.operator === "is_empty") return values.length === 0;
  if (condition.operator === "is_not_empty") return values.length > 0;
  const expected = normalizeQueryText(condition.value);
  if (["neq", "not_contains"].includes(condition.operator)) {
    return values.every((item) =>
      matchesQueryText(item, expected, condition.operator),
    );
  }
  return values.some((item) =>
    matchesQueryText(item, expected, condition.operator),
  );
}

function matchesQueryCondition(
  task: TaskStatusRow,
  condition: QueryCondition,
): boolean {
  const actualValue = task[condition.field];
  if (condition.field === "github_references") {
    return matchesGithubReferences(actualValue, condition);
  }
  if (condition.field === "areas") {
    return matchesTextList(actualValue, condition);
  }
  const normalizedValue = normalizeQueryText(actualValue);
  if (condition.operator === "is_empty") return normalizedValue.length === 0;
  if (condition.operator === "is_not_empty") return normalizedValue.length > 0;
  if (condition.field === "created_at")
    return matchesQueryDate(actualValue, condition);
  if (condition.field === "is_future") {
    if (typeof actualValue !== "boolean") return false;
    return condition.operator === "eq"
      ? actualValue === (condition.value === "true")
      : actualValue !== (condition.value === "true");
  }
  return matchesQueryText(
    normalizedValue,
    normalizeQueryText(condition.value),
    condition.operator,
  );
}

/** Evaluates saved filters against current tasks, e.g. filterQueryTasks(tasks, query.definition). */
export function filterQueryTasks(
  tasks: TaskStatusRow[],
  definition: QueryDefinition,
): TaskStatusRow[] {
  // A corrupt saved definition must never accidentally broaden access to every task.
  if (validateQueryDefinition(definition)) return [];
  if (!definition.conditions.length) return [...tasks];
  return tasks.filter((task) =>
    definition.match === "all"
      ? definition.conditions.every((condition) =>
          matchesQueryCondition(task, condition),
        )
      : definition.conditions.some((condition) =>
          matchesQueryCondition(task, condition),
        ),
  );
}
