"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

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

type TaskFilterState = TaskFormState & {
  query: string;
};

type SortField = "sprint" | "status" | "ambiente";

type SortDirection = "asc" | "desc";

type SortState = {
  field: SortField;
  direction: SortDirection;
} | null;

const emptyTaskForm: TaskFormState = {
  nome: "",
  azure: "",
  sprint: "",
  status: "",
  ambiente: "",
};

const emptyTaskFilters: TaskFilterState = {
  ...emptyTaskForm,
  query: "",
};

const taskFieldLabels: Record<keyof TaskFormState, string> = {
  nome: "Nome",
  azure: "Azure",
  sprint: "Sprint",
  status: "Status",
  ambiente: "Ambiente",
};

const taskSortLabels: Record<SortField, string> = {
  sprint: "Sprint",
  status: "Status",
  ambiente: "Ambiente",
};

const taskCollator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
    setIsCreateModalOpen(false);
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
      <div className="flex justify-end">
        <Button type="button" onClick={openCreateTaskModal}>
          <Plus className="h-4 w-4" />
          Nova tarefa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tarefas acompanhadas</CardTitle>
        </CardHeader>
        <CardContent>
          {feedback && !isCreateModalOpen ? (
            <p className="mb-4 text-sm text-destructive">{feedback}</p>
          ) : null}
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

      {isCreateModalOpen ? (
        <CreateTaskModal
          environmentTags={environmentTags}
          feedback={feedback}
          isSaving={isSaving}
          onClose={closeCreateTaskModal}
          onFieldChange={setTaskField}
          onSubmit={createTask}
          statusTags={statusTags}
          taskForm={taskForm}
        />
      ) : null}
    </div>
  );

  function setTaskField(field: keyof TaskFormState, value: string) {
    setTaskForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function setEditTaskField(field: keyof TaskFormState, value: string) {
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

function SelectField({
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

const selectInputClassName =
  "h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function CreateTaskModal({
  environmentTags,
  feedback,
  isSaving,
  onClose,
  onFieldChange,
  onSubmit,
  statusTags,
  taskForm,
}: {
  environmentTags: TagOptionRow[];
  feedback: string;
  isSaving: boolean;
  onClose: () => void;
  onFieldChange: (field: keyof TaskFormState, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  statusTags: TagOptionRow[];
  taskForm: TaskFormState;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
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
        className="w-full max-w-2xl rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="create-task-title" className="text-lg font-semibold">
            Nova tarefa
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
            <Field label="Nome">
              <Input
                value={taskForm.nome}
                onChange={(event) => onFieldChange("nome", event.target.value)}
                required
                autoFocus
              />
            </Field>
            <Field label="Azure">
              <Input
                value={taskForm.azure}
                onChange={(event) =>
                  onFieldChange("azure", event.target.value)
                }
                placeholder="#12345"
              />
            </Field>
            <Field label="Sprint">
              <Input
                value={taskForm.sprint}
                onChange={(event) =>
                  onFieldChange("sprint", event.target.value)
                }
              />
            </Field>
            <SelectField
              label="Status"
              value={taskForm.status}
              options={statusTags}
              onChange={(value) => onFieldChange("status", value)}
            />
            <SelectField
              label="Ambiente"
              value={taskForm.ambiente}
              options={environmentTags}
              onChange={(value) => onFieldChange("ambiente", value)}
            />
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
  const [filters, setFilters] = useState<TaskFilterState>(emptyTaskFilters);
  const [sort, setSort] = useState<SortState>(null);

  const filteredAndSortedTasks = useMemo(() => {
    const normalizedQuery = normalizeFilterValue(filters.query);
    const filteredTasks = tasks.filter((task) => {
      const matchesFields = (
        Object.keys(taskFieldLabels) as Array<keyof TaskFormState>
      ).every((field) => {
        const filterValue = normalizeFilterValue(filters[field]);

        if (!filterValue) {
          return true;
        }

        return normalizeFilterValue(task[field]).includes(filterValue);
      });

      if (!matchesFields) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (Object.keys(taskFieldLabels) as Array<keyof TaskFormState>).some(
        (field) => normalizeFilterValue(task[field]).includes(normalizedQuery),
      );
    });

    if (!sort) {
      return filteredTasks;
    }

    return filteredTasks
      .map((task, index) => ({ task, index }))
      .sort((left, right) => {
        const comparison = taskCollator.compare(
          left.task[sort.field] || "",
          right.task[sort.field] || "",
        );

        if (comparison !== 0) {
          return sort.direction === "asc" ? comparison : -comparison;
        }

        return left.index - right.index;
      })
      .map(({ task }) => task);
  }, [filters, sort, tasks]);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  if (!tasks.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma tarefa cadastrada.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Field label="Busca geral" className="min-w-60 flex-1">
          <Input
            value={filters.query}
            onChange={(event) => setFilterField("query", event.target.value)}
            placeholder="Buscar em qualquer campo"
          />
        </Field>
        <Field label="Nome" className="min-w-60 flex-1">
          <Input
            value={filters.nome}
            onChange={(event) => setFilterField("nome", event.target.value)}
          />
        </Field>
        <Field label="Azure" className="min-w-24 flex-1">
          <Input
            value={filters.azure}
            onChange={(event) => setFilterField("azure", event.target.value)}
          />
        </Field>
        <Field label="Sprint" className="min-w-24 flex-1">
          <Input
            value={filters.sprint}
            onChange={(event) => setFilterField("sprint", event.target.value)}
          />
        </Field>
        <div className="min-w-48 flex-1">
          <SelectField
            label="Status"
            value={filters.status}
            options={statusTags}
            placeholder="Todos"
            onChange={(value) => setFilterField("status", value)}
          />
        </div>
        <div className="min-w-48 flex-1">
          <SelectField
            label="Ambiente"
            value={filters.ambiente}
            options={environmentTags}
            placeholder="Todos"
            onChange={(value) => setFilterField("ambiente", value)}
          />
        </div>
        <div className="flex min-w-48 flex-1 items-end">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={clearFilters}
            disabled={!hasActiveFilters && !sort}
          >
            <RotateCcw className="h-4 w-4" />
            Limpar filtros
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Azure</TableHead>
            <SortableTableHead field="sprint" sort={sort} onSort={toggleSort} />
            <SortableTableHead field="status" sort={sort} onSort={toggleSort} />
            <SortableTableHead
              field="ambiente"
              sort={sort}
              onSort={toggleSort}
            />
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAndSortedTasks.length ? (
            filteredAndSortedTasks.map((task) =>
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
            )
          ) : (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhuma tarefa encontrada com os filtros atuais.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  function setFilterField(field: keyof TaskFilterState, value: string) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  }

  function clearFilters() {
    setFilters(emptyTaskFilters);
    setSort(null);
  }

  function toggleSort(field: SortField) {
    setSort((currentSort) => {
      if (currentSort?.field !== field) {
        return { field, direction: "asc" };
      }

      if (currentSort.direction === "asc") {
        return { field, direction: "desc" };
      }

      return null;
    });
  }
}

function SortableTableHead({
  field,
  sort,
  onSort,
}: {
  field: SortField;
  sort: SortState;
  onSort: (field: SortField) => void;
}) {
  const isActive = sort?.field === field;
  const ariaSort = !isActive
    ? "none"
    : sort.direction === "asc"
      ? "ascending"
      : "descending";
  const SortIcon = !isActive
    ? ArrowUpDown
    : sort.direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <TableHead aria-sort={ariaSort}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 px-3 text-muted-foreground"
        onClick={() => onSort(field)}
        aria-label={`Ordenar por ${taskSortLabels[field]}`}
      >
        {taskSortLabels[field]}
        <SortIcon className="h-4 w-4" />
      </Button>
    </TableHead>
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

function normalizeFilterValue(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}
