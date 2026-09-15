import { GitBranch, GitPullRequest, Plus, Trash2 } from "lucide-react";

import type {
  TaskFormChangeHandler,
  TaskFormState,
} from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getExternalHref } from "@/lib/external-url";
import {
  createEmptyTaskGithubReference,
  sanitizeTaskGithubReferences,
} from "@/lib/task-github";
import type { TaskGithubReference } from "@/types/database";

type TaskGithubCellProps = {
  nome: string;
  references: TaskGithubReference[];
};

/** Displays every branch and PR for a task, e.g. <TaskGithubCell nome="Task" references={references} />. */
export function TaskGithubCell({ nome, references }: TaskGithubCellProps) {
  const githubReferences = sanitizeTaskGithubReferences(references);
  if (!githubReferences.length) return <span>-</span>;

  return (
    <div className="min-w-44 space-y-2 text-sm">
      {githubReferences.map((reference, index) => (
        <GithubReference key={`${reference.branch}-${reference.pr_url}-${index}`}>
          {reference.branch ? (
            <div className="flex max-w-52 items-center gap-2" title={reference.branch}>
              <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{reference.branch}</span>
            </div>
          ) : null}
          {reference.pr_url ? (
            <GithubPrLink
              nome={nome}
              position={index + 1}
              total={githubReferences.length}
              url={reference.pr_url}
            />
          ) : null}
        </GithubReference>
      ))}
    </div>
  );
}

/** Edits a task's GitHub collection, e.g. <TaskGithubFields references={references} onChange={setReferences} />. */
export function TaskGithubFields({
  references,
  onChange,
}: {
  references: TaskGithubReference[];
  onChange: (references: TaskGithubReference[]) => void;
}) {
  const editableReferences = references.length
    ? references
    : [createEmptyTaskGithubReference()];

  return (
    <div className="space-y-3">
      {editableReferences.map((reference, index) => (
        <div
          key={index}
          className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <Input
            value={reference.branch}
            onChange={(event) => updateReference(index, "branch", event.target.value)}
            placeholder="feature/nome-da-branch"
            aria-label={`Branch do GitHub ${index + 1}`}
          />
          <Input
            value={reference.pr_url}
            onChange={(event) => updateReference(index, "pr_url", event.target.value)}
            placeholder="https://github.com/.../pull/123"
            aria-label={`Link da PR ${index + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeReference(index)}
            aria-label={`Remover referência do GitHub ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...editableReferences, createEmptyTaskGithubReference()])}
      >
        <Plus className="h-4 w-4" />
        Adicionar branch/PR
      </Button>
    </div>
  );

  function updateReference(
    index: number,
    field: keyof TaskGithubReference,
    value: string,
  ) {
    onChange(
      editableReferences.map((reference, position) =>
        position === index ? { ...reference, [field]: value } : reference,
      ),
    );
  }

  function removeReference(index: number) {
    const remainingReferences = editableReferences.filter(
      (_, position) => position !== index,
    );
    onChange(
      remainingReferences.length
        ? remainingReferences
        : [createEmptyTaskGithubReference()],
    );
  }
}

/** Connects collection editing to the shared task form. */
export function EditableTaskGithubCell({
  taskForm,
  onEditField,
}: {
  taskForm: TaskFormState;
  onEditField: TaskFormChangeHandler;
}) {
  return (
    <div className="min-w-96">
      <TaskGithubFields
        references={taskForm.github_references}
        onChange={(references) => onEditField("github_references", references)}
      />
    </div>
  );
}

function GithubReference({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5 border-l-2 border-border pl-2">{children}</div>;
}

function GithubPrLink({
  nome,
  position,
  total,
  url,
}: {
  nome: string;
  position: number;
  total: number;
  url: string;
}) {
  const href = getExternalHref(url);
  if (!href) return null;

  return (
    <a
      className="inline-flex items-center gap-2 font-medium text-primary underline-offset-4 hover:underline"
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Ver PR ${position} do GitHub de ${nome}`}
    >
      <GitPullRequest className="h-4 w-4" />
      {total > 1 ? `Ver PR ${position}` : "Ver PR"}
    </a>
  );
}
