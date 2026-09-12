"use client";

import { ExternalLink, ListFilter } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { getTaskCalendarDate } from "@/lib/task-queries";
import type { TagKind, TagOptionRow, TaskStatusRow } from "@/types/database";

type QueryResultsProps = {
  tasks: TaskStatusRow[];
  tags: TagOptionRow[];
  totalCount: number;
  isPreview: boolean;
  validationError: string | null;
};

/** Displays matching tasks without applying hidden filters; for example, all sprints. */
export function QueryResults({
  tasks,
  tags,
  totalCount,
  isPreview,
  validationError,
}: QueryResultsProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">
            {isPreview ? "Prévia do rascunho" : "Resultados da query"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {isPreview
              ? "Atualizada enquanto você edita. Salve para manter estas condições."
              : "Tarefas que atendem às condições salvas."}
          </p>
        </div>
        <span
          className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium"
          role="status"
        >
          {validationError
            ? "Condições incompletas"
            : `${tasks.length} de ${totalCount} tarefas`}
        </span>
      </div>
      {validationError ? (
        <p className="p-6 text-sm text-muted-foreground">
          Preencha as condições para visualizar as tarefas correspondentes.
        </p>
      ) : tasks.length ? (
        <ResultsTable tasks={tasks} tags={tags} />
      ) : (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <ListFilter className="mb-1 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            {totalCount
              ? "Nenhuma tarefa corresponde a esta query."
              : "Você ainda não tem tarefas cadastradas."}
          </p>
          <p className="text-xs text-muted-foreground">
            {totalCount
              ? "Edite as condições para ajustar os resultados."
              : "As tarefas aparecerão aqui quando forem cadastradas e atenderem às condições."}
          </p>
        </div>
      )}
    </Card>
  );
}

function ResultsTable({
  tasks,
  tags,
}: Pick<QueryResultsProps, "tasks" | "tags">) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {[
            "Nome",
            "Azure",
            "LiveOps",
            "Sprint",
            "Status",
            "Ambiente",
            "Tarefa futura",
            "Criada em",
          ].map((label) => (
            <TableHead key={label} className="whitespace-nowrap">
              {label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <ResultRow key={task.id} task={task} tags={tags} />
        ))}
      </TableBody>
    </Table>
  );
}

function ResultRow({
  task,
  tags,
}: {
  task: TaskStatusRow;
  tags: TagOptionRow[];
}) {
  return (
    <TableRow>
      <TableCell className="min-w-[220px] max-w-sm align-top">
        <p className="break-words font-medium">{task.nome}</p>
        <details className="mt-1 text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            Identificadores
          </summary>
          <dl className="mt-2 space-y-1 break-all">
            <div>
              <dt className="inline font-medium">Tarefa: </dt>
              <dd className="inline">{task.id}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Sprint: </dt>
              <dd className="inline">{task.sprint_id || "Sem sprint"}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Usuário: </dt>
              <dd className="inline">{task.user_id}</dd>
            </div>
          </dl>
        </details>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <ResultLink
          url={task.azure_url}
          text={task.azure}
          label={`Abrir Azure de ${task.nome}`}
        />
      </TableCell>
      <TableCell>
        <ResultLink
          url={task.liveops_url}
          text={task.liveops_url ? "LiveOps" : ""}
          label={`Abrir LiveOps de ${task.nome}`}
        />
      </TableCell>
      <TableCell className="min-w-32">{task.sprint || "Sem sprint"}</TableCell>
      <TableCell>
        <ResultTag name={task.status} kind="status" tags={tags} />
      </TableCell>
      <TableCell>
        <ResultTag name={task.ambiente} kind="ambiente" tags={tags} />
      </TableCell>
      <TableCell>{task.is_future ? "Sim" : "Não"}</TableCell>
      <TableCell className="whitespace-nowrap">
        <time dateTime={task.created_at} title={task.created_at}>
          {formatDate(getTaskCalendarDate(task.created_at) ?? "") || "—"}
        </time>
      </TableCell>
    </TableRow>
  );
}

function ResultTag({
  name,
  kind,
  tags,
}: {
  name: string;
  kind: TagKind;
  tags: TagOptionRow[];
}) {
  const tag = tags.find(
    (candidate) => candidate.tipo === kind && candidate.nome === name,
  );
  if (!name) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-muted px-2 py-1 text-xs font-medium">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: tag?.cor ?? "#64748b" }}
        aria-hidden
      />
      {name}
    </span>
  );
}

function ResultLink({
  url,
  text,
  label,
}: {
  url: string;
  text: string;
  label: string;
}) {
  const href = getSafeResultUrl(url);
  if (!href) return <span>{text || "—"}</span>;
  return (
    <a
      href={href}
      title={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {text || "Azure"}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </a>
  );
}

function getSafeResultUrl(value: string): string | null {
  const trimmed = (value ?? "").trim();
  if (
    !trimmed ||
    (/^[a-z][a-z\d+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed))
  )
    return null;
  try {
    const url = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}
