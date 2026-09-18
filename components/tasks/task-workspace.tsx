"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import {
  CreateTaskModal,
  emptyTaskForm,
  getTaskFormState,
  type TaskFormState,
} from "@/components/tasks/task-form";
import { TaskTable } from "@/components/tasks/task-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildDefaultTags } from "@/lib/default-tags";
import { getRequestErrorFeedback } from "@/lib/request-feedback";
import { sanitizeTaskAreas } from "@/lib/task-areas";
import { sanitizeTaskGithubReferences } from "@/lib/task-github";
import { supabase } from "@/lib/supabase";
import type {
  SprintRow,
  TaskArea,
  TaskEnvironmentStatusInsert,
  TaskEnvironmentStatusRow,
  TagOptionRow,
  TaskStatusInsert,
  TaskStatusRow,
} from "@/types/database";

type TaskWorkspaceMode = "status" | "future";

const futureTaskInitialStatus = "To Do / Backlog";
const futureTaskInitialEnvironment = "Sem Ambiente";

export function TaskWorkspace({
  user,
  mode,
}: {
  user: User;
  mode: TaskWorkspaceMode;
}) {
  const [tasks, setTasks] = useState<TaskStatusRow[]>([]);
  const [taskEnvironmentStatuses, setTaskEnvironmentStatuses] = useState<
    TaskEnvironmentStatusRow[]
  >([]);
  const [tags, setTags] = useState<TagOptionRow[]>([]);
  const [sprints, setSprints] = useState<SprintRow[]>([]);
  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
  const [editTaskForm, setEditTaskForm] = useState<TaskFormState>(emptyTaskForm);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isFutureWorkspace = mode === "future";

  const statusTags = useMemo(
    () => tags.filter((tag) => tag.tipo === "status"),
    [tags],
  );
  const environmentTags = useMemo(
    () => tags.filter((tag) => tag.tipo === "ambiente"),
    [tags],
  );

  useEffect(() => {
    loadWorkspaceData(user.id, isFutureWorkspace);
  }, [isFutureWorkspace, user.id]);

  async function loadWorkspaceData(userId: string, isFuture: boolean) {
    setIsLoading(true);
    setFeedback("");

    const [loadedTags, loadedSprints, loadedTasks] = await Promise.all([
      loadTags(userId),
      loadSprints(userId),
      loadTasks(userId, isFuture),
    ]);
    const loadedEnvironmentStatuses = isFuture
      ? []
      : await loadTaskEnvironmentStatuses(
          userId,
          loadedTasks.map((task) => task.id),
        );

    setTags(loadedTags);
    setSprints(loadedSprints);
    setTasks(loadedTasks);
    setTaskEnvironmentStatuses(loadedEnvironmentStatuses);
    setIsLoading(false);
  }

  async function loadTags(userId: string) {
    const { data: tagRows, error } = await supabase
      .from("tag_options")
      .select("*")
      .eq("user_id", userId)
      .order("tipo")
      .order("nome");

    if (error) {
      setFeedback(
        getRequestErrorFeedback(
          "load_task_tags",
          error,
          "Não foi possível carregar as opções das tarefas.",
        ),
      );
      return [];
    }

    if (tagRows?.length) {
      return tagRows as TagOptionRow[];
    }

    const { data: createdTags, error: createError } = await supabase
      .from("tag_options")
      .insert(buildDefaultTags(userId))
      .select("*");

    if (createError) {
      setFeedback(
        getRequestErrorFeedback(
          "create_default_task_tags",
          createError,
          "Não foi possível preparar as opções iniciais das tarefas.",
        ),
      );
    }

    return (createdTags ?? []) as TagOptionRow[];
  }

  async function loadSprints(userId: string) {
    const { data: sprintRows, error } = await supabase
      .from("sprints")
      .select("*")
      .eq("user_id", userId)
      .order("data_inicio", { ascending: false });

    if (error) {
      setFeedback(
        getRequestErrorFeedback(
          "load_task_sprints",
          error,
          "Não foi possível carregar as sprints.",
        ),
      );
      return [];
    }

    return (sprintRows ?? []) as SprintRow[];
  }

  async function loadTasks(userId: string, isFuture: boolean) {
    const { data: taskRows, error } = await supabase
      .from("task_statuses")
      .select("*")
      .eq("user_id", userId)
      .eq("is_future", isFuture)
      .order("created_at", { ascending: false });

    if (error) {
      setFeedback(
        getRequestErrorFeedback(
          "load_tasks",
          error,
          "Não foi possível carregar as tarefas. Tente novamente em instantes.",
        ),
      );
      return [];
    }

    return (taskRows ?? []) as TaskStatusRow[];
  }

  async function loadTaskEnvironmentStatuses(userId: string, taskIds: string[]) {
    if (!taskIds.length) {
      return [];
    }

    const { data: environmentRows, error } = await supabase
      .from("task_environment_statuses")
      .select("*")
      .eq("user_id", userId)
      .in("task_id", taskIds);

    if (error) {
      setFeedback(
        getRequestErrorFeedback(
          "load_task_environment_statuses",
          error,
          "Não foi possível carregar a disponibilidade por ambiente.",
        ),
      );
      return [];
    }

    return (environmentRows ?? []) as TaskEnvironmentStatusRow[];
  }

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const createTaskForm = isFutureWorkspace
      ? {
          ...taskForm,
          status: futureTaskInitialStatus,
          ambiente: futureTaskInitialEnvironment,
        }
      : taskForm;
    const payload = buildTaskPayload(
      user.id,
      createTaskForm,
      sprints,
      statusTags,
      environmentTags,
      isFutureWorkspace,
    );
    const { data: createdTask, error } = await supabase
      .from("task_statuses")
      .insert(payload)
      .select("*")
      .single();

    setIsSaving(false);
    if (error) {
      setFeedback(
        getRequestErrorFeedback(
          "create_task",
          error,
          "Não foi possível criar a tarefa. Tente novamente.",
        ),
      );
      return;
    }

    const createdTaskRow = createdTask as TaskStatusRow;
    setTasks((currentTasks) => [createdTaskRow, ...currentTasks]);
    if (!isFutureWorkspace) {
      await markCurrentEnvironmentAsAvailable(createdTaskRow);
    }
    setTaskForm(emptyTaskForm);
    setIsCreateModalOpen(false);
  }

  async function updateTask() {
    if (!editingTaskId) {
      return;
    }

    setFeedback("");
    setIsSaving(true);
    const previousTask = tasks.find((task) => task.id === editingTaskId);
    const payload = buildTaskPayload(
      user.id,
      editTaskForm,
      sprints,
      statusTags,
      environmentTags,
      isFutureWorkspace,
    );
    const { user_id: _userId, ...taskChanges } = payload;
    const { data: updatedTask, error } = await supabase
      .from("task_statuses")
      .update(taskChanges)
      .eq("id", editingTaskId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    setIsSaving(false);
    if (error) {
      setFeedback(
        getRequestErrorFeedback(
          "update_task",
          error,
          "Não foi possível salvar as alterações da tarefa.",
        ),
      );
      return;
    }

    const updatedTaskRow = updatedTask as TaskStatusRow;
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === editingTaskId ? updatedTaskRow : task,
      ),
    );
    if (!isFutureWorkspace) {
      await removeStatusesFromDetachedAreas(previousTask, updatedTaskRow);
      await markCurrentEnvironmentAsAvailable(updatedTaskRow);
    }
    cancelTaskEdit();
  }

  async function removeStatusesFromDetachedAreas(
    previousTask: TaskStatusRow | undefined,
    updatedTask: TaskStatusRow,
  ) {
    const updatedAreas = sanitizeTaskAreas(updatedTask.areas);
    const removedAreas = sanitizeTaskAreas(previousTask?.areas).filter(
      (area) => !updatedAreas.includes(area),
    );
    if (!removedAreas.length) {
      return;
    }

    const { error } = await supabase
      .from("task_environment_area_statuses")
      .delete()
      .eq("user_id", user.id)
      .eq("task_id", updatedTask.id)
      .in("area", removedAreas as TaskArea[]);

    if (error) {
      setFeedback(
        getRequestErrorFeedback(
          "remove_detached_task_area_statuses",
          error,
          "A tarefa foi salva, mas os estados das áreas removidas não puderam ser limpos.",
        ),
      );
    }
  }

  async function deleteTask(taskId: string) {
    setFeedback("");
    const { error } = await supabase
      .from("task_statuses")
      .delete()
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) {
      setFeedback(
        getRequestErrorFeedback(
          "delete_task",
          error,
          "Não foi possível remover a tarefa.",
        ),
      );
      return;
    }

    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    setTaskEnvironmentStatuses((currentStatuses) =>
      currentStatuses.filter((status) => status.task_id !== taskId),
    );
  }

  async function toggleTaskEnvironment(
    task: TaskStatusRow,
    environmentTag: TagOptionRow,
    available: boolean,
  ) {
    setFeedback("");

    const payload: TaskEnvironmentStatusInsert = {
      user_id: user.id,
      task_id: task.id,
      environment_tag_id: environmentTag.id,
      available,
    };
    const { data: updatedEnvironmentStatus, error } = await supabase
      .from("task_environment_statuses")
      .upsert(payload, { onConflict: "task_id,environment_tag_id" })
      .select("*")
      .single();

    if (error) {
      setFeedback(
        getRequestErrorFeedback(
          "toggle_task_environment",
          error,
          "Não foi possível atualizar o ambiente da tarefa.",
        ),
      );
      return;
    }

    upsertTaskEnvironmentStatus(
      updatedEnvironmentStatus as TaskEnvironmentStatusRow,
    );
  }

  async function assignTaskToSprint(taskId: string, sprintId: string) {
    const sprint = sprints.find((currentSprint) => currentSprint.id === sprintId);
    if (!sprint) {
      setFeedback(`Sprint ${sprintId} não encontrada.`);
      return;
    }

    setFeedback("");
    const { error } = await supabase
      .from("task_statuses")
      .update({ sprint_id: sprint.id, sprint: sprint.nome, is_future: false })
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) {
      setFeedback(
        getRequestErrorFeedback(
          "assign_task_to_sprint",
          error,
          "Não foi possível associar a tarefa à sprint.",
        ),
      );
      return;
    }

    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreateTaskModal}>
          <Plus className="h-4 w-4" />
          {isFutureWorkspace ? "Nova tarefa futura" : "Nova tarefa"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isFutureWorkspace ? "Tarefas futuras" : "Tarefas acompanhadas"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feedback && !isCreateModalOpen ? (
            <p className="mb-4 text-sm text-destructive">{feedback}</p>
          ) : null}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando tarefas...</p>
          ) : (
            <TaskTable
              tasks={tasks}
              tags={tags}
              taskEnvironmentStatuses={taskEnvironmentStatuses}
              statusTags={statusTags}
              environmentTags={environmentTags}
              sprints={sprints}
              sprintCellMode={isFutureWorkspace ? "assign" : "editable"}
              showGithubInfo={!isFutureWorkspace}
              showAreaInfo={!isFutureWorkspace}
              showEnvironmentMonitor={!isFutureWorkspace}
              showSprintFilter={!isFutureWorkspace}
              emptyMessage={
                isFutureWorkspace
                  ? "Nenhuma tarefa futura cadastrada."
                  : "Nenhuma tarefa cadastrada."
              }
              editingTaskId={editingTaskId}
              editTaskForm={editTaskForm}
              isSaving={isSaving}
              onAssignSprint={assignTaskToSprint}
              onCancelEdit={cancelTaskEdit}
              onDelete={deleteTask}
              onEdit={startTaskEdit}
              onEditField={setEditTaskField}
              onToggleEnvironment={
                isFutureWorkspace ? undefined : toggleTaskEnvironment
              }
              onSaveEdit={updateTask}
            />
          )}
        </CardContent>
      </Card>

      {isCreateModalOpen ? (
        <CreateTaskModal
          environmentTags={environmentTags}
          feedback={feedback}
          isFutureTask={isFutureWorkspace}
          isSaving={isSaving}
          onClose={closeCreateTaskModal}
          onFieldChange={setTaskField}
          onSubmit={createTask}
          sprints={sprints}
          statusTags={statusTags}
          taskForm={taskForm}
        />
      ) : null}
    </div>
  );

  function setTaskField<Field extends keyof TaskFormState>(
    field: Field,
    value: TaskFormState[Field],
  ) {
    setTaskForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function setEditTaskField<Field extends keyof TaskFormState>(
    field: Field,
    value: TaskFormState[Field],
  ) {
    setEditTaskForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function openCreateTaskModal() {
    setFeedback("");
    setIsCreateModalOpen(true);
  }

  function closeCreateTaskModal() {
    if (isSaving) {
      return;
    }

    setFeedback("");
    setTaskForm(emptyTaskForm);
    setIsCreateModalOpen(false);
  }

  function startTaskEdit(task: TaskStatusRow) {
    setFeedback("");
    setEditingTaskId(task.id);
    setEditTaskForm(getTaskFormState(task, sprints));
  }

  function cancelTaskEdit() {
    setEditingTaskId(null);
    setEditTaskForm(emptyTaskForm);
  }

  async function markCurrentEnvironmentAsAvailable(task: TaskStatusRow) {
    const currentEnvironment = environmentTags.find(
      (tag) => tag.nome === task.ambiente,
    );
    if (!currentEnvironment) {
      return;
    }

    await toggleTaskEnvironment(task, currentEnvironment, true);
  }

  function upsertTaskEnvironmentStatus(status: TaskEnvironmentStatusRow) {
    setTaskEnvironmentStatuses((currentStatuses) => {
      const existingStatus = currentStatuses.find(
        (currentStatus) => currentStatus.id === status.id,
      );
      if (!existingStatus) {
        return [...currentStatuses, status];
      }

      return currentStatuses.map((currentStatus) =>
        currentStatus.id === status.id ? status : currentStatus,
      );
    });
  }
}

function buildTaskPayload(
  userId: string,
  form: TaskFormState,
  sprints: SprintRow[],
  statusTags: TagOptionRow[],
  environmentTags: TagOptionRow[],
  isFuture: boolean,
): TaskStatusInsert {
  const sprint = sprints.find((currentSprint) => currentSprint.id === form.sprint_id);

  return {
    user_id: userId,
    nome: form.nome,
    azure: form.azure,
    azure_url: form.azure_url,
    liveops_url: form.liveops_url,
    github_references: sanitizeTaskGithubReferences(form.github_references),
    areas: isFuture ? [] : sanitizeTaskAreas(form.areas),
    sprint_id: isFuture ? null : (sprint?.id ?? null),
    sprint: isFuture ? "" : (sprint?.nome ?? ""),
    is_future: isFuture,
    status: form.status || statusTags[0]?.nome || "",
    ambiente: form.ambiente || environmentTags[0]?.nome || "",
  };
}
