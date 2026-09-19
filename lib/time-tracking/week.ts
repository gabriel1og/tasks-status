import { shiftDays, toISO } from "@/lib/calendar";
import type { TimeEntryRow } from "@/types/time-tracking";

export type WeekRange = {
  endDate: string;
  startDate: string;
};

export type WeeklyDaySummary = {
  date: string;
  entryCount: number;
  label: string;
  shortLabel: string;
  totalMinutes: number;
};

const weekDayLabels = [
  { label: "Segunda-feira", shortLabel: "Seg" },
  { label: "Terça-feira", shortLabel: "Ter" },
  { label: "Quarta-feira", shortLabel: "Qua" },
  { label: "Quinta-feira", shortLabel: "Qui" },
  { label: "Sexta-feira", shortLabel: "Sex" },
] as const;

/** Obtém o dia civil em São Paulo sem converter a escolha do usuário por UTC. */
export function getSaoPauloToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** Retorna segunda e domingo da semana que contém a data civil informada. */
export function getWeekRange(referenceDate: string): WeekRange {
  const reference = parseCivilDate(referenceDate);
  const weekDay = reference.getUTCDay();
  const daysSinceMonday = weekDay === 0 ? 6 : weekDay - 1;
  const startDate = shiftDays(referenceDate, -daysSinceMonday);
  return { startDate, endDate: shiftDays(startDate, 6) };
}

/** Move uma data de referência por semanas inteiras. Ex.: `shiftWeekReference(date, -1)`. */
export function shiftWeekReference(referenceDate: string, weeks: number): string {
  if (!Number.isInteger(weeks)) {
    throw new Error(`Deslocamento semanal inválido: ${weeks}. Informe um número inteiro.`);
  }
  parseCivilDate(referenceDate);
  return shiftDays(referenceDate, weeks * 7);
}

/** Resume os cinco dias úteis de uma semana a partir dos apontamentos carregados. */
export function summarizeWeek(
  entries: TimeEntryRow[],
  weekStartDate: string,
): WeeklyDaySummary[] {
  const range = getWeekRange(weekStartDate);
  if (range.startDate !== weekStartDate) {
    throw new Error(
      `Início de semana inválido: ${weekStartDate}. Informe uma segunda-feira.`,
    );
  }

  return weekDayLabels.map((weekDay, index) => {
    const date = shiftDays(weekStartDate, index);
    const dayEntries = entries.filter((entry) => entry.entry_date === date);
    return {
      ...weekDay,
      date,
      entryCount: dayEntries.length,
      totalMinutes: dayEntries.reduce(
        (total, entry) => total + entry.duration_minutes,
        0,
      ),
    };
  });
}

function parseCivilDate(civilDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(civilDate);
  if (!match) throwInvalidCivilDate(civilDate);

  const parsed = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  if (toISO(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate()) !== civilDate) {
    throwInvalidCivilDate(civilDate);
  }
  return parsed;
}

function throwInvalidCivilDate(civilDate: string): never {
  throw new Error(
    `Data civil inválida: "${civilDate}". Use uma data existente no formato YYYY-MM-DD.`,
  );
}
