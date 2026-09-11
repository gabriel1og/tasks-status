"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { selectInputClassName } from "@/components/tasks/task-form";
import { TaskTable } from "@/components/tasks/task-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getRequestErrorFeedback } from "@/lib/request-feedback";
import { supabase } from "@/lib/supabase";
import type { SprintRow, TagOptionRow, TaskStatusRow } from "@/types/database";

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
  const [tags, setTags] = useState<TagOptionRow[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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

    const error = sprintResult.error ?? taskResult.error ?? tagResult.error;
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
    setTasks((taskResult.data ?? []) as TaskStatusRow[]);
    setTags((tagResult.data ?? []) as TagOptionRow[]);
    setSelectedSprintId(findDefaultSprint(sprintRows)?.id ?? "");
    setIsLoading(false);
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
              disabled={!sprints.length}
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

function getLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatSprintPeriod(sprint: SprintRow) {
  return `${formatDate(sprint.data_inicio)} a ${formatDate(sprint.data_fim)}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${date}T00:00:00`));
}
