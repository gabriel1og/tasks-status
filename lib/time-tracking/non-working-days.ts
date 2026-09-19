import { shiftDays } from "@/lib/calendar";
import type {
  TimeNonWorkingDayInput,
  TimeNonWorkingDayReason,
  TimeNonWorkingDayRow,
} from "@/types/time-tracking";

const maximumRangeDays = 366;

export const nonWorkingDayReasonLabels: Record<
  TimeNonWorkingDayReason,
  string
> = {
  holiday: "Feriado",
  vacation: "Férias",
  other: "Outro",
};

/** Informa se a data é de segunda a sexta. Ex.: `isWorkingWeekday("2026-09-18")`. */
export function isWorkingWeekday(civilDate: string): boolean {
  const weekDay = parseCivilDate(civilDate).getUTCDay();
  return weekDay >= 1 && weekDay <= 5;
}

/** Expande um período em dias úteis sem apontamento. Ex.: férias de segunda a sexta. */
export function buildNonWorkingDayInputs({
  endDate,
  note,
  reason,
  startDate,
}: {
  endDate: string;
  note: string;
  reason: TimeNonWorkingDayReason;
  startDate: string;
}): TimeNonWorkingDayInput[] {
  parseCivilDate(startDate);
  parseCivilDate(endDate);
  if (startDate > endDate) {
    throw new Error("A data inicial não pode ser posterior à data final.");
  }
  if (!(reason in nonWorkingDayReasonLabels)) {
    throw new Error(`Motivo inválido: "${reason}".`);
  }

  const normalizedNote = normalizeNote(note);
  const dates = listRangeDates(startDate, endDate);
  const workingDates = dates.filter(isWorkingWeekday);
  if (workingDates.length === 0) {
    throw new Error("O período precisa conter pelo menos um dia útil.");
  }
  return workingDates.map((nonWorkingDate) => ({
    non_working_date: nonWorkingDate,
    note: normalizedNote,
    reason,
  }));
}

/** Verifica se uma data foi retirada da jornada do usuário. */
export function isNonWorkingDate(
  civilDate: string,
  excludedDays: TimeNonWorkingDayRow[],
): boolean {
  return excludedDays.some((day) => day.non_working_date === civilDate);
}

function listRangeDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  for (let date = startDate; date <= endDate; date = shiftDays(date, 1)) {
    if (dates.length >= maximumRangeDays) {
      throw new Error(`O período não pode ultrapassar ${maximumRangeDays} dias.`);
    }
    dates.push(date);
  }
  return dates;
}

function normalizeNote(note: string): string | null {
  const normalized = note.trim();
  if (normalized.length > 120) {
    throw new Error("A observação deve ter no máximo 120 caracteres.");
  }
  return normalized || null;
}

function parseCivilDate(civilDate: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(civilDate)) throwInvalidDate(civilDate);
  const parsed = new Date(`${civilDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== civilDate) {
    throwInvalidDate(civilDate);
  }
  return parsed;
}

function throwInvalidDate(civilDate: string): never {
  throw new Error(`Data inválida: "${civilDate}". Use uma data existente.`);
}
