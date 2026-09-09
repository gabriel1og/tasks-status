"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

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
import type { MockUser } from "@/lib/mock-auth";
import { supabase } from "@/lib/supabase";
import type {
  SprintRow,
  TagOptionRow,
  TaskStatusInsert,
  TaskStatusRow,
} from "@/types/database";

type TaskWorkspaceMode = "status" | "future";

export function TaskWorkspace({
  user,
  mode,
}: {
  user: MockUser;
  mode: TaskWorkspaceMode;
}) {
  const [tasks, setTasks] = useState<TaskStatusRow[]>([]);
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

    setTags(loadedTags);
    setSprints(loadedSprints);
    setTasks(loadedTasks);
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
      setFeedback(error.message);
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
      setFeedback(createError.message);
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
      setFeedback(error.message);
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
      setFeedback(error.message);
      return [];
    }

    return (taskRows ?? []) as TaskStatusRow[];
  }

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const payload = buildTaskPayload(
      user.id,
      taskForm,
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
      setFeedback(error.message);
      return;
    }

    setTasks((currentTasks) => [createdTask as TaskStatusRow, ...currentTasks]);
    setTaskForm(emptyTaskForm);
    setIsCreateModalOpen(false);
  }

  async function updateTask() {
    if (!editingTaskId) {
      return;
    }

    setFeedback("");
    setIsSaving(true);
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
      setFeedback(error.message);
      return;
    }

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === editingTaskId ? (updatedTask as TaskStatusRow) : task,
      ),
    );
    cancelTaskEdit();
  }

  async function deleteTask(taskId: string) {
    setFeedback("");
    const { error } = await supabase
      .from("task_statuses")
      .delete()
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) {
      setFeedback(error.message);
      return;
    }

    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
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
      setFeedback(error.message);
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
              statusTags={statusTags}
              environmentTags={environmentTags}
              sprints={sprints}
              sprintCellMode={isFutureWorkspace ? "assign" : "editable"}
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

  function setTaskField(field: keyof TaskFormState, value: string | null) {
    setTaskForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function setEditTaskField(field: keyof TaskFormState, value: string | null) {
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
    sprint_id: isFuture ? null : (sprint?.id ?? null),
    sprint: isFuture ? "" : (sprint?.nome ?? ""),
    is_future: isFuture,
    status: form.status || statusTags[0]?.nome || "",
    ambiente: form.ambiente || environmentTags[0]?.nome || "",
  };
}
