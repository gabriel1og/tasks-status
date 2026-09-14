import { getEnvironmentAvailability } from "@/lib/task-environments";
import type { TaskEnvironmentAvailability } from "@/lib/task-environments";
import type { TagOptionRow, TaskStatusRow } from "@/types/database";

export type TrackedEnvironmentKey =
  | "local"
  | "development"
  | "homologation"
  | "production";

export type TrackedEnvironmentDefinition = {
  key: TrackedEnvironmentKey;
  label: string;
  persistedName: string;
  color: string;
  aliases: string[];
};

export type TrackedEnvironmentColumn = TrackedEnvironmentDefinition & {
  tag: TagOptionRow | null;
};

export type EnvironmentConsistencyStatus =
  | "compatible"
  | "incompatible"
  | "untracked";

export type EnvironmentConsistencyReport = {
  taskId: string;
  status: EnvironmentConsistencyStatus;
  reasons: string[];
  availableEnvironmentCount: number;
};

export type EnvironmentConsistencySummary = Record<
  EnvironmentConsistencyStatus,
  number
> & {
  total: number;
  organizationPercentage: number;
};

export const TRACKED_ENVIRONMENT_DEFINITIONS: TrackedEnvironmentDefinition[] = [
  {
    key: "local",
    label: "Local / Sem ambiente",
    persistedName: "Sem Ambiente",
    color: "#64748b",
    aliases: ["local", "sem ambiente", "local sem ambiente"],
  },
  {
    key: "development",
    label: "Desenvolvimento",
    persistedName: "Desenvolvimento",
    color: "#0891b2",
    aliases: ["desenvolvimento", "development", "dev"],
  },
  {
    key: "homologation",
    label: "Homologação",
    persistedName: "Homologacao",
    color: "#7c3aed",
    aliases: ["homologacao", "homolog", "hmg"],
  },
  {
    key: "production",
    label: "Produção",
    persistedName: "Producao",
    color: "#15803d",
    aliases: ["producao", "production", "prod"],
  },
];

/**
 * Relaciona as tags dinâmicas às quatro colunas operacionais.
 * Exemplo: resolveTrackedEnvironmentColumns(tags).find(({ key }) => key === "production").
 */
export function resolveTrackedEnvironmentColumns(
  environmentTags: TagOptionRow[],
): TrackedEnvironmentColumn[] {
  return TRACKED_ENVIRONMENT_DEFINITIONS.map((definition) => ({
    ...definition,
    tag:
      environmentTags.find((tag) =>
        definition.aliases.includes(normalizeEnvironmentName(tag.nome)),
      ) ?? null,
  }));
}

/**
 * Lista os ambientes padrão que ainda não possuem uma tag correspondente.
 * Exemplo: getMissingTrackedEnvironmentDefinitions([]) retorna as quatro definições.
 */
export function getMissingTrackedEnvironmentDefinitions(
  environmentTags: TagOptionRow[],
): TrackedEnvironmentDefinition[] {
  return resolveTrackedEnvironmentColumns(environmentTags)
    .filter((column) => !column.tag)
    .map(({ tag: _tag, ...definition }) => definition);
}

/**
 * Analisa a coerência da progressão e do ambiente atual de uma tarefa.
 * Exemplo: analyzeTaskEnvironmentConsistency(task, columns, availability).
 */
export function analyzeTaskEnvironmentConsistency(
  task: TaskStatusRow,
  columns: TrackedEnvironmentColumn[],
  availability: TaskEnvironmentAvailability,
): EnvironmentConsistencyReport {
  const availableByKey = buildAvailableEnvironmentLookup(
    task.id,
    columns,
    availability,
  );
  const reasons = getProgressionIssues(availableByKey);
  const currentEnvironmentIssue = getCurrentEnvironmentIssue(
    task,
    columns,
    availableByKey,
  );

  if (currentEnvironmentIssue) {
    reasons.push(currentEnvironmentIssue);
  }

  const availableEnvironmentCount = Object.values(availableByKey).filter(
    Boolean,
  ).length;
  if (!availableEnvironmentCount) {
    return {
      taskId: task.id,
      status: "untracked",
      reasons: ["Nenhum ambiente está marcado como disponível."],
      availableEnvironmentCount,
    };
  }

  return {
    taskId: task.id,
    status: reasons.length ? "incompatible" : "compatible",
    reasons: reasons.length
      ? reasons
      : ["Progressão entre ambientes sem lacunas."],
    availableEnvironmentCount,
  };
}

/**
 * Consolida os relatórios e calcula o percentual de tarefas compatíveis.
 * Exemplo: summarizeEnvironmentConsistency(reports).organizationPercentage.
 */
export function summarizeEnvironmentConsistency(
  reports: EnvironmentConsistencyReport[],
): EnvironmentConsistencySummary {
  const summary = reports.reduce<EnvironmentConsistencySummary>(
    (currentSummary, report) => ({
      ...currentSummary,
      [report.status]: currentSummary[report.status] + 1,
    }),
    {
      total: reports.length,
      compatible: 0,
      incompatible: 0,
      untracked: 0,
      organizationPercentage: 0,
    },
  );

  return {
    ...summary,
    organizationPercentage: summary.total
      ? Math.round((summary.compatible / summary.total) * 100)
      : 0,
  };
}

function buildAvailableEnvironmentLookup(
  taskId: string,
  columns: TrackedEnvironmentColumn[],
  availability: TaskEnvironmentAvailability,
): Record<TrackedEnvironmentKey, boolean> {
  return columns.reduce<Record<TrackedEnvironmentKey, boolean>>(
    (lookup, column) => ({
      ...lookup,
      [column.key]: column.tag
        ? getEnvironmentAvailability(availability, taskId, column.tag.id)
        : false,
    }),
    {
      local: false,
      development: false,
      homologation: false,
      production: false,
    },
  );
}

function getProgressionIssues(
  availableByKey: Record<TrackedEnvironmentKey, boolean>,
): string[] {
  const reasons: string[] = [];

  if (availableByKey.homologation && !availableByKey.development) {
    reasons.push("Homologação está disponível sem Desenvolvimento.");
  }
  if (availableByKey.production && !availableByKey.homologation) {
    reasons.push("Produção está disponível sem Homologação.");
  }

  return reasons;
}

function getCurrentEnvironmentIssue(
  task: TaskStatusRow,
  columns: TrackedEnvironmentColumn[],
  availableByKey: Record<TrackedEnvironmentKey, boolean>,
): string | null {
  if (!task.ambiente.trim()) {
    return null;
  }

  const normalizedCurrentEnvironment = normalizeEnvironmentName(task.ambiente);
  const currentColumn = columns.find((column) =>
    column.aliases.includes(normalizedCurrentEnvironment),
  );

  if (!currentColumn) {
    return `O ambiente atual "${task.ambiente}" não faz parte do rastreamento padrão.`;
  }
  if (!availableByKey[currentColumn.key]) {
    return `O ambiente atual "${task.ambiente}" não está marcado como disponível.`;
  }

  return null;
}

function normalizeEnvironmentName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}
