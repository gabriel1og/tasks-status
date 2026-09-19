"use client";

import { LoaderCircle, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { TimeCategoryRow } from "@/types/time-tracking";

export type TimeEntryDraft = {
  categoryId: string;
  date: string;
  duration: string;
  task: string;
};

/** Formulário controlado para criar ou editar um apontamento semanal. */
export function TimeEntryForm({
  categories,
  draft,
  isEditing,
  isSaving,
  maxDate,
  minDate,
  onCancel,
  onChange,
  onSubmit,
}: {
  categories: TimeCategoryRow[];
  draft: TimeEntryDraft;
  isEditing: boolean;
  isSaving: boolean;
  maxDate: string;
  minDate: string;
  onCancel: () => void;
  onChange: (draft: TimeEntryDraft) => void;
  onSubmit: () => void;
}) {
  const selectableCategories = getSelectableCategories(categories, draft.categoryId);

  return (
    <form
      id="time-entry-form"
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <fieldset disabled={isSaving} className="grid gap-4 md:grid-cols-2">
        <legend className="sr-only">Dados do apontamento</legend>
        <div className="space-y-2">
          <Label htmlFor="time-entry-date">Data</Label>
          <DateField
            id="time-entry-date"
            label="Data do apontamento"
            value={draft.date}
            minDate={minDate}
            maxDate={maxDate}
            required
            onChange={(date) => onChange({ ...draft, date })}
          />
          <p className="text-xs text-muted-foreground">
            Finais de semana e dias marcados sem apontamento não são permitidos.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="time-entry-duration">Duração</Label>
          <Input
            id="time-entry-duration"
            value={draft.duration}
            required
            maxLength={20}
            placeholder="Ex.: 1h30, 1:30 ou 90min"
            disabled={isSaving}
            onChange={(event) =>
              onChange({ ...draft, duration: event.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time-entry-task">Tarefa</Label>
          <Input
            id="time-entry-task"
            value={draft.task}
            required
            maxLength={200}
            placeholder="Descreva a tarefa realizada"
            disabled={isSaving}
            onChange={(event) => onChange({ ...draft, task: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time-entry-category">Categoria</Label>
          <Select
            id="time-entry-category"
            value={draft.categoryId}
            required
            disabled={isSaving || selectableCategories.length === 0}
            onChange={(event) =>
              onChange({ ...draft, categoryId: event.target.value })
            }
          >
            <option value="">Selecione uma categoria</option>
            {selectableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.archived_at ? " (arquivada)" : ""}
              </option>
            ))}
          </Select>
        </div>
      </fieldset>

      <div className="flex flex-wrap justify-end gap-2">
        {isEditing ? (
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
            Cancelar edição
          </Button>
        ) : null}
        <Button type="submit" disabled={isSaving || selectableCategories.length === 0}>
          {isSaving ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Adicionar apontamento"}
        </Button>
      </div>
    </form>
  );
}

function getSelectableCategories(
  categories: TimeCategoryRow[],
  selectedCategoryId: string,
): TimeCategoryRow[] {
  return categories.filter(
    (category) => !category.archived_at || category.id === selectedCategoryId,
  );
}
