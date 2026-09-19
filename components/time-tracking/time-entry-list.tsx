"use client";

import { Copy, LoaderCircle, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { formatDuration } from "@/lib/time-tracking/duration";
import type { TimeCategoryRow, TimeEntryRow } from "@/types/time-tracking";

/** Lista os apontamentos da semana com ações de edição, cópia e exclusão. */
export function TimeEntryList({
  busyAction,
  categories,
  entries,
  pendingDeleteId,
  onCancelDelete,
  onConfirmDelete,
  onDeleteRequest,
  onDuplicate,
  onEdit,
}: {
  busyAction: string | null;
  categories: TimeCategoryRow[];
  entries: TimeEntryRow[];
  pendingDeleteId: string | null;
  onCancelDelete: () => void;
  onConfirmDelete: (entry: TimeEntryRow) => void;
  onDeleteRequest: (entry: TimeEntryRow) => void;
  onDuplicate: (entry: TimeEntryRow) => void;
  onEdit: (entry: TimeEntryRow) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-4 py-10 text-center">
        <p className="text-sm font-medium">Nenhum apontamento nesta semana.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Use o formulário acima para registrar o primeiro lançamento.
        </p>
      </div>
    );
  }

  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );

  return (
    <div className="divide-y rounded-md border">
      {entries.map((entry) => (
        <TimeEntryListItem
          key={entry.id}
          entry={entry}
          category={categoriesById.get(entry.category_id)}
          busyAction={busyAction}
          isPendingDelete={pendingDeleteId === entry.id}
          onCancelDelete={onCancelDelete}
          onConfirmDelete={() => onConfirmDelete(entry)}
          onDeleteRequest={() => onDeleteRequest(entry)}
          onDuplicate={() => onDuplicate(entry)}
          onEdit={() => onEdit(entry)}
        />
      ))}
    </div>
  );
}

function TimeEntryListItem({
  busyAction,
  category,
  entry,
  isPendingDelete,
  onCancelDelete,
  onConfirmDelete,
  onDeleteRequest,
  onDuplicate,
  onEdit,
}: {
  busyAction: string | null;
  category?: TimeCategoryRow;
  entry: TimeEntryRow;
  isPendingDelete: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onDeleteRequest: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
}) {
  const isBusy = Boolean(busyAction);
  const isCurrentAction = busyAction?.endsWith(entry.id) ?? false;

  return (
    <article className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(entry.entry_date)}</span>
            <span aria-hidden="true">•</span>
            <CategoryBadge category={category} />
          </div>
          <p className="break-words text-sm font-medium">{entry.task}</p>
        </div>
        <div className="flex items-center gap-1">
          <strong className="mr-2 whitespace-nowrap text-sm">
            {formatDuration(entry.duration_minutes)}
          </strong>
          {isCurrentAction ? (
            <LoaderCircle className="mx-1 h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
          <EntryAction
            label={`Editar apontamento ${entry.task}`}
            disabled={isBusy}
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </EntryAction>
          <EntryAction
            label={`Duplicar apontamento ${entry.task}`}
            disabled={isBusy}
            onClick={onDuplicate}
          >
            <Copy className="h-4 w-4" />
          </EntryAction>
          <EntryAction
            label={`Excluir apontamento ${entry.task}`}
            disabled={isBusy}
            onClick={onDeleteRequest}
            destructive
          >
            <Trash2 className="h-4 w-4" />
          </EntryAction>
        </div>
      </div>

      {isPendingDelete ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-3 text-sm"
        >
          <p>Excluir este apontamento definitivamente?</p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={onCancelDelete}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isBusy}
              onClick={onConfirmDelete}
            >
              Excluir
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function CategoryBadge({ category }: { category?: TimeCategoryRow }) {
  if (!category) {
    return <span className="rounded-full bg-secondary px-2 py-1">Categoria removida</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-1">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: category.color }}
        aria-hidden="true"
      />
      {category.name}
      {category.archived_at ? " (arquivada)" : ""}
    </span>
  );
}

function EntryAction({
  children,
  destructive = false,
  label,
  ...buttonProps
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  destructive?: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={destructive ? "text-destructive hover:text-destructive" : undefined}
      aria-label={label}
      title={label}
      {...buttonProps}
    >
      {children}
    </Button>
  );
}
