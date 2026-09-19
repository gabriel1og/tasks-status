import { isWorkingWeekday } from "@/lib/time-tracking/non-working-days";
import type {
  TimeCategoryInput,
  TimeCategoryRow,
  TimeEntryInput,
  TimeTrackingSettingsInput,
} from "@/types/time-tracking";

const categoryNameMaxLength = 80;
const taskMaxLength = 200;
const hexColorPattern = /^#[0-9a-f]{6}$/i;
const civilDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Valida e normaliza a meta diária. Ex.: buildTimeTrackingSettingsChanges({ daily_goal_minutes: 360 }). */
export function buildTimeTrackingSettingsChanges(
  input: TimeTrackingSettingsInput,
): TimeTrackingSettingsInput {
  if (!Number.isInteger(input.daily_goal_minutes)) {
    throw new Error(
      `Meta diária inválida: ${input.daily_goal_minutes}. Informe minutos inteiros positivos.`,
    );
  }
  if (input.daily_goal_minutes <= 0) {
    throw new Error(
      `Meta diária inválida: ${input.daily_goal_minutes}. Informe minutos inteiros positivos.`,
    );
  }
  return { daily_goal_minutes: input.daily_goal_minutes };
}

/** Valida e normaliza uma categoria. Ex.: buildTimeCategoryChanges({ name: "Reunião", color: "#2563eb" }). */
export function buildTimeCategoryChanges(
  input: TimeCategoryInput,
): TimeCategoryInput {
  const name = input.name.trim();
  if (!name || name.length > categoryNameMaxLength) {
    throw new Error(
      `Nome de categoria inválido: "${input.name}". Informe entre 1 e ${categoryNameMaxLength} caracteres.`,
    );
  }
  if (!hexColorPattern.test(input.color)) {
    throw new Error(
      `Cor de categoria inválida: "${input.color}". Use o formato hexadecimal #RRGGBB.`,
    );
  }
  return { name, color: input.color.toLowerCase() };
}

/** Verifica duplicidade de nome sem diferenciar maiúsculas, minúsculas ou acentos. */
export function hasDuplicateTimeCategoryName(
  categories: Array<Pick<TimeCategoryRow, "id" | "name">>,
  categoryName: string,
  ignoredCategoryId?: string,
): boolean {
  return categories.some(
    (category) =>
      category.id !== ignoredCategoryId &&
      category.name.localeCompare(categoryName, "pt-BR", {
        sensitivity: "base",
      }) === 0,
  );
}

/** Valida e normaliza um apontamento. Ex.: buildTimeEntryChanges(input, "2026-09-19"). */
export function buildTimeEntryChanges(
  input: TimeEntryInput,
  todayCivilDate = getSaoPauloCivilDate(new Date()),
): TimeEntryInput {
  assertValidCivilDate(input.entry_date, "Data do apontamento");
  assertValidCivilDate(todayCivilDate, "Data de referência");
  assertNotFutureDate(input.entry_date, todayCivilDate);
  assertWorkingWeekday(input.entry_date);
  assertPositiveDuration(input.duration_minutes);
  return {
    ...input,
    task: normalizeTask(input.task),
    category_id: normalizeCategoryId(input.category_id),
  };
}

function assertWorkingWeekday(entryDate: string): void {
  if (isWorkingWeekday(entryDate)) return;
  throw new Error(
    `Data do apontamento inválida: ${entryDate}. Finais de semana não aceitam apontamentos.`,
  );
}

function assertNotFutureDate(entryDate: string, todayCivilDate: string): void {
  if (entryDate <= todayCivilDate) return;
  throw new Error(
    `Data do apontamento inválida: ${entryDate}. A data não pode estar no futuro.`,
  );
}

function assertPositiveDuration(durationMinutes: number): void {
  if (Number.isInteger(durationMinutes) && durationMinutes > 0) return;
  throw new Error(
    `Duração inválida: ${durationMinutes}. Informe minutos inteiros positivos.`,
  );
}

function normalizeTask(taskInput: string): string {
  const task = taskInput.trim();
  if (task && task.length <= taskMaxLength) return task;
  throw new Error(
    `Tarefa inválida: "${taskInput}". Informe entre 1 e ${taskMaxLength} caracteres.`,
  );
}

function normalizeCategoryId(categoryIdInput: string): string {
  const categoryId = categoryIdInput.trim();
  if (categoryId) return categoryId;
  throw new Error(
    `Categoria inválida: "${categoryIdInput}". Informe um identificador de categoria.`,
  );
}

function assertValidCivilDate(value: string, fieldLabel: string): void {
  const match = civilDatePattern.exec(value);
  if (!match || !isExistingDate(match)) {
    throw new Error(
      `${fieldLabel} inválida: "${value}". Use uma data civil existente no formato YYYY-MM-DD.`,
    );
  }
}

function isExistingDate(match: RegExpExecArray): boolean {
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const normalized = new Date(Date.UTC(year, month - 1, day));
  return (
    normalized.getUTCFullYear() === year &&
    normalized.getUTCMonth() === month - 1 &&
    normalized.getUTCDate() === day
  );
}

function getSaoPauloCivilDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
