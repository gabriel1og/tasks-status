"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";

import { TaskGithubCell } from "@/components/tasks/task-github-cell";
import { Button } from "@/components/ui/button";
import { getExternalHref } from "@/lib/external-url";
import { sanitizeTaskAreas, TASK_AREA_LABELS } from "@/lib/task-areas";
import type { TagOptionRow, TaskStatusRow } from "@/types/database";

type TaskInfoModalProps = {
  task: TaskStatusRow;
  tags: TagOptionRow[];
  onClose: () => void;
};

/** Exibe os detalhes operacionais da tarefa. Exemplo: <TaskInfoModal task={task} tags={tags} onClose={close} />. */
export function TaskInfoModal({ task, tags, onClose }: TaskInfoModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-info-title"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg border bg-card p-6 text-card-foreground shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 id="task-info-title" className="text-lg font-semibold">
              Informações da tarefa
            </h2>
            <p className="text-sm text-muted-foreground">{task.nome}</p>
          </div>
          <Button
            ref={closeButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fechar informações da tarefa"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <dl className="divide-y rounded-md border">
          <TaskInfoRow label="Azure">
            <TaskReference text={task.azure} url={task.azure_url} />
          </TaskInfoRow>
          <TaskInfoRow label="LiveOps">
            <TaskReference
              text={task.liveops_url ? "Abrir LiveOps" : ""}
              url={task.liveops_url}
            />
          </TaskInfoRow>
          <TaskInfoRow label="GitHub">
            <TaskGithubCell
              nome={task.nome}
              references={task.github_references}
            />
          </TaskInfoRow>
          <TaskInfoRow
            label="Áreas"
            value={
              sanitizeTaskAreas(task.areas).length
                ? sanitizeTaskAreas(task.areas)
                    .map((area) => TASK_AREA_LABELS[area])
                    .join(" + ")
                : "Não definidas"
            }
          />
          <TaskInfoRow label="Sprint" value={task.sprint || "Sem sprint"} />
          <TaskInfoRow label="Status">
            <TaskTagBadge name={task.status} tags={tags} />
          </TaskInfoRow>
          <TaskInfoRow label="Ambiente">
            <TaskTagBadge name={task.ambiente} tags={tags} />
          </TaskInfoRow>
        </dl>
      </div>
    </div>
  );
}

function TaskInfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[120px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">{children ?? value ?? "-"}</dd>
    </div>
  );
}

function TaskReference({ text, url }: { text: string; url: string }) {
  const href = getExternalHref(url);

  if (!href) {
    return <span>{text || "Não informado"}</span>;
  }

  return (
    <a
      className="inline-flex items-center gap-2 font-medium text-primary underline-offset-4 hover:underline"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {text || "Abrir link"}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function TaskTagBadge({
  name,
  tags,
}: {
  name: string;
  tags: TagOptionRow[];
}) {
  const tag = tags.find((currentTag) => currentTag.nome === name);

  return (
    <span
      className="inline-flex rounded-md px-2 py-1 text-xs font-medium text-white"
      style={{ backgroundColor: tag?.cor ?? "#475569" }}
    >
      {name || "Não informado"}
    </span>
  );
}
