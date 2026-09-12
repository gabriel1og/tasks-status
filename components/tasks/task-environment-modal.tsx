"use client";

import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getEnvironmentAvailability } from "@/lib/task-environments";
import type {
  TagOptionRow,
  TaskStatusRow,
} from "@/types/database";
import type { TaskEnvironmentAvailability } from "@/lib/task-environments";

type TaskEnvironmentModalProps = {
  task: TaskStatusRow;
  environmentTags: TagOptionRow[];
  environmentAvailability: TaskEnvironmentAvailability;
  onClose: () => void;
  onToggleEnvironment?: (
    task: TaskStatusRow,
    environmentTag: TagOptionRow,
    available: boolean,
  ) => void;
};

export function TaskEnvironmentModal({
  task,
  environmentTags,
  environmentAvailability,
  onClose,
  onToggleEnvironment,
}: TaskEnvironmentModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-environments-title"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 id="task-environments-title" className="text-lg font-semibold">
              Ambientes da tarefa
            </h2>
            <p className="text-sm text-muted-foreground">{task.nome}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fechar ambientes da tarefa"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="divide-y rounded-md border">
          {environmentTags.length ? (
            environmentTags.map((tag) => (
              <EnvironmentStatusRow
                key={tag.id}
                task={task}
                environmentTag={tag}
                available={getEnvironmentAvailability(
                  environmentAvailability,
                  task.id,
                  tag.id,
                )}
                onToggleEnvironment={onToggleEnvironment}
              />
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nenhum ambiente cadastrado.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EnvironmentStatusRow({
  task,
  environmentTag,
  available,
  onToggleEnvironment,
}: {
  task: TaskStatusRow;
  environmentTag: TagOptionRow;
  available: boolean;
  onToggleEnvironment?: (
    task: TaskStatusRow,
    environmentTag: TagOptionRow,
    available: boolean,
  ) => void;
}) {
  const Icon = available ? Check : X;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm font-medium">{environmentTag.nome}</span>
      <Button
        type="button"
        variant="ghost"
        className={available ? "text-emerald-600" : "text-destructive"}
        disabled={!onToggleEnvironment}
        onClick={() => onToggleEnvironment?.(task, environmentTag, !available)}
      >
        <Icon className="h-4 w-4" />
        {available ? "Disponível" : "Indisponível"}
      </Button>
    </div>
  );
}
