import type {
  TaskArea,
  TaskEnvironmentAreaStatus,
  TaskEnvironmentAreaStatusRow,
  TaskStatusRow,
} from "@/types/database";

export const TASK_AREAS: TaskArea[] = ["frontend", "backend"];

export const TASK_AREA_LABELS: Record<TaskArea, string> = {
  frontend: "Frontend",
  backend: "Backend",
};

export const TASK_AREA_STATUS_LABELS: Record<
  TaskEnvironmentAreaStatus,
  string
> = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  available: "Disponível",
  blocked: "Bloqueado",
};

/** Normaliza as áreas persistidas da tarefa. Exemplo: sanitizeTaskAreas(["frontend"]). */
export function sanitizeTaskAreas(value: unknown): TaskArea[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return TASK_AREAS.filter((area) => value.includes(area));
}

/** Localiza o estado de uma área no ambiente. Exemplo: findTaskAreaStatus(rows, id, tag, "frontend"). */
export function findTaskAreaStatus(
  rows: TaskEnvironmentAreaStatusRow[],
  taskId: string,
  environmentTagId: string,
  area: TaskArea,
): TaskEnvironmentAreaStatusRow | undefined {
  return rows.find(
    (row) =>
      row.task_id === taskId &&
      row.environment_tag_id === environmentTagId &&
      row.area === area,
  );
}

export type TaskAreaComparison = {
  status:
    | "unclassified"
    | "not_applicable"
    | "incomplete"
    | "aligned"
    | "frontend_ahead"
    | "backend_ahead"
    | "blocked";
  label: string;
};

export type ComparableTaskAreaStatus = Exclude<
  TaskAreaComparison["status"],
  "unclassified" | "not_applicable"
>;

export type TaskAreaComparisonSummary = Record<
  ComparableTaskAreaStatus,
  number
>;

/** Compara Frontend e Backend somente quando ambos participam. Exemplo: compareTaskAreas(task.areas, front, back). */
export function compareTaskAreas(
  areas: TaskArea[],
  frontendStatus?: TaskEnvironmentAreaStatus,
  backendStatus?: TaskEnvironmentAreaStatus,
): TaskAreaComparison {
  if (!areas.length) {
    return { status: "unclassified", label: "Áreas não definidas" };
  }
  if (!areas.includes("frontend") || !areas.includes("backend")) {
    return { status: "not_applicable", label: "Comparação não aplicável" };
  }
  if (!frontendStatus || !backendStatus) {
    return { status: "incomplete", label: "Rastreamento incompleto" };
  }
  if (frontendStatus === "blocked" || backendStatus === "blocked") {
    return { status: "blocked", label: "Há uma área bloqueada" };
  }
  if (frontendStatus === backendStatus) {
    return { status: "aligned", label: "Áreas alinhadas" };
  }

  const progressRank: Record<TaskEnvironmentAreaStatus, number> = {
    not_started: 0,
    in_progress: 1,
    available: 2,
    blocked: -1,
  };
  return progressRank[frontendStatus] > progressRank[backendStatus]
    ? { status: "frontend_ahead", label: "Frontend adiantado" }
    : { status: "backend_ahead", label: "Backend adiantado" };
}

/** Compara as áreas persistidas de uma tarefa em um ambiente. Exemplo: getTaskAreaComparison(task, rows, tagId). */
export function getTaskAreaComparison(
  task: TaskStatusRow,
  rows: TaskEnvironmentAreaStatusRow[],
  environmentTagId: string,
): TaskAreaComparison {
  const getStatus = (area: TaskArea) =>
    findTaskAreaStatus(rows, task.id, environmentTagId, area)?.status;

  return compareTaskAreas(
    sanitizeTaskAreas(task.areas),
    getStatus("frontend"),
    getStatus("backend"),
  );
}

/** Resume os diagnósticos comparáveis de um ambiente. Exemplo: summarizeTaskAreaComparisons(tasks, rows, tagId). */
export function summarizeTaskAreaComparisons(
  tasks: TaskStatusRow[],
  rows: TaskEnvironmentAreaStatusRow[],
  environmentTagId: string,
): TaskAreaComparisonSummary {
  const summary: TaskAreaComparisonSummary = {
    aligned: 0,
    frontend_ahead: 0,
    backend_ahead: 0,
    blocked: 0,
    incomplete: 0,
  };

  tasks.forEach((task) => {
    const { status } = getTaskAreaComparison(task, rows, environmentTagId);
    if (status === "unclassified" || status === "not_applicable") return;
    summary[status] += 1;
  });
  return summary;
}
