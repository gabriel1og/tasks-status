import type {
  TaskArea,
  TaskEnvironmentAreaStatus,
  TaskEnvironmentAreaStatusRow,
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
