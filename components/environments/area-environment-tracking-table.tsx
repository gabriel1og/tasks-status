"use client";

import { useMemo, useState } from "react";

import { selectInputClassName } from "@/components/tasks/task-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TrackedEnvironmentColumn } from "@/lib/environment-tracking";
import {
  compareTaskAreas,
  findTaskAreaStatus,
  sanitizeTaskAreas,
  TASK_AREAS,
  TASK_AREA_LABELS,
  TASK_AREA_STATUS_LABELS,
} from "@/lib/task-areas";
import type {
  TaskArea,
  TaskEnvironmentAreaStatus,
  TaskEnvironmentAreaStatusRow,
  TaskStatusRow,
} from "@/types/database";

type AreaFilter = "both" | TaskArea | "unclassified" | "all";

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
  const availableColumns = columns.filter((column) => column.tag);
  const [environmentKey, setEnvironmentKey] = useState(
    availableColumns.find((column) => column.key === "development")?.key ??
      availableColumns[0]?.key ??
      "",
  );
  const [areaFilter, setAreaFilter] = useState<AreaFilter>("both");
  const [query, setQuery] = useState("");
  const environment =
    availableColumns.find((column) => column.key === environmentKey) ??
    availableColumns[0];
  const visibleTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          matchesAreaFilter(sanitizeTaskAreas(task.areas), areaFilter) &&
          normalizeSearchValue(task.nome).includes(normalizeSearchValue(query)),
      ),
    [areaFilter, query, tasks],
  );

  return (
    <Card>
      <CardHeader className="gap-4 md:flex md:flex-row md:items-end md:justify-between md:space-y-0">
        <div className="space-y-2">
          <CardTitle>Frontend × Backend</CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Compare somente as áreas envolvidas na tarefa. Uma área não
            participante é exibida como não aplicável.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-3 md:w-auto">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar tarefa"
            aria-label="Buscar tarefa por área"
          />
          <select
            className={selectInputClassName}
            value={environment?.key ?? ""}
            onChange={(event) => setEnvironmentKey(event.target.value)}
            aria-label="Selecionar ambiente da comparação"
          >
            {availableColumns.map((column) => (
              <option key={column.key} value={column.key}>
                {column.label}
              </option>
            ))}
          </select>
          <select
            className={selectInputClassName}
            value={areaFilter}
            onChange={(event) => setAreaFilter(event.target.value as AreaFilter)}
            aria-label="Filtrar tarefas pelas áreas envolvidas"
          >
            <option value="both">Frontend e Backend</option>
            <option value="frontend">Somente Frontend</option>
            <option value="backend">Somente Backend</option>
            <option value="unclassified">Áreas não definidas</option>
            <option value="all">Todas as tarefas</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {environment?.tag ? (
          <AreaComparisonMatrix
            tasks={visibleTasks}
            environment={environment}
            areaStatuses={areaStatuses}
            savingStatusKeys={savingStatusKeys}
            onStatusChange={onStatusChange}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Configure ao menos um ambiente para iniciar o rastreamento.
          </p>
        )}
      </CardContent>
    </Card>
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
  const comparison = compareTaskAreas(
    areas,
    frontendStatus,
    backendStatus,
  );

  return (
    <TableRow>
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
  if (filter === "both") return TASK_AREAS.every((area) => areas.includes(area));
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
