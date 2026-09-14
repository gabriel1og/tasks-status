"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Info,
  MinusCircle,
  XCircle,
} from "lucide-react";

import { TaskInfoModal } from "@/components/environments/task-info-modal";
import { selectInputClassName } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
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
import { Tooltip } from "@/components/ui/tooltip";
import {
  analyzeTaskEnvironmentConsistency,
  summarizeEnvironmentConsistency,
  type EnvironmentConsistencyReport,
  type EnvironmentConsistencyStatus,
  type TrackedEnvironmentColumn,
} from "@/lib/environment-tracking";
import { getEnvironmentAvailability } from "@/lib/task-environments";
import type { TaskEnvironmentAvailability } from "@/lib/task-environments";
import type { TagOptionRow, TaskStatusRow } from "@/types/database";

type EnvironmentTrackingTableProps = {
  tasks: TaskStatusRow[];
  tags: TagOptionRow[];
  columns: TrackedEnvironmentColumn[];
  availability: TaskEnvironmentAvailability;
  savingStatusKeys: string[];
  onToggleEnvironment: (
    task: TaskStatusRow,
    column: TrackedEnvironmentColumn,
    available: boolean,
  ) => void;
};

type AnalysisFilter = "all" | EnvironmentConsistencyStatus;

const analysisLabels: Record<EnvironmentConsistencyStatus, string> = {
  compatible: "Compatível",
  incompatible: "Incompatível",
  untracked: "Sem rastreamento",
};

/** Renderiza a matriz editável e a análise. Exemplo: <EnvironmentTrackingTable {...props} />. */
export function EnvironmentTrackingTable({
  tasks,
  tags,
  columns,
  availability,
  savingStatusKeys,
  onToggleEnvironment,
}: EnvironmentTrackingTableProps) {
  const [query, setQuery] = useState("");
  const [analysisFilter, setAnalysisFilter] =
    useState<AnalysisFilter>("all");
  const [selectedTask, setSelectedTask] = useState<TaskStatusRow | null>(null);
  const reports = useMemo(
    () =>
      tasks.map((task) =>
        analyzeTaskEnvironmentConsistency(task, columns, availability),
      ),
    [availability, columns, tasks],
  );
  const reportByTaskId = useMemo(
    () => new Map(reports.map((report) => [report.taskId, report])),
    [reports],
  );
  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const report = reportByTaskId.get(task.id);
        const matchesQuery = normalizeSearchValue(task.nome).includes(
          normalizeSearchValue(query),
        );
        const matchesAnalysis =
          analysisFilter === "all" || report?.status === analysisFilter;

        return matchesQuery && matchesAnalysis;
      }),
    [analysisFilter, query, reportByTaskId, tasks],
  );
  const summary = useMemo(
    () => summarizeEnvironmentConsistency(reports),
    [reports],
  );

  return (
    <div className="space-y-6">
      <EnvironmentSummary
        compatible={summary.compatible}
        incompatible={summary.incompatible}
        organizationPercentage={summary.organizationPercentage}
        total={summary.total}
        untracked={summary.untracked}
      />

      <Card>
        <CardHeader className="gap-4 md:flex md:flex-row md:items-end md:justify-between md:space-y-0">
          <div className="space-y-2">
            <CardTitle className="text-left">Rastreamento por ambiente</CardTitle>
            <p className="max-w-3xl text-sm text-muted-foreground">
              A compatibilidade considera a sequência Desenvolvimento →
              Homologação → Produção e confere se o ambiente atual está marcado
              como disponível.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
            <Input
              className="sm:w-64"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar tarefa"
              aria-label="Buscar tarefa no rastreamento"
            />
            <select
              className={`${selectInputClassName} sm:w-52`}
              value={analysisFilter}
              onChange={(event) =>
                setAnalysisFilter(event.target.value as AnalysisFilter)
              }
              aria-label="Filtrar por análise"
            >
              <option value="all">Todas as análises</option>
              <option value="compatible">Compatíveis</option>
              <option value="incompatible">Incompatíveis</option>
              <option value="untracked">Sem rastreamento</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <EnvironmentMatrix
            tasks={visibleTasks}
            tags={tags}
            columns={columns}
            availability={availability}
            reportByTaskId={reportByTaskId}
            savingStatusKeys={savingStatusKeys}
            onShowTaskInfo={setSelectedTask}
            onToggleEnvironment={onToggleEnvironment}
          />
        </CardContent>
      </Card>

      {selectedTask ? (
        <TaskInfoModal
          task={selectedTask}
          tags={tags}
          onClose={() => setSelectedTask(null)}
        />
      ) : null}
    </div>
  );
}

function EnvironmentSummary({
  total,
  compatible,
  incompatible,
  untracked,
  organizationPercentage,
}: {
  total: number;
  compatible: number;
  incompatible: number;
  untracked: number;
  organizationPercentage: number;
}) {
  const metrics = [
    { label: "Organização", value: `${organizationPercentage}%` },
    { label: "Compatíveis", value: compatible },
    { label: "Incompatíveis", value: incompatible },
    { label: "Sem rastreamento", value: untracked },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
            {metric.label === "Organização" ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {total} {total === 1 ? "tarefa analisada" : "tarefas analisadas"}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EnvironmentMatrix({
  tasks,
  tags,
  columns,
  availability,
  reportByTaskId,
  savingStatusKeys,
  onShowTaskInfo,
  onToggleEnvironment,
}: EnvironmentTrackingTableProps & {
  reportByTaskId: Map<string, EnvironmentConsistencyReport>;
  onShowTaskInfo: (task: TaskStatusRow) => void;
}) {
  if (!tasks.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhuma tarefa encontrada com os filtros atuais.
      </p>
    );
  }

  return (
    <Table className="min-w-[1050px]">
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-56">Nome da tarefa</TableHead>
          {columns.map((column) => (
            <TableHead key={column.key} className="min-w-44 text-center">
              {column.label}
            </TableHead>
          ))}
          <TableHead className="w-20 text-center">Infos</TableHead>
          <TableHead className="min-w-64">Análise</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell className="font-medium">{task.nome}</TableCell>
            {columns.map((column) => {
              const available = column.tag
                ? getEnvironmentAvailability(
                    availability,
                    task.id,
                    column.tag.id,
                  )
                : false;
              const statusKey = column.tag
                ? `${task.id}:${column.tag.id}`
                : `${task.id}:${column.key}`;

              return (
                <TableCell key={column.key} className="text-center">
                  <EnvironmentStatusButton
                    task={task}
                    column={column}
                    available={available}
                    isSaving={savingStatusKeys.includes(statusKey)}
                    onToggleEnvironment={onToggleEnvironment}
                  />
                </TableCell>
              );
            })}
            <TableCell className="text-center">
              <Tooltip content="Ver informações da tarefa">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onShowTaskInfo(task)}
                  aria-label={`Ver informações de ${task.nome}`}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </Tooltip>
            </TableCell>
            <TableCell>
              <EnvironmentAnalysis report={reportByTaskId.get(task.id)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EnvironmentStatusButton({
  task,
  column,
  available,
  isSaving,
  onToggleEnvironment,
}: {
  task: TaskStatusRow;
  column: TrackedEnvironmentColumn;
  available: boolean;
  isSaving: boolean;
  onToggleEnvironment: EnvironmentTrackingTableProps["onToggleEnvironment"];
}) {
  if (!column.tag) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <MinusCircle className="h-4 w-4" />
        Não configurado
      </span>
    );
  }

  const StatusIcon = available ? CheckCircle2 : XCircle;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={
        available
          ? "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          : "text-destructive hover:text-destructive"
      }
      disabled={isSaving}
      aria-pressed={available}
      aria-label={`${column.label} de ${task.nome}: ${available ? "disponível" : "indisponível"}`}
      onClick={() => onToggleEnvironment(task, column, !available)}
    >
      <StatusIcon className="h-4 w-4" />
      {isSaving ? "Salvando..." : available ? "Disponível" : "Indisponível"}
    </Button>
  );
}

function EnvironmentAnalysis({
  report,
}: {
  report?: EnvironmentConsistencyReport;
}) {
  if (!report) {
    return <span className="text-sm text-muted-foreground">Não analisado</span>;
  }

  const statusStyle = {
    compatible: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    incompatible: "bg-destructive/15 text-destructive",
    untracked: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  }[report.status];
  const StatusIcon =
    report.status === "compatible" ? CheckCircle2 : CircleAlert;

  return (
    <div className="space-y-1.5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${statusStyle}`}
      >
        <StatusIcon className="h-3.5 w-3.5" />
        {analysisLabels[report.status]}
      </span>
      <p className="text-xs leading-5 text-muted-foreground">
        {report.reasons.join(" ")}
      </p>
    </div>
  );
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}
