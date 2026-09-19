"use client";

import {
  Archive,
  ArchiveRestore,
  Check,
  LoaderCircle,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TimeCategoryRow } from "@/types/time-tracking";

export type TimeCategoryDraft = {
  color: string;
  name: string;
};

type TimeCategoryListProps = {
  busyAction: string | null;
  categories: TimeCategoryRow[];
  editingCategoryId: string | null;
  editingDraft: TimeCategoryDraft;
  emptyMessage: string;
  isArchived: boolean;
  pendingDeleteId: string | null;
  title: string;
  onArchive: (category: TimeCategoryRow) => void;
  onCancelDelete: () => void;
  onCancelEditing: () => void;
  onConfirmDelete: (category: TimeCategoryRow) => void;
  onDeleteRequest: (category: TimeCategoryRow) => void;
  onDraftChange: (draft: TimeCategoryDraft) => void;
  onEdit: (category: TimeCategoryRow) => void;
  onRestore: (category: TimeCategoryRow) => void;
  onSave: (category: TimeCategoryRow) => void;
};

export function TimeCategoryList(props: TimeCategoryListProps) {
  return (
    <section className="space-y-3" aria-labelledby={`${props.title}-heading`}>
      <div className="flex items-center justify-between gap-3">
        <h2
          id={`${props.title}-heading`}
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {props.title}
        </h2>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {props.categories.length}
        </span>
      </div>

      {props.categories.length === 0 ? (
        <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {props.emptyMessage}
        </p>
      ) : (
        <div className="divide-y rounded-md border">
          {props.categories.map((category) => (
            <TimeCategoryRowItem
              key={category.id}
              category={category}
              {...props}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TimeCategoryRowItem({
  category,
  ...props
}: Omit<TimeCategoryListProps, "categories"> & {
  category: TimeCategoryRow;
}) {
  const isEditing = props.editingCategoryId === category.id;
  const isDeleting = props.pendingDeleteId === category.id;
  const isCurrentAction = props.busyAction?.endsWith(category.id) ?? false;
  const isDisabled = Boolean(props.busyAction);

  return (
    <div className="p-3 sm:p-4">
      {isEditing ? (
        <EditCategoryForm
          category={category}
          draft={props.editingDraft}
          disabled={isDisabled}
          onCancel={props.onCancelEditing}
          onChange={props.onDraftChange}
          onSave={() => props.onSave(category)}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="h-4 w-4 shrink-0 rounded-full border border-black/10 shadow-sm"
              style={{ backgroundColor: category.color }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{category.name}</p>
              <p className="text-xs text-muted-foreground">{category.color}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isCurrentAction ? (
              <LoaderCircle className="mx-2 h-4 w-4 animate-spin text-muted-foreground" />
            ) : null}
            <CategoryAction
              label={`Editar categoria ${category.name}`}
              disabled={isDisabled}
              onClick={() => props.onEdit(category)}
            >
              <Pencil className="h-4 w-4" />
            </CategoryAction>
            {props.isArchived ? (
              <>
                <CategoryAction
                  label={`Reativar categoria ${category.name}`}
                  disabled={isDisabled}
                  onClick={() => props.onRestore(category)}
                >
                  <ArchiveRestore className="h-4 w-4" />
                </CategoryAction>
                <CategoryAction
                  label={`Excluir categoria ${category.name}`}
                  disabled={isDisabled}
                  onClick={() => props.onDeleteRequest(category)}
                  destructive
                >
                  <Trash2 className="h-4 w-4" />
                </CategoryAction>
              </>
            ) : (
              <>
                <CategoryAction
                  label={`Arquivar categoria ${category.name}`}
                  disabled={isDisabled}
                  onClick={() => props.onArchive(category)}
                >
                  <Archive className="h-4 w-4" />
                </CategoryAction>
                <CategoryAction
                  label={`Excluir categoria ${category.name}`}
                  disabled={isDisabled}
                  onClick={() => props.onDeleteRequest(category)}
                  destructive
                >
                  <Trash2 className="h-4 w-4" />
                </CategoryAction>
              </>
            )}
          </div>
        </div>
      )}

      {isDeleting ? (
        <DeleteCategoryConfirmation
          category={category}
          disabled={isDisabled}
          onCancel={props.onCancelDelete}
          onConfirm={() => props.onConfirmDelete(category)}
        />
      ) : null}
    </div>
  );
}

function EditCategoryForm({
  category,
  draft,
  disabled,
  onCancel,
  onChange,
  onSave,
}: {
  category: TimeCategoryRow;
  draft: TimeCategoryDraft;
  disabled: boolean;
  onCancel: () => void;
  onChange: (draft: TimeCategoryDraft) => void;
  onSave: () => void;
}) {
  return (
    <form
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor={`time-category-name-${category.id}`}>Nome</Label>
        <Input
          id={`time-category-name-${category.id}`}
          autoFocus
          required
          maxLength={80}
          value={draft.name}
          disabled={disabled}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
          aria-label={`Nome da categoria ${category.name}`}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`time-category-color-${category.id}`}>Cor</Label>
        <input
          id={`time-category-color-${category.id}`}
          type="color"
          value={draft.color}
          disabled={disabled}
          onChange={(event) => onChange({ ...draft, color: event.target.value })}
          className="block h-10 w-full min-w-20 cursor-pointer rounded-md border border-input bg-secondary p-1 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Cor da categoria ${category.name}`}
        />
      </div>
      <div className="flex gap-1">
        <Button
          type="submit"
          size="icon"
          disabled={disabled}
          aria-label="Salvar categoria"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={disabled}
          onClick={onCancel}
          aria-label="Cancelar edição"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

function CategoryAction({
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
      size="icon"
      variant="ghost"
      className={
        destructive ? "text-destructive hover:text-destructive" : undefined
      }
      aria-label={label}
      title={label}
      {...buttonProps}
    >
      {children}
    </Button>
  );
}

function DeleteCategoryConfirmation({
  category,
  disabled,
  onCancel,
  onConfirm,
}: {
  category: TimeCategoryRow;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="alert"
      className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-3 text-sm"
    >
      <p>
        Excluir <strong>{category.name}</strong>? Esta categoria não possui
        apontamentos e a exclusão será definitiva.
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={disabled}
          onClick={onConfirm}
        >
          Excluir
        </Button>
      </div>
    </div>
  );
}
