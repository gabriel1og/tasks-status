import type {
  SprintAdditionalInfoUpdate,
  SprintLink,
  SprintRow,
  TaskStatusRow,
} from "@/types/database";

export type SprintPhase = "planned" | "active" | "finished";

export type SprintTiming = {
  phase: SprintPhase;
  label: string;
  detail: string;
};

export type SprintTaskDistribution = {
  name: string;
  count: number;
};

/** Creates a blank editable link, e.g. createEmptySprintLink(). */
export function createEmptySprintLink(): SprintLink {
  return { label: "", url: "" };
}

/** Sanitizes persisted links, e.g. sanitizeSprintLinks(sprint.links). */
export function sanitizeSprintLinks(links: unknown): SprintLink[] {
  if (!Array.isArray(links)) return [];
  return links.flatMap((link) => {
    if (!isSprintLinkRecord(link)) return [];
    const label = typeof link.label === "string" ? link.label.trim() : "";
    const url = typeof link.url === "string" ? link.url.trim() : "";
    return label && isHttpUrl(url) ? [{ label, url }] : [];
  });
}

/** Ensures one editable row, e.g. getEditableSprintLinks([]). */
export function getEditableSprintLinks(links: unknown): SprintLink[] {
  const sanitizedLinks = sanitizeSprintLinks(links);
  return sanitizedLinks.length ? sanitizedLinks : [createEmptySprintLink()];
}

/** Validates editable link rows and returns a safe UI message. */
export function validateSprintLinks(links: SprintLink[]): string {
  const incompleteLink = links.find(
    (link) => Boolean(link.label.trim()) !== Boolean(link.url.trim()),
  );
  if (incompleteLink) return "Informe o nome e a URL de cada link útil.";

  const invalidLink = links.find(
    (link) => link.url.trim() && !isHttpUrl(link.url),
  );
  return invalidLink ? "Use URLs iniciadas por http:// ou https://." : "";
}

/** Builds the editable payload from a sprint, e.g. getSprintAdditionalInfo(sprint). */
export function getSprintAdditionalInfo(
  sprint: SprintRow,
): SprintAdditionalInfoUpdate {
  return {
    objetivo: sprint.objetivo ?? "",
    criterios_sucesso: sprint.criterios_sucesso ?? "",
    observacoes: sprint.observacoes ?? "",
    links: getEditableSprintLinks(sprint.links),
  };
}

/** Resolves the sprint phase and civil-day distance for a YYYY-MM-DD date. */
export function getSprintTiming(
  sprint: Pick<SprintRow, "data_inicio" | "data_fim">,
  todayKey: string,
): SprintTiming {
  if (todayKey < sprint.data_inicio) {
    const days = differenceInCivilDays(todayKey, sprint.data_inicio);
    return { phase: "planned", label: "Planejada", detail: startsIn(days) };
  }
  if (todayKey <= sprint.data_fim) {
    const days = differenceInCivilDays(todayKey, sprint.data_fim);
    return { phase: "active", label: "Em andamento", detail: endsIn(days) };
  }
  const days = differenceInCivilDays(sprint.data_fim, todayKey);
  return { phase: "finished", label: "Encerrada", detail: endedAgo(days) };
}

/** Returns the browser-local civil date, e.g. getLocalDateKey(new Date()). */
export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Counts tasks by a displayed field, e.g. summarizeTasksByField(tasks, "status"). */
export function summarizeTasksByField(
  tasks: TaskStatusRow[],
  field: "status" | "ambiente",
): SprintTaskDistribution[] {
  const counts = new Map<string, number>();
  tasks.forEach((task) => {
    const name = task[field].trim() || "Não informado";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.name.localeCompare(right.name, "pt-BR"),
    );
}

function isSprintLinkRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function differenceInCivilDays(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  const fromUtc = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const toUtc = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

function startsIn(days: number): string {
  return days === 1 ? "Começa em 1 dia" : `Começa em ${days} dias`;
}

function endsIn(days: number): string {
  if (days === 0) return "Encerra hoje";
  return days === 1 ? "1 dia restante" : `${days} dias restantes`;
}

function endedAgo(days: number): string {
  return days === 1 ? "Encerrada há 1 dia" : `Encerrada há ${days} dias`;
}
