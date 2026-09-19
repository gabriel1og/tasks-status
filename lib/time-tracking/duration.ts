const clockDurationPattern = /^(\d+):([0-5]?\d)$/;
const hourDurationPattern =
  /^(\d+)\s*h(?:ora(?:s)?)?\s*(?:(\d{1,2})\s*(?:m|min(?:uto(?:s)?)?)?)?$/;
const minuteDurationPattern = /^(\d+)\s*(?:m|min(?:uto(?:s)?)?)?$/;

/** Converte durações como `1h30`, `1:30` ou `90min` para minutos. */
export function parseDurationToMinutes(durationInput: string): number {
  const normalizedInput = durationInput.trim().toLowerCase();
  const clockMatch = clockDurationPattern.exec(normalizedInput);
  if (clockMatch) return buildDurationMinutes(durationInput, clockMatch[1], clockMatch[2]);

  const hourMatch = hourDurationPattern.exec(normalizedInput);
  if (hourMatch) return buildDurationMinutes(durationInput, hourMatch[1], hourMatch[2] ?? "0");

  const minuteMatch = minuteDurationPattern.exec(normalizedInput);
  if (minuteMatch) return assertPositiveMinutes(durationInput, Number(minuteMatch[1]));

  throwInvalidDuration(durationInput);
}

/** Formata minutos para leitura humana. Ex.: `formatDuration(90)` retorna `1h 30min`. */
export function formatDuration(durationMinutes: number): string {
  if (!Number.isInteger(durationMinutes) || durationMinutes < 0) {
    throw new Error(
      `Duração inválida: ${durationMinutes}. Informe minutos inteiros não negativos.`,
    );
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

/** Formata um saldo em minutos com sinal explícito quando diferente de zero. */
export function formatSignedDuration(durationMinutes: number): string {
  if (!Number.isInteger(durationMinutes)) {
    throw new Error(
      `Saldo inválido: ${durationMinutes}. Informe minutos inteiros.`,
    );
  }
  const prefix = durationMinutes > 0 ? "+" : durationMinutes < 0 ? "−" : "";
  return `${prefix}${formatDuration(Math.abs(durationMinutes))}`;
}

function buildDurationMinutes(
  originalInput: string,
  hoursInput: string,
  minutesInput: string,
): number {
  const hours = Number(hoursInput);
  const minutes = Number(minutesInput);
  if (minutes >= 60) throwInvalidDuration(originalInput);
  return assertPositiveMinutes(originalInput, hours * 60 + minutes);
}

function assertPositiveMinutes(originalInput: string, totalMinutes: number): number {
  if (Number.isSafeInteger(totalMinutes) && totalMinutes > 0) return totalMinutes;
  throwInvalidDuration(originalInput);
}

function throwInvalidDuration(durationInput: string): never {
  throw new Error(
    `Duração inválida: "${durationInput}". Use formatos como 1h30, 1:30 ou 90min.`,
  );
}
