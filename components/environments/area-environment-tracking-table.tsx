"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FilterX } from "lucide-react";

import { EnvironmentComparisonSelector } from "@/components/environments/environment-comparison-selector";
import { selectInputClassName } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  TrackedEnvironmentColumn,
  TrackedEnvironmentKey,
} from "@/lib/environment-tracking";
import {
  findTaskAreaStatus,
  getTaskAreaComparison,
  sanitizeTaskAreas,
  summarizeTaskAreaComparisons,
  TASK_AREAS,
  TASK_AREA_LABELS,
  TASK_AREA_STATUS_LABELS,
} from "@/lib/task-areas";
import type {
  ComparableTaskAreaStatus,
  TaskAreaComparisonSummary,
} from "@/lib/task-areas";
import type {
  TaskArea,
  TaskEnvironmentAreaStatus,
  TaskEnvironmentAreaStatusRow,
  TaskStatusRow,
} from "@/types/database";

type AreaFilter = "both" | TaskArea | "unclassified" | "all";
type ComparisonFilter = "all" | "attention" | ComparableTaskAreaStatus;

const comparisonFilterLabels: Record<ComparisonFilter, string> = {
  all: "Todas as comparações",
  attention: "Requer atenção",
  aligned: "Áreas alinhadas",
  frontend_ahead: "Frontend adiantado",
  backend_ahead: "Backend adiantado",
  blocked: "Área bloqueada",
  incomplete: "Rastreamento incompleto",
};

const comparisonMetricOrder: ComparableTaskAreaStatus[] = [
  "aligned",
  "frontend_ahead",
  "backend_ahead",
  "blocked",
  "incomplete",
];

const attentionStatuses: ComparableTaskAreaStatus[] = [
  "frontend_ahead",
  "backend_ahead",
  "blocked",
  "incomplete",
];

const environmentPreferenceKey =
  "gerenciamento-status:area-comparison-environment";

const emptyComparisonSummary: TaskAreaComparisonSummary = {
  aligned: 0,
  frontend_ahead: 0,
  backend_ahead: 0,
  blocked: 0,
  incomplete: 0,
};

type AreaEnvironmentTrackingTableProps = {
  tasks: TaskStatusRow[];
  columns: TrackedEnvironmentColumn[];
  areaStatuses: TaskEnvironmentAreaStatusRow[];
  savingStatusKeys: string[];
  onStatusChange: (
    task: TaskStatusRow,
    environment: TrackedEnvironmentColumn,
    area: TaskArea,
    status: TaskEnvironmentAreaStatus | null,
  ) => void;
};

/** Renderiza o acompanhamento opcional das áreas por ambiente. Exemplo: <AreaEnvironmentTrackingTable {...props} />. */
export function AreaEnvironmentTrackingTable({
  tasks,
  columns,
  areaStatuses,
  savingStatusKeys,
  onStatusChange,
}: AreaEnvironmentTrackingTableProps) {
  const availableColumns = useMemo(
    () => columns.filter((column) => column.tag),
    [columns],
  );
  const restoredEnvironmentPreference = useRef(false);
  const [environmentKey, setEnvironmentKey] = useState<TrackedEnvironmentKey>(
    availableColumns.find((column) => column.key === "development")?.key ??
      availableColumns[0]?.key ??
      "development",
  );
  const [areaFilter, setAreaFilter] = useState<AreaFilter>("both");
  const [comparisonFilter, setComparisonFilter] =
    useState<ComparisonFilter>("all");
  const [query, setQuery] = useState("");
  const environment =
    availableColumns.find((column) => column.key === environmentKey) ??
    availableColumns[0];
  const comparisonSummary = useMemo(
    () =>
      environment?.tag
        ? summarizeTaskAreaComparisons(
            tasks,
            areaStatuses,
            environment.tag.id,
          )
        : emptyComparisonSummary,
    [areaStatuses, environment, tasks],
  );
  const hasActiveFilters =
    Boolean(query) || areaFilter !== "both" || comparisonFilter !== "all";

  useEffect(() => {
    const savedKey = window.localStorage.getItem(environmentPreferenceKey);
    const savedColumn = availableColumns.find(
      (column) => column.key === savedKey,
    );
    if (!restoredEnvironmentPreference.current && savedColumn) {
      restoredEnvironmentPreference.current = true;
      setEnvironmentKey(savedColumn.key);
      return;
    }

    restoredEnvironmentPreference.current = true;
    window.localStorage.setItem(environmentPreferenceKey, environmentKey);
  }, [availableColumns, environmentKey]);
  const visibleTasks = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query);
    return tasks.filter((task) => {
      if (!matchesAreaFilter(sanitizeTaskAreas(task.areas), areaFilter)) {
        return false;
      }
      if (!normalizeSearchValue(task.nome).includes(normalizedQuery)) {
        return false;
      }
      if (comparisonFilter === "all" || !environment?.tag) {
        return true;
      }
      const status = getTaskAreaComparison(
        task,
        areaStatuses,
        environment.tag.id,
      ).status;
      return comparisonFilter === "attention"
        ? attentionStatuses.includes(status as ComparableTaskAreaStatus)
        : status === comparisonFilter;
    });
  }, [areaFilter, areaStatuses, comparisonFilter, environment, query, tasks]);

  return (
    <Card>
      <CardHeader className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h3 className={"text-xl font-semibold leading-none"}>
              Frontend × Backend
            </h3>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Compare somente as áreas envolvidas na tarefa. Uma área não
              participante é exibida como não aplicável.
            </p>
          </div>
          <EnvironmentComparisonSelector
            columns={availableColumns}
            value={environment?.key ?? environmentKey}
            onChange={setEnvironmentKey}
          />
        </div>
        <div className="w-full space-y-2">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar tarefa"
              aria-label="Buscar tarefa por área"
            />
            <select
              className={selectInputClassName}
              value={areaFilter}
              onChange={(event) => {
                const nextFilter = event.target.value as AreaFilter;
                setAreaFilter(nextFilter);
                if (nextFilter !== "both" && nextFilter !== "all") {
                  setComparisonFilter("all");
                }
              }}
              aria-label="Filtrar tarefas pelas áreas envolvidas"
            >
              <option value="both">Frontend e Backend</option>
              <option value="frontend">Somente Frontend</option>
              <option value="backend">Somente Backend</option>
              <option value="unclassified">Áreas não definidas</option>
              <option value="all">Todas as tarefas</option>
            </select>
            <select
              className={selectInputClassName}
              value={comparisonFilter}
              disabled={areaFilter !== "both" && areaFilter !== "all"}
              onChange={(event) =>
                setComparisonFilter(event.target.value as ComparisonFilter)
              }
              aria-label="Filtrar pelo resultado da comparação entre áreas"
            >
              {Object.entries(comparisonFilterLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {hasActiveFilters ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setAreaFilter("both");
                  setComparisonFilter("all");
                }}
              >
                <FilterX className="h-4 w-4" />
                Limpar filtros
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {environment?.tag ? (
          <>
            <AreaComparisonSummary summary={comparisonSummary} />
            <AreaComparisonMatrix
              tasks={visibleTasks}
              environment={environment}
              areaStatuses={areaStatuses}
              savingStatusKeys={savingStatusKeys}
              onStatusChange={onStatusChange}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Configure ao menos um ambiente para iniciar o rastreamento.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AreaComparisonSummary({
  summary,
}: {
  summary: TaskAreaComparisonSummary;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      {comparisonMetricOrder.map((status) => (
        <div key={status} className="rounded-md border px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {comparisonFilterLabels[status]}
          </p>
          <p className="mt-1 text-lg font-semibold">{summary[status]}</p>
        </div>
      ))}
    </div>
  );
}

function AreaComparisonMatrix({
  tasks,
  environment,
  areaStatuses,
  savingStatusKeys,
  onStatusChange,
}: Omit<AreaEnvironmentTrackingTableProps, "columns"> & {
  environment: TrackedEnvironmentColumn;
}) {
  if (!tasks.length || !environment.tag) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhuma tarefa encontrada com os filtros atuais.
      </p>
    );
  }

  return (
    <Table className="min-w-[760px]">
      <TableHeader>
        <TableRow>
          <TableHead>Nome da tarefa</TableHead>
          <TableHead>Frontend</TableHead>
          <TableHead>Backend</TableHead>
          <TableHead>Comparação em {environment.label}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <AreaComparisonRow
            key={task.id}
            task={task}
            environment={environment}
            areaStatuses={areaStatuses}
            savingStatusKeys={savingStatusKeys}
            onStatusChange={onStatusChange}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function AreaComparisonRow({
  task,
  environment,
  areaStatuses,
  savingStatusKeys,
  onStatusChange,
}: Omit<AreaEnvironmentTrackingTableProps, "tasks" | "columns"> & {
  task: TaskStatusRow;
  environment: TrackedEnvironmentColumn;
}) {
  const areas = sanitizeTaskAreas(task.areas);
  const environmentTagId = environment.tag?.id ?? "";
  const frontendStatus = findTaskAreaStatus(
    areaStatuses,
    task.id,
    environmentTagId,
    "frontend",
  )?.status;
  const backendStatus = findTaskAreaStatus(
    areaStatuses,
    task.id,
    environmentTagId,
    "backend",
  )?.status;
  const comparison = getTaskAreaComparison(
    task,
    areaStatuses,
    environmentTagId,
  );
  const requiresAttention = attentionStatuses.includes(
    comparison.status as ComparableTaskAreaStatus,
  );
  const rowClassName =
    comparison.status === "blocked"
      ? "bg-destructive/5 hover:bg-destructive/10"
      : requiresAttention
        ? "bg-amber-500/5 hover:bg-amber-500/10"
        : undefined;

  return (
    <TableRow className={rowClassName}>
      <TableCell className="font-medium">{task.nome}</TableCell>
      {TASK_AREAS.map((area) => (
        <TableCell key={area}>
          <AreaStatusSelect
            task={task}
            environment={environment}
            area={area}
            applicable={areas.includes(area)}
            value={area === "frontend" ? frontendStatus : backendStatus}
            isSaving={savingStatusKeys.includes(
              `${task.id}:${environmentTagId}:${area}`,
            )}
            onStatusChange={onStatusChange}
          />
        </TableCell>
      ))}
      <TableCell>
        <span className={getComparisonClassName(comparison.status)}>
          {comparison.label}
        </span>
      </TableCell>
    </TableRow>
  );
}

function AreaStatusSelect({
  task,
  environment,
  area,
  applicable,
  value,
  isSaving,
  onStatusChange,
}: {
  task: TaskStatusRow;
  environment: TrackedEnvironmentColumn;
  area: TaskArea;
  applicable: boolean;
  value?: TaskEnvironmentAreaStatus;
  isSaving: boolean;
  onStatusChange: AreaEnvironmentTrackingTableProps["onStatusChange"];
}) {
  if (!applicable) {
    return <span className="text-sm text-muted-foreground">Não se aplica</span>;
  }

  return (
    <select
      className={selectInputClassName}
      value={value ?? ""}
      disabled={isSaving}
      aria-label={`${TASK_AREA_LABELS[area]} de ${task.nome} em ${environment.label}`}
      onChange={(event) =>
        onStatusChange(
          task,
          environment,
          area,
          (event.target.value as TaskEnvironmentAreaStatus) || null,
        )
      }
    >
      <option value="">{isSaving ? "Salvando..." : "Não informado"}</option>
      {Object.entries(TASK_AREA_STATUS_LABELS).map(([status, label]) => (
        <option key={status} value={status}>
          {label}
        </option>
      ))}
    </select>
  );
}

function matchesAreaFilter(areas: TaskArea[], filter: AreaFilter): boolean {
  if (filter === "all") return true;
  if (filter === "unclassified") return areas.length === 0;
  if (filter === "both")
    return TASK_AREAS.every((area) => areas.includes(area));
  return areas.length === 1 && areas.includes(filter);
}

function getComparisonClassName(status: string): string {
  const baseClassName = "inline-flex rounded-md px-2 py-1 text-xs font-medium";
  if (status === "aligned")
    return `${baseClassName} bg-emerald-500/15 text-emerald-700 dark:text-emerald-300`;
  if (status === "blocked")
    return `${baseClassName} bg-destructive/15 text-destructive`;
  if (status === "frontend_ahead" || status === "backend_ahead")
    return `${baseClassName} bg-amber-500/15 text-amber-700 dark:text-amber-300`;
  return `${baseClassName} bg-muted text-muted-foreground`;
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}
