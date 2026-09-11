"use client";

import { useEffect } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  SprintRow,
  TagOptionRow,
  TaskStatusInsert,
  TaskStatusRow,
} from "@/types/database";

export type TaskFormState = Pick<
  TaskStatusInsert,
  | "nome"
  | "azure"
  | "azure_url"
  | "liveops_url"
  | "sprint_id"
  | "status"
  | "ambiente"
>;

export const emptyTaskForm: TaskFormState = {
  nome: "",
  azure: "",
  azure_url: "",
  liveops_url: "",
  sprint_id: null,
  status: "",
  ambiente: "",
};

export const selectInputClassName =
  "h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type CreateTaskModalProps = {
  environmentTags: TagOptionRow[];
  feedback: string;
  isFutureTask: boolean;
  isSaving: boolean;
  onClose: () => void;
  onFieldChange: (field: keyof TaskFormState, value: string | null) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  sprints: SprintRow[];
  statusTags: TagOptionRow[];
  taskForm: TaskFormState;
};

export function CreateTaskModal({
  environmentTags,
  feedback,
  isFutureTask,
  isSaving,
  onClose,
  onFieldChange,
  onSubmit,
  sprints,
  statusTags,
  taskForm,
}: CreateTaskModalProps) {
  useEffect(() => {
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
      aria-labelledby="create-task-title"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="create-task-title" className="text-lg font-semibold">
            {isFutureTask ? "Nova tarefa futura" : "Nova tarefa"}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Fechar modal de nova tarefa"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TaskTextField
              label="Nome"
              value={taskForm.nome}
              onChange={(value) => onFieldChange("nome", value)}
              required
              autoFocus
            />
            <TaskTextField
              label="Azure"
              value={taskForm.azure}
              onChange={(value) => onFieldChange("azure", value)}
              placeholder="#12345"
            />
            <TaskTextField
              label="Link Azure"
              value={taskForm.azure_url}
              onChange={(value) => onFieldChange("azure_url", value)}
              placeholder="https://dev.azure.com/..."
            />
            <TaskTextField
              label="LiveOps"
              value={taskForm.liveops_url}
              onChange={(value) => onFieldChange("liveops_url", value)}
              placeholder="https://..."
            />
            {!isFutureTask ? (
              <SprintSelectField
                label="Sprint"
                value={taskForm.sprint_id}
                sprints={sprints}
                onChange={(value) => onFieldChange("sprint_id", value)}
              />
            ) : null}
            {!isFutureTask ? (
              <>
                <TagSelectField
                  label="Status"
                  value={taskForm.status}
                  options={statusTags}
                  onChange={(value) => onFieldChange("status", value)}
                />
                <TagSelectField
                  label="Ambiente"
                  value={taskForm.ambiente}
                  options={environmentTags}
                  onChange={(value) => onFieldChange("ambiente", value)}
                />
              </>
            ) : null}
          </div>

          {feedback ? (
            <p className="text-sm text-destructive">{feedback}</p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !taskForm.nome}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function TagSelectField({
  label,
  value,
  options,
  placeholder = "Selecione",
  onChange,
}: {
  label: string;
  value: string;
  options: TagOptionRow[];
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        className={selectInputClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.nome}>
            {option.nome}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function SprintSelectField({
  label,
  value,
  sprints,
  placeholder = "Sem sprint",
  onChange,
}: {
  label: string;
  value: string | null;
  sprints: SprintRow[];
  placeholder?: string;
  onChange: (value: string | null) => void;
}) {
  const sprintSelect = (
    <select
      className={selectInputClassName}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || null)}
    >
      <option value="">{placeholder}</option>
      {sprints.map((sprint) => (
        <option key={sprint.id} value={sprint.id}>
          {sprint.nome}
        </option>
      ))}
    </select>
  );

  return label ? <Field label={label}>{sprintSelect}</Field> : sprintSelect;
}

export function getTaskFormState(
  task: TaskStatusRow,
  sprints: SprintRow[],
): TaskFormState {
  const matchingSprint = sprints.find((sprint) => sprint.nome === task.sprint);

  return {
    nome: task.nome,
    azure: task.azure,
    azure_url: task.azure_url || "",
    liveops_url: task.liveops_url || "",
    sprint_id: task.sprint_id ?? matchingSprint?.id ?? null,
    status: task.status,
    ambiente: task.ambiente,
  };
}

function TaskTextField({
  label,
  value,
  onChange,
  ...inputProps
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Pick<React.ComponentProps<typeof Input>, "autoFocus" | "placeholder" | "required">) {
  return (
    <Field label={label}>
      <Input
        {...inputProps}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}
