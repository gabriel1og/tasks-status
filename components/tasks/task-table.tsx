"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Eye,
  Link,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import {
  selectInputClassName,
  SprintSelectField,
  type TaskFormState,
} from "@/components/tasks/task-form";
import { TaskEnvironmentModal } from "@/components/tasks/task-environment-modal";
import {
  emptyTaskFilters,
  TaskFilters,
  type TaskFilterState,
} from "@/components/tasks/task-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import {
  buildTaskEnvironmentAvailability,
  taskMatchesAvailableEnvironment,
  type TaskEnvironmentAvailability,
} from "@/lib/task-environments";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  SprintRow,
  TagOptionRow,
  TaskEnvironmentStatusRow,
  TaskStatusRow,
} from "@/types/database";
type FilterableTaskField = "nome" | "azure" | "sprint" | "status" | "ambiente";
type SortField = "sprint" | "status" | "ambiente";
type SprintCellMode = "editable" | "assign" | "readonly";
type SortState = { field: SortField; direction: "asc" | "desc" } | null;

type TaskTableProps = {
  tasks: TaskStatusRow[];
  tags: TagOptionRow[];
  taskEnvironmentStatuses?: TaskEnvironmentStatusRow[];
  statusTags: TagOptionRow[];
  environmentTags: TagOptionRow[];
  sprints: SprintRow[];
  sprintCellMode?: SprintCellMode;
  showSprintFilter?: boolean;
  showEnvironmentMonitor?: boolean;
  emptyMessage?: string;
  editingTaskId?: string | null;
  editTaskForm?: TaskFormState;
  isSaving?: boolean;
  onAssignSprint?: (taskId: string, sprintId: string) => void;
  onCancelEdit?: () => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: TaskStatusRow) => void;
  onEditField?: (field: keyof TaskFormState, value: string | null) => void;
  onToggleEnvironment?: (
    task: TaskStatusRow,
    environmentTag: TagOptionRow,
    available: boolean,
  ) => void;
  onSaveEdit?: () => void;
};

const taskFieldLabels: Record<FilterableTaskField, string> = {
  nome: "Nome",
  azure: "Azure",
  sprint: "Sprint",
  status: "Status",
  ambiente: "Ambiente",
};

const taskCollator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});

export function TaskTable({
  tasks,
  tags,
  taskEnvironmentStatuses = [],
  statusTags,
  environmentTags,
  sprints,
  sprintCellMode = "editable",
  showSprintFilter = true,
  showEnvironmentMonitor = true,
  emptyMessage = "Nenhuma tarefa cadastrada.",
  editingTaskId = null,
  editTaskForm,
  isSaving = false,
  onAssignSprint,
  onCancelEdit,
  onDelete,
  onEdit,
  onEditField,
  onToggleEnvironment,
  onSaveEdit,
}: TaskTableProps) {
  const [filters, setFilters] = useState<TaskFilterState>(emptyTaskFilters);
  const [sort, setSort] = useState<SortState>(null);
  const [selectedEnvironmentTask, setSelectedEnvironmentTask] =
    useState<TaskStatusRow | null>(null);
  const taskEnvironmentAvailability = useMemo(
    () => buildTaskEnvironmentAvailability(taskEnvironmentStatuses),
    [taskEnvironmentStatuses],
  );
  const visibleTasks = useMemo(
    () =>
      filterAndSortTasks(
        tasks,
        filters,
        sort,
        taskEnvironmentAvailability,
        showEnvironmentMonitor,
      ),
    [filters, showEnvironmentMonitor, sort, taskEnvironmentAvailability, tasks],
  );
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const canShowActions = showEnvironmentMonitor || Boolean(onDelete && onEdit);

  if (!tasks.length) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4">
      <TaskFilters
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        hasSort={Boolean(sort)}
        showAvailableEnvironmentFilter={showEnvironmentMonitor}
        showSprintFilter={showSprintFilter}
        sprints={sprints}
        statusTags={statusTags}
        environmentTags={environmentTags}
        onChange={setFilterField}
        onClear={clearFilters}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Azure</TableHead>
            <TableHead>LiveOps</TableHead>
            <SortableTableHead field="sprint" sort={sort} onSort={toggleSort} />
            <SortableTableHead field="status" sort={sort} onSort={toggleSort} />
            <SortableTableHead field="ambiente" sort={sort} onSort={toggleSort} />
            {canShowActions ? <TableHead className="w-44">Ações</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleTasks.length ? (
            visibleTasks.map((task) =>
              task.id === editingTaskId && editTaskForm ? (
                <EditableTaskRow
                  key={task.id}
                  task={task}
                  taskForm={editTaskForm}
                  environmentTags={environmentTags}
                  isSaving={isSaving}
                  showEnvironmentMonitor={showEnvironmentMonitor}
                  sprintCellMode={sprintCellMode}
                  sprints={sprints}
                  statusTags={statusTags}
                  onCancelEdit={onCancelEdit}
                  onEditField={onEditField}
                  onShowEnvironments={setSelectedEnvironmentTask}
                  onSaveEdit={onSaveEdit}
                />
              ) : (
                <ReadonlyTaskRow
                  key={task.id}
                  task={task}
                  tags={tags}
                  sprints={sprints}
                  showEnvironmentMonitor={showEnvironmentMonitor}
                  sprintCellMode={sprintCellMode}
                  onAssignSprint={onAssignSprint}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onShowEnvironments={setSelectedEnvironmentTask}
                />
              ),
            )
          ) : (
            <TableRow>
              <TableCell
                colSpan={getTaskTableColumnCount(canShowActions)}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhuma tarefa encontrada com os filtros atuais.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {selectedEnvironmentTask ? (
        <TaskEnvironmentModal
          task={selectedEnvironmentTask}
          environmentTags={environmentTags}
          environmentAvailability={taskEnvironmentAvailability}
          onClose={() => setSelectedEnvironmentTask(null)}
          onToggleEnvironment={onToggleEnvironment}
        />
      ) : null}
    </div>
  );

  function setFilterField(field: keyof TaskFilterState, value: string) {
    setFilters((currentFilters) => ({ ...currentFilters, [field]: value }));
  }

  function clearFilters() {
    setFilters(emptyTaskFilters);
    setSort(null);
  }

  function toggleSort(field: SortField) {
    setSort((currentSort) => getNextSort(currentSort, field));
  }
}

function EditableTaskRow({
  task,
  taskForm,
  environmentTags,
  isSaving,
  showEnvironmentMonitor,
  sprintCellMode,
  sprints,
  statusTags,
  onCancelEdit,
  onEditField,
  onShowEnvironments,
  onSaveEdit,
}: {
  task: TaskStatusRow;
  taskForm: TaskFormState;
  environmentTags: TagOptionRow[];
  isSaving: boolean;
  showEnvironmentMonitor: boolean;
  sprintCellMode: SprintCellMode;
  sprints: SprintRow[];
  statusTags: TagOptionRow[];
  onCancelEdit?: () => void;
  onEditField?: (field: keyof TaskFormState, value: string | null) => void;
  onShowEnvironments: (task: TaskStatusRow) => void;
  onSaveEdit?: () => void;
}) {
  if (!onCancelEdit || !onEditField || !onSaveEdit) {
    return null;
  }

  return (
    <TableRow>
      <TableCell>
        <Input value={taskForm.nome} onChange={(event) => onEditField("nome", event.target.value)} required />
      </TableCell>
      <TableCell>
        <div className="space-y-2">
          <Input value={taskForm.azure} onChange={(event) => onEditField("azure", event.target.value)} placeholder="#12345" />
          <Input value={taskForm.azure_url} onChange={(event) => onEditField("azure_url", event.target.value)} placeholder="Link Azure" />
        </div>
      </TableCell>
      <TableCell>
        <Input value={taskForm.liveops_url} onChange={(event) => onEditField("liveops_url", event.target.value)} placeholder="Link LiveOps" />
      </TableCell>
      <TableCell>
        {sprintCellMode === "editable" ? (
          <SprintSelectField label="" value={taskForm.sprint_id} sprints={sprints} onChange={(value) => onEditField("sprint_id", value)} />
        ) : (
          <span className="text-sm text-muted-foreground">Sem sprint</span>
        )}
      </TableCell>
      <TableCell>
        <TagSelectInput value={taskForm.status} options={statusTags} onChange={(value) => onEditField("status", value)} />
      </TableCell>
      <TableCell>
        <TagSelectInput value={taskForm.ambiente} options={environmentTags} onChange={(value) => onEditField("ambiente", value)} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {showEnvironmentMonitor ? (
            <EnvironmentStatusAction task={task} onClick={onShowEnvironments} />
          ) : null}
          <Button variant="ghost" size="icon" onClick={onSaveEdit} disabled={isSaving || !taskForm.nome} aria-label={`Salvar ${task.nome}`}>
            <Check className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onCancelEdit} aria-label={`Cancelar edicao de ${task.nome}`}>
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
  sprints,
  showEnvironmentMonitor,
  sprintCellMode,
  onAssignSprint,
  onDelete,
  onEdit,
  onShowEnvironments,
}: {
  task: TaskStatusRow;
  tags: TagOptionRow[];
  sprints: SprintRow[];
  showEnvironmentMonitor: boolean;
  sprintCellMode: SprintCellMode;
  onAssignSprint?: (taskId: string, sprintId: string) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: TaskStatusRow) => void;
  onShowEnvironments: (task: TaskStatusRow) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{task.nome}</TableCell>
      <TableCell><TaskTextLink text={task.azure} url={task.azure_url} /></TableCell>
      <TableCell><TaskIconLink label={`Abrir LiveOps de ${task.nome}`} url={task.liveops_url} /></TableCell>
      <TableCell>
        {sprintCellMode === "assign" && onAssignSprint ? (
          <select
            className={selectInputClassName}
            value=""
            onChange={(event) => onAssignSprint(task.id, event.target.value)}
            aria-label={`Associar ${task.nome} a uma sprint`}
            disabled={!sprints.length}
          >
            <option value="">{sprints.length ? "Associar" : "Sem sprints"}</option>
            {sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.nome}</option>)}
          </select>
        ) : (
          task.sprint || "-"
        )}
      </TableCell>
      <TableCell><TagBadge name={task.status} tags={tags} /></TableCell>
      <TableCell><TagBadge name={task.ambiente} tags={tags} /></TableCell>
      {showEnvironmentMonitor || (onDelete && onEdit) ? (
        <TableCell>
          <div className="flex flex-wrap items-center gap-1">
            {showEnvironmentMonitor ? (
              <EnvironmentStatusAction task={task} onClick={onShowEnvironments} />
            ) : null}
            {onEdit ? (
              <Button variant="ghost" size="icon" onClick={() => onEdit(task)} aria-label={`Editar ${task.nome}`}>
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
            {onDelete ? (
              <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)} aria-label={`Remover ${task.nome}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  );
}

function EnvironmentStatusAction({
  task,
  onClick,
}: {
  task: TaskStatusRow;
  onClick: (task: TaskStatusRow) => void;
}) {
  return (
    <Tooltip content="Ver Status dos Ambientes">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Ver Status dos Ambientes de ${task.nome}`}
        onClick={() => onClick(task)}
      >
        <Eye className="h-4 w-4" />
      </Button>
    </Tooltip>
  );
}

function SortableTableHead({ field, sort, onSort }: { field: SortField; sort: SortState; onSort: (field: SortField) => void }) {
  const isActive = sort?.field === field;
  const SortIcon = !isActive ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
  const ariaSort = !isActive ? "none" : sort.direction === "asc" ? "ascending" : "descending";

  return (
    <TableHead aria-sort={ariaSort}>
      <Button type="button" variant="ghost" size="sm" className="-ml-3 h-8 px-3 text-muted-foreground" onClick={() => onSort(field)} aria-label={`Ordenar por ${taskFieldLabels[field]}`}>
        {taskFieldLabels[field]} <SortIcon className="h-4 w-4" />
      </Button>
    </TableHead>
  );
}

function TagSelectInput({ value, options, onChange }: { value: string; options: TagOptionRow[]; onChange: (value: string) => void }) {
  return (
    <select className={selectInputClassName} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Selecione</option>
      {options.map((option) => <option key={option.id} value={option.nome}>{option.nome}</option>)}
    </select>
  );
}

function TaskTextLink({ text, url }: { text: string; url: string }) {
  const href = getExternalHref(url);
  if (!text) return <span>-</span>;
  if (!href) return <span>{text}</span>;

  return <a className="font-medium text-primary underline-offset-4 hover:underline" href={href} target="_blank" rel="noreferrer">{text}</a>;
}

function TaskIconLink({ label, url }: { label: string; url: string }) {
  const href = getExternalHref(url);
  if (!href) return <span className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground opacity-50" aria-label="LiveOps sem link"><Link className="h-4 w-4" /></span>;

  return <a className="inline-flex h-10 w-10 items-center justify-center rounded-md text-primary transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={href} target="_blank" rel="noreferrer" aria-label={label}><Link className="h-4 w-4" /></a>;
}

function TagBadge({ name, tags }: { name: string; tags: TagOptionRow[] }) {
  const tag = tags.find((currentTag) => currentTag.nome === name);
  return <span className="inline-flex rounded-md px-2 py-1 text-xs font-medium text-white" style={{ backgroundColor: tag?.cor ?? "#475569" }}>{name || "-"}</span>;
}

function filterAndSortTasks(
  tasks: TaskStatusRow[],
  filters: TaskFilterState,
  sort: SortState,
  environmentAvailability: TaskEnvironmentAvailability,
  showEnvironmentMonitor: boolean,
) {
  const query = normalizeValue(filters.query);
  const filteredTasks = tasks.filter((task) => {
    const matchesFields = (Object.keys(taskFieldLabels) as FilterableTaskField[]).every((field) => !normalizeValue(filters[field]) || normalizeValue(task[field]).includes(normalizeValue(filters[field])));
    const matchesEnvironment = !showEnvironmentMonitor || taskMatchesAvailableEnvironment(task, environmentAvailability, filters.availableEnvironment);
    return matchesFields && matchesEnvironment && (!query || (Object.keys(taskFieldLabels) as FilterableTaskField[]).some((field) => normalizeValue(task[field]).includes(query)));
  });

  if (!sort) return filteredTasks;
  return filteredTasks.map((task, index) => ({ task, index })).sort((left, right) => {
    const comparison = taskCollator.compare(left.task[sort.field] || "", right.task[sort.field] || "");
    return comparison === 0 ? left.index - right.index : sort.direction === "asc" ? comparison : -comparison;
  }).map(({ task }) => task);
}

function getNextSort(currentSort: SortState, field: SortField): SortState {
  if (currentSort?.field !== field) return { field, direction: "asc" };
  if (currentSort.direction === "asc") return { field, direction: "desc" };
  return null;
}

function normalizeValue(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("pt-BR");
}

function getTaskTableColumnCount(canShowActions: boolean) {
  return 6 + (canShowActions ? 1 : 0);
}

function getExternalHref(url: string | null | undefined) {
  const trimmedUrl = (url ?? "").trim();
  if (!trimmedUrl) return "";
  return /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
}
