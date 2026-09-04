"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

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
import { supabase } from "@/lib/supabase";
import type { TagOptionRow, TaskStatusInsert, TaskStatusRow } from "@/types/database";

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

function StatusDashboard({ user }: { user: User }) {
  const [tasks, setTasks] = useState<TaskStatusRow[]>([]);
  const [tags, setTags] = useState<TagOptionRow[]>([]);
  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
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

  async function deleteTask(taskId: string) {
    const { error } = await supabase.from("task_statuses").delete().eq("id", taskId);

    if (error) {
      setFeedback(error.message);
      return;
    }

    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
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
                placeholder="AB#12345"
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
          {feedback ? <p className="mt-4 text-sm text-destructive">{feedback}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tarefas acompanhadas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando tarefas...</p>
          ) : (
            <TaskTable tasks={tasks} tags={tags} onDelete={deleteTask} />
          )}
        </CardContent>
      </Card>
    </div>
  );

  function setTaskField(field: keyof TaskFormState, value: string) {
    setTaskForm((currentForm) => ({ ...currentForm, [field]: value }));
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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
        className="h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

function TaskTable({
  tasks,
  tags,
  onDelete,
}: {
  tasks: TaskStatusRow[];
  tags: TagOptionRow[];
  onDelete: (taskId: string) => void;
}) {
  if (!tasks.length) {
    return <p className="text-sm text-muted-foreground">Nenhuma tarefa cadastrada.</p>;
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
          <TableHead className="w-16" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(task.id)}
                aria-label={`Remover ${task.nome}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
