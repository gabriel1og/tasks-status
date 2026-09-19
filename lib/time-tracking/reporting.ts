import { shiftDays } from "@/lib/calendar";
import { getWeekRange } from "@/lib/time-tracking/week";
import type { TimeCategoryRow, TimeEntryRow } from "@/types/time-tracking";

export type TimeReportFilters = {
  categoryId: string;
  endDate: string;
  startDate: string;
  task: string;
};

export type TimeReportTotal = {
  color?: string;
  entryCount: number;
  key: string;
  label: string;
  totalMinutes: number;
};

export type TimeReportDailyTotal = TimeReportTotal & { date: string };
export type TimeReportWeeklyTotal = TimeReportTotal & {
  endDate: string;
  startDate: string;
};

export type TimeTrackingReport = {
  actualMinutes: number;
  balanceMinutes: number;
  categoryTotals: TimeReportTotal[];
  dailyTotals: TimeReportDailyTotal[];
  daysWithEntries: number;
  goalMinutes: number;
  missingDays: number;
  taskTotals: TimeReportTotal[];
  weeklyTotals: TimeReportWeeklyTotal[];
};

/** Cria o período inicial do relatório, do primeiro dia do mês até hoje. */
export function createDefaultTimeReportFilters(today: string): TimeReportFilters {
  assertCivilDate(today, "data atual");
  return {
    categoryId: "",
    endDate: today,
    startDate: `${today.slice(0, 7)}-01`,
    task: "",
  };
}

/** Valida e normaliza filtros antes de consultar o histórico. */
export function normalizeTimeReportFilters(
  filters: TimeReportFilters,
  today: string,
): TimeReportFilters {
  assertCivilDate(filters.startDate, "data inicial");
  assertCivilDate(filters.endDate, "data final");
  assertCivilDate(today, "data atual");
  if (filters.startDate > filters.endDate) {
    throw new Error("A data inicial não pode ser posterior à data final.");
  }
  if (filters.endDate > today) {
    throw new Error("A data final não pode estar no futuro.");
  }
  return { ...filters, task: filters.task.trim() };
}

/** Calcula todos os indicadores a partir dos apontamentos do período. */
export function buildTimeTrackingReport(
  entries: TimeEntryRow[],
  categories: TimeCategoryRow[],
  dailyGoalMinutes: number,
  filters: TimeReportFilters,
): TimeTrackingReport {
  const dates = listCivilDates(filters.startDate, filters.endDate);
  const selectedEntries = filterReportEntries(entries, filters);
  const actualMinutes = sumEntryMinutes(selectedEntries);
  const goalMinutes = dates.length * dailyGoalMinutes;
  const dailyTotals = buildDailyTotals(selectedEntries, dates);
  return {
    actualMinutes,
    balanceMinutes: actualMinutes - goalMinutes,
    categoryTotals: buildCategoryTotals(selectedEntries, categories),
    dailyTotals,
    daysWithEntries: dailyTotals.filter((day) => day.entryCount > 0).length,
    goalMinutes,
    missingDays: dailyTotals.filter((day) => day.entryCount === 0).length,
    taskTotals: buildTaskTotals(selectedEntries),
    weeklyTotals: buildWeeklyTotals(selectedEntries, dates),
  };
}

function filterReportEntries(
  entries: TimeEntryRow[],
  filters: TimeReportFilters,
): TimeEntryRow[] {
  const task = filters.task.trim().toLocaleLowerCase("pt-BR");
  return entries.filter((entry) => {
    const isInPeriod =
      entry.entry_date >= filters.startDate && entry.entry_date <= filters.endDate;
    const matchesCategory =
      !filters.categoryId || entry.category_id === filters.categoryId;
    const matchesTask =
      !task || entry.task.toLocaleLowerCase("pt-BR").includes(task);
    return isInPeriod && matchesCategory && matchesTask;
  });
}

function buildDailyTotals(
  entries: TimeEntryRow[],
  dates: string[],
): TimeReportDailyTotal[] {
  return dates.map((date) => {
    const dayEntries = entries.filter((entry) => entry.entry_date === date);
    return {
      date,
      entryCount: dayEntries.length,
      key: date,
      label: date,
      totalMinutes: sumEntryMinutes(dayEntries),
    };
  });
}

function buildWeeklyTotals(
  entries: TimeEntryRow[],
  dates: string[],
): TimeReportWeeklyTotal[] {
  const weekStarts = [...new Set(dates.map((date) => getWeekRange(date).startDate))];
  return weekStarts.map((startDate) => {
    const { endDate } = getWeekRange(startDate);
    const weekEntries = entries.filter(
      (entry) => entry.entry_date >= startDate && entry.entry_date <= endDate,
    );
    return {
      endDate,
      entryCount: weekEntries.length,
      key: startDate,
      label: startDate,
      startDate,
      totalMinutes: sumEntryMinutes(weekEntries),
    };
  });
}

function buildTaskTotals(entries: TimeEntryRow[]): TimeReportTotal[] {
  return buildGroupedTotals(entries, (entry) => ({
    key: entry.task,
    label: entry.task,
  }));
}

function buildCategoryTotals(
  entries: TimeEntryRow[],
  categories: TimeCategoryRow[],
): TimeReportTotal[] {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  return buildGroupedTotals(entries, (entry) => {
    const category = categoriesById.get(entry.category_id);
    return {
      color: category?.color ?? "#64748b",
      key: entry.category_id,
      label: category?.name ?? "Categoria removida",
    };
  });
}

function buildGroupedTotals(
  entries: TimeEntryRow[],
  identify: (entry: TimeEntryRow) => Pick<TimeReportTotal, "color" | "key" | "label">,
): TimeReportTotal[] {
  const totals = new Map<string, TimeReportTotal>();
  for (const entry of entries) {
    const identity = identify(entry);
    const current = totals.get(identity.key) ?? {
      ...identity,
      entryCount: 0,
      totalMinutes: 0,
    };
    current.entryCount += 1;
    current.totalMinutes += entry.duration_minutes;
    totals.set(identity.key, current);
  }
  return [...totals.values()].sort(
    (left, right) =>
      right.totalMinutes - left.totalMinutes || left.label.localeCompare(right.label),
  );
}

function listCivilDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  for (let date = startDate; date <= endDate; date = shiftDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

function sumEntryMinutes(entries: TimeEntryRow[]): number {
  return entries.reduce((total, entry) => total + entry.duration_minutes, 0);
}

function assertCivilDate(value: string, label: string): void {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) && shiftDays(value, 0) === value;
  if (!normalized) {
    throw new Error(`A ${label} "${value}" é inválida. Use uma data existente.`);
  }
}
