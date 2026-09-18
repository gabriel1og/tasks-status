"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { SprintAdditionalInfoCard } from "@/components/sprints/sprint-additional-info-card";
import { selectInputClassName } from "@/components/tasks/task-form";
import { TaskTable } from "@/components/tasks/task-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { getRequestErrorFeedback } from "@/lib/request-feedback";
import { getLocalDateKey } from "@/lib/sprint-hub";
import { supabase } from "@/lib/supabase";
import type {
  SprintAdditionalInfoUpdate,
  SprintRow,
  TagOptionRow,
  TaskEnvironmentStatusRow,
  TaskStatusRow,
} from "@/types/database";

export default function SprintsPage() {
  return (
    <AuthGuard>
      {(user) => (
        <AppShell title="Sprints">
          <SprintDashboard user={user} />
        </AppShell>
      )}
    </AuthGuard>
  );
}

function SprintDashboard({ user }: { user: User }) {
  const [sprints, setSprints] = useState<SprintRow[]>([]);
  const [tasks, setTasks] = useState<TaskStatusRow[]>([]);
  const [taskEnvironmentStatuses, setTaskEnvironmentStatuses] = useState<
    TaskEnvironmentStatusRow[]
  >([]);
  const [tags, setTags] = useState<TagOptionRow[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingSprintInfo, setIsEditingSprintInfo] = useState(false);

  const selectedSprint = useMemo(
    () => sprints.find((sprint) => sprint.id === selectedSprintId),
    [selectedSprintId, sprints],
  );
  const sprintTasks = useMemo(
    () => tasks.filter((task) => belongsToSprint(task, selectedSprint)),
    [selectedSprint, tasks],
  );
  const statusTags = useMemo(
    () => tags.filter((tag) => tag.tipo === "status"),
    [tags],
  );
  const environmentTags = useMemo(
    () => tags.filter((tag) => tag.tipo === "ambiente"),
    [tags],
  );

  useEffect(() => {
    loadSprintDashboard(user.id);
  }, [user.id]);

  async function loadSprintDashboard(userId: string) {
    setIsLoading(true);
    setFeedback("");

    const [sprintResult, taskResult, tagResult] = await Promise.all([
      supabase
        .from("sprints")
        .select("*")
        .eq("user_id", userId)
        .order("data_inicio", { ascending: false }),
      supabase
        .from("task_statuses")
        .select("*")
        .eq("user_id", userId)
        .eq("is_future", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("tag_options")
        .select("*")
        .eq("user_id", userId)
        .order("tipo")
        .order("nome"),
    ]);

    const taskRows = (taskResult.data ?? []) as TaskStatusRow[];
    const environmentStatusResult = await loadTaskEnvironmentStatuses(
      userId,
      taskRows.map((task) => task.id),
    );

    const error =
      sprintResult.error ??
      taskResult.error ??
      tagResult.error ??
      environmentStatusResult.error;
    if (error) {
      setFeedback(
        getRequestErrorFeedback(
          "load_sprint_dashboard",
          error,
          "Não foi possível carregar os dados da sprint. Tente novamente em instantes.",
        ),
      );
    }

    const sprintRows = (sprintResult.data ?? []) as SprintRow[];
    setSprints(sprintRows);
    setTasks(taskRows);
    setTaskEnvironmentStatuses(environmentStatusResult.rows);
    setTags((tagResult.data ?? []) as TagOptionRow[]);
    setSelectedSprintId(findDefaultSprint(sprintRows)?.id ?? "");
    setIsLoading(false);
  }

  async function loadTaskEnvironmentStatuses(userId: string, taskIds: string[]) {
    if (!taskIds.length) {
      return { rows: [], error: null };
    }

    const { data: environmentRows, error } = await supabase
      .from("task_environment_statuses")
      .select("*")
      .eq("user_id", userId)
      .in("task_id", taskIds);

    return {
      rows: (environmentRows ?? []) as TaskEnvironmentStatusRow[],
      error,
    };
  }

  async function saveSprintAdditionalInfo(
    values: SprintAdditionalInfoUpdate,
  ): Promise<string> {
    if (!selectedSprint) return "Selecione uma sprint antes de salvar.";
    const { data: updatedSprint, error } = await supabase
      .from("sprints")
      .update(values)
      .eq("id", selectedSprint.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      return getRequestErrorFeedback(
        "update_sprint_additional_info",
        error,
        "Não foi possível salvar as informações da sprint.",
      );
    }

    setSprints((currentSprints) =>
      currentSprints.map((sprint) =>
        sprint.id === selectedSprint.id ? (updatedSprint as SprintRow) : sprint,
      ),
    );
    return "";
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="space-y-1">
            <CardTitle>Tarefas da sprint</CardTitle>
            {selectedSprint ? (
              <p className="text-sm text-muted-foreground">
                {formatSprintPeriod(selectedSprint)}
              </p>
            ) : null}
          </div>
          <div className="w-full space-y-2 md:w-72">
            <Label htmlFor="sprint-selector">Sprint visualizada</Label>
            <select
              id="sprint-selector"
              className={selectInputClassName}
              value={selectedSprintId}
              onChange={(event) => setSelectedSprintId(event.target.value)}
              disabled={!sprints.length || isEditingSprintInfo}
            >
              {!sprints.length ? (
                <option value="">Nenhuma sprint cadastrada</option>
              ) : null}
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.nome}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {feedback ? (
            <p className="mb-4 text-sm text-destructive">{feedback}</p>
          ) : null}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Carregando sprint...
            </p>
          ) : selectedSprint ? (
            <TaskTable
              tasks={sprintTasks}
              tags={tags}
              taskEnvironmentStatuses={taskEnvironmentStatuses}
              statusTags={statusTags}
              environmentTags={environmentTags}
              sprints={sprints}
              sprintCellMode="readonly"
              showSprintFilter={false}
              emptyMessage="Nenhuma tarefa associada a esta sprint."
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Cadastre uma sprint em Configurações para começar.
            </p>
          )}
        </CardContent>
      </Card>
      <SprintAdditionalInfoCard
        sprint={selectedSprint}
        tasks={sprintTasks}
        tags={tags}
        onEditingChange={setIsEditingSprintInfo}
        onSave={saveSprintAdditionalInfo}
      />
    </div>
  );
}

function belongsToSprint(task: TaskStatusRow, sprint?: SprintRow) {
  if (!sprint) {
    return false;
  }

  return (
    task.sprint_id === sprint.id ||
    (!task.sprint_id && task.sprint === sprint.nome)
  );
}

function findDefaultSprint(sprints: SprintRow[]) {
  const today = getLocalDateKey();
  const currentSprint = sprints.find(
    (sprint) => sprint.data_inicio <= today && sprint.data_fim >= today,
  );

  if (currentSprint) {
    return currentSprint;
  }

  const upcomingSprints = sprints
    .filter((sprint) => sprint.data_inicio > today)
    .sort((left, right) => left.data_inicio.localeCompare(right.data_inicio));
  return upcomingSprints[0] ?? sprints[0];
}

function formatSprintPeriod(sprint: SprintRow) {
  return `${formatDate(sprint.data_inicio)} a ${formatDate(sprint.data_fim)}`;
}
