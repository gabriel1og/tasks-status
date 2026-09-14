import { GitBranch, GitPullRequest } from "lucide-react";

import type { TaskFormState } from "@/components/tasks/task-form";
import { Input } from "@/components/ui/input";
import { getExternalHref } from "@/lib/external-url";
import type { TaskStatusRow } from "@/types/database";

type TaskGithubCellProps = Pick<
  TaskStatusRow,
  "nome" | "github_branch" | "github_pr_url"
>;

export function TaskGithubCell({
  nome,
  github_branch: githubBranch,
  github_pr_url: githubPrUrl,
}: TaskGithubCellProps) {
  const githubPrHref = getExternalHref(githubPrUrl);

  if (!githubBranch && !githubPrHref) {
    return <span>-</span>;
  }

  return (
    <div className="min-w-40 space-y-1.5 text-sm">
      {githubBranch ? (
        <div className="flex max-w-52 items-center gap-2" title={githubBranch}>
          <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{githubBranch}</span>
        </div>
      ) : null}
      {githubPrHref ? (
        <a
          className="inline-flex items-center gap-2 font-medium text-primary underline-offset-4 hover:underline"
          href={githubPrHref}
          target="_blank"
          rel="noreferrer"
          aria-label={`Ver PR do GitHub de ${nome}`}
        >
          <GitPullRequest className="h-4 w-4" />
          Ver PR
        </a>
      ) : null}
    </div>
  );
}

export function EditableTaskGithubCell({
  taskForm,
  onEditField,
}: {
  taskForm: TaskFormState;
  onEditField: (field: keyof TaskFormState, value: string | null) => void;
}) {
  return (
    <div className="min-w-48 space-y-2">
      <Input
        value={taskForm.github_branch}
        onChange={(event) => onEditField("github_branch", event.target.value)}
        placeholder="Nome da branch"
        aria-label="Nome da branch do GitHub"
      />
      <Input
        value={taskForm.github_pr_url}
        onChange={(event) => onEditField("github_pr_url", event.target.value)}
        placeholder="Link da PR"
        aria-label="Link da PR no GitHub"
      />
    </div>
  );
}
