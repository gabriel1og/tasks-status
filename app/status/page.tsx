"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildDefaultTags } from "@/lib/default-tags";
import type { MockUser } from "@/lib/mock-auth";
import { supabase } from "@/lib/supabase";
import type {
  TagOptionRow,
  TaskStatusInsert,
  TaskStatusRow,
} from "@/types/database";

type TaskFormState = Pick<
  TaskStatusInsert,
  "nome" | "azure" | "sprint" | "status" | "ambiente"
>;

const emptyTaskForm: TaskFormState = {
  nome: "",
  azure: "",
  sprint: "",
  status: "",
  ambiente: "",
};

export default function StatusPage() {
  return (
    <AuthGuard>
      {(user) => (
        <AppShell title="Status das tarefas">
          <StatusDashboard user={user} />
        </AppShell>
      )}
    </AuthGuard>
  );
}

function StatusDashboard({ user }: { user: MockUser }) {
  const [tasks, setTasks] = useState<TaskStatusRow[]>([]);
  const [tags, setTags] = useState<TagOptionRow[]>([]);
  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskForm, setEditTaskForm] =
    useState<TaskFormState>(emptyTaskForm);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const statusTags = useMemo(
    () => tags.filter((tag) => tag.tipo === "status"),
    [tags],
  );
  const environmentTags = useMemo(
    () => tags.filter((tag) => tag.tipo === "ambiente"),
    [tags],
  );

  useEffect(() => {
    loadDashboardData(user.id);
  }, [user.id]);

  async function loadDashboardData(userId: string) {
    setIsLoading(true);

    const tagRows = await loadTags(userId);
    const { data: taskRows, error: tasksError } = await supabase
      .from("task_statuses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (tasksError) {
      setFeedback(tasksError.message);
    }

    setTags(tagRows);
    setTasks((taskRows ?? []) as TaskStatusRow[]);
    setIsLoading(false);
  }

  async function loadTags(userId: string) {
    const { data: tagRows, error: tagsError } = await supabase
      .from("tag_options")
      .select("*")
      .eq("user_id", userId)
      .order("tipo")
      .order("nome");

    if (tagsError) {
      setFeedback(tagsError.message);
      return [];
    }

    if (tagRows?.length) {
      return tagRows as TagOptionRow[];
    }

    const { data: createdTags } = await supabase
      .from("tag_options")
      .insert(buildDefaultTags(userId))
      .select("*");

    return (createdTags ?? []) as TagOptionRow[];
  }

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const payload: TaskStatusInsert = {
      user_id: user.id,
      ...taskForm,
      status: taskForm.status || statusTags[0]?.nome || "",
      ambiente: taskForm.ambiente || environmentTags[0]?.nome || "",
    };

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
  }

  async function updateTask() {
    if (!editingTaskId) {
      return;
    }

    setFeedback("");
    setIsSaving(true);

    const payload: TaskFormState = {
      ...editTaskForm,
      status: editTaskForm.status || statusTags[0]?.nome || "",
      ambiente: editTaskForm.ambiente || environmentTags[0]?.nome || "",
    };

    const { data: updatedTask, error } = await supabase
      .from("task_statuses")
      .update(payload)
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
    const { error } = await supabase
      .from("task_statuses")
      .delete()
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) {
      setFeedback(error.message);
      return;
    }

    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId),
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova tarefa</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-6" onSubmit={createTask}>
            <Field label="Nome">
              <Input
                value={taskForm.nome}
                onChange={(event) => setTaskField("nome", event.target.value)}
                required
              />
            </Field>
            <Field label="Azure">
              <Input
                value={taskForm.azure}
                onChange={(event) => setTaskField("azure", event.target.value)}
                placeholder="#12345"
              />
            </Field>
            <Field label="Sprint">
              <Input
                value={taskForm.sprint}
                onChange={(event) => setTaskField("sprint", event.target.value)}
              />
            </Field>
            <SelectField
              label="Status"
              value={taskForm.status}
              options={statusTags}
              onChange={(value) => setTaskField("status", value)}
            />
            <SelectField
              label="Ambiente"
              value={taskForm.ambiente}
              options={environmentTags}
              onChange={(value) => setTaskField("ambiente", value)}
            />
            <div className="flex items-end">
              <Button className="w-full" disabled={isSaving}>
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </form>
          {feedback ? (
            <p className="mt-4 text-sm text-destructive">{feedback}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tarefas acompanhadas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Carregando tarefas...
            </p>
          ) : (
            <TaskTable
              tasks={tasks}
              tags={tags}
              statusTags={statusTags}
              environmentTags={environmentTags}
              editingTaskId={editingTaskId}
              editTaskForm={editTaskForm}
              isSaving={isSaving}
              onCancelEdit={cancelTaskEdit}
              onDelete={deleteTask}
              onEdit={startTaskEdit}
              onEditField={setEditTaskField}
              onSaveEdit={updateTask}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );

  function setTaskField(field: keyof TaskFormState, value: string) {
    setTaskForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function setEditTaskField(field: keyof TaskFormState, value: string) {
    setEditTaskForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function startTaskEdit(task: TaskStatusRow) {
    setFeedback("");
    setEditingTaskId(task.id);
    setEditTaskForm(getTaskFormState(task));
  }

  function cancelTaskEdit() {
    setEditingTaskId(null);
    setEditTaskForm(emptyTaskForm);
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: TagOptionRow[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        className={selectInputClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Selecione</option>
        {options.map((option) => (
          <option key={option.id} value={option.nome}>
            {option.nome}
          </option>
        ))}
      </select>
    </Field>
  );
}

const selectInputClassName =
  "h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function TaskTable({
  tasks,
  tags,
  statusTags,
  environmentTags,
  editingTaskId,
  editTaskForm,
  isSaving,
  onCancelEdit,
  onDelete,
  onEdit,
  onEditField,
  onSaveEdit,
}: {
  tasks: TaskStatusRow[];
  tags: TagOptionRow[];
  statusTags: TagOptionRow[];
  environmentTags: TagOptionRow[];
  editingTaskId: string | null;
  editTaskForm: TaskFormState;
  isSaving: boolean;
  onCancelEdit: () => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: TaskStatusRow) => void;
  onEditField: (field: keyof TaskFormState, value: string) => void;
  onSaveEdit: () => void;
}) {
  if (!tasks.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma tarefa cadastrada.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Azure</TableHead>
          <TableHead>Sprint</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ambiente</TableHead>
          <TableHead className="w-28" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) =>
          task.id === editingTaskId ? (
            <EditableTaskRow
              key={task.id}
              task={task}
              editTaskForm={editTaskForm}
              environmentTags={environmentTags}
              isSaving={isSaving}
              onCancelEdit={onCancelEdit}
              onEditField={onEditField}
              onSaveEdit={onSaveEdit}
              statusTags={statusTags}
            />
          ) : (
            <ReadonlyTaskRow
              key={task.id}
              task={task}
              tags={tags}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ),
        )}
      </TableBody>
    </Table>
  );
}

function EditableTaskRow({
  task,
  editTaskForm,
  environmentTags,
  isSaving,
  onCancelEdit,
  onEditField,
  onSaveEdit,
  statusTags,
}: {
  task: TaskStatusRow;
  editTaskForm: TaskFormState;
  environmentTags: TagOptionRow[];
  isSaving: boolean;
  onCancelEdit: () => void;
  onEditField: (field: keyof TaskFormState, value: string) => void;
  onSaveEdit: () => void;
  statusTags: TagOptionRow[];
}) {
  return (
    <TableRow>
      <TableCell>
        <Input
          value={editTaskForm.nome}
          onChange={(event) => onEditField("nome", event.target.value)}
          required
        />
      </TableCell>
      <TableCell>
        <Input
          value={editTaskForm.azure}
          onChange={(event) => onEditField("azure", event.target.value)}
          placeholder="#12345"
        />
      </TableCell>
      <TableCell>
        <Input
          value={editTaskForm.sprint}
          onChange={(event) => onEditField("sprint", event.target.value)}
        />
      </TableCell>
      <TableCell>
        <SelectInput
          value={editTaskForm.status}
          options={statusTags}
          onChange={(value) => onEditField("status", value)}
        />
      </TableCell>
      <TableCell>
        <SelectInput
          value={editTaskForm.ambiente}
          options={environmentTags}
          onChange={(value) => onEditField("ambiente", value)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSaveEdit}
            disabled={isSaving || !editTaskForm.nome}
            aria-label={`Salvar ${task.nome}`}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancelEdit}
            aria-label={`Cancelar edicao de ${task.nome}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ReadonlyTaskRow({
  task,
  tags,
  onDelete,
  onEdit,
}: {
  task: TaskStatusRow;
  tags: TagOptionRow[];
  onDelete: (taskId: string) => void;
  onEdit: (task: TaskStatusRow) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{task.nome}</TableCell>
      <TableCell>{task.azure || "-"}</TableCell>
      <TableCell>{task.sprint || "-"}</TableCell>
      <TableCell>
        <TagBadge name={task.status} tags={tags} />
      </TableCell>
      <TableCell>
        <TagBadge name={task.ambiente} tags={tags} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(task)}
            aria-label={`Editar ${task.nome}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(task.id)}
            aria-label={`Remover ${task.nome}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function SelectInput({
  value,
  options,
  onChange,
}: {
  value: string;
  options: TagOptionRow[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      className={selectInputClassName}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Selecione</option>
      {options.map((option) => (
        <option key={option.id} value={option.nome}>
          {option.nome}
        </option>
      ))}
    </select>
  );
}

function TagBadge({ name, tags }: { name: string; tags: TagOptionRow[] }) {
  const matchingTag = tags.find((tag) => tag.nome === name);

  return (
    <span
      className="inline-flex rounded-md px-2 py-1 text-xs font-medium text-white"
      style={{ backgroundColor: matchingTag?.cor ?? "#475569" }}
    >
      {name || "-"}
    </span>
  );
}

function getTaskFormState(task: TaskStatusRow): TaskFormState {
  return {
    nome: task.nome,
    azure: task.azure,
    sprint: task.sprint,
    status: task.status,
    ambiente: task.ambiente,
  };
}
