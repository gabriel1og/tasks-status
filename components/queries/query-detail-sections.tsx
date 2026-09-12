"use client";

import { Folder, Pencil, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import {
  getTaskCalendarDate,
  QUERY_FIELDS,
  QUERY_OPERATOR_LABELS,
} from "@/lib/task-queries";
import type { QueryDefinition, SavedQueryRow } from "@/types/queries";

/** Displays retryable feedback, for example after a query refresh fails. */
export function QueryLoadError({
  error,
  onRetry,
  disabled,
}: {
  error: string;
  onRetry: () => void;
  disabled: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 px-4 py-3 text-sm text-destructive"
    >
      <p>{error}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={disabled}
      >
        Tentar novamente
      </Button>
    </div>
  );
}

/** Shows saved metadata, for example the query folder and last update date. */
export function QueryMetadata({
  query,
  folderName,
}: {
  query: SavedQueryRow;
  folderName?: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Folder className="h-3.5 w-3.5" />
        {folderName || "Sem pasta"}
      </span>
      <span>
        Atualizada em {formatDate(getTaskCalendarDate(query.updated_at) ?? "")}
      </span>
    </div>
  );
}

/** Provides saved query actions; for example, toggling a query favorite. */
export function QueryActions({
  query,
  disabled,
  canEdit,
  onEdit,
  onFavorite,
  onDelete,
}: {
  query: SavedQueryRow;
  disabled: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onFavorite: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onFavorite}
        disabled={disabled}
        aria-pressed={query.is_favorite}
        aria-label={
          query.is_favorite ? "Remover query dos favoritos" : "Favoritar query"
        }
      >
        <Star
          className={`h-4 w-4 ${query.is_favorite ? "fill-primary text-primary" : ""}`}
        />
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onEdit}
        disabled={disabled || !canEdit}
      >
        <Pencil className="h-4 w-4" /> Editar query
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={disabled}
        aria-label={`Excluir query ${query.nome}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** Confirms query deletion while preserving tasks, for example a saved test query. */
export function DeleteQueryConfirmation({
  name,
  isBusy,
  onConfirm,
  onCancel,
}: {
  name: string;
  isBusy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-destructive/40 p-4"
    >
      <p className="text-sm">
        Excluir a query <strong>{name}</strong>? As tarefas serão mantidas.
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isBusy}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isBusy}
          onClick={onConfirm}
        >
          <Trash2 className="h-4 w-4" />
          {isBusy ? "Excluindo..." : "Excluir query"}
        </Button>
      </div>
    </div>
  );
}

/** Summarizes valid saved conditions, for example Status equals "Concluído". */
export function QueryDefinitionSummary({
  definition,
}: {
  definition: QueryDefinition;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/30 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">
        {definition.conditions.length
          ? `Condições salvas · ${definition.match === "all" ? "Todas (E)" : "Qualquer (OU)"}`
          : "Sem condições · Todas as tarefas"}
      </p>
      {definition.conditions.length ? (
        <ul className="flex flex-wrap gap-2">
          {definition.conditions.map((condition) => (
            <li
              key={condition.id}
              className="max-w-full break-words rounded-md bg-background px-2 py-1 text-xs"
            >
              <span className="font-medium">
                {
                  QUERY_FIELDS.find((field) => field.value === condition.field)
                    ?.label
                }
              </span>{" "}
              {QUERY_OPERATOR_LABELS[condition.operator]}{" "}
              {formatConditionValue(condition)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Recovers unreadable conditions only after an explicit reset, for example legacy filters. */
export function InvalidQueryDefinition({
  disabled,
  onReset,
}: {
  disabled: boolean;
  onReset: () => void;
}) {
  return (
    <Card className="space-y-3 p-5">
      <p role="alert" className="text-sm text-destructive">
        As condições salvas desta query estão inválidas e os resultados não
        podem ser exibidos.
      </p>
      <p className="text-sm text-muted-foreground">
        Você pode limpar as condições para criar novos filtros. As alterações só
        serão aplicadas ao salvar.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={onReset}
      >
        <Pencil className="h-4 w-4" /> Limpar condições e editar
      </Button>
    </Card>
  );
}

function formatConditionValue(
  condition: QueryDefinition["conditions"][number],
): string {
  if (
    condition.operator === "is_empty" ||
    condition.operator === "is_not_empty"
  )
    return "";
  if (condition.field === "is_future")
    return condition.value === "true" ? "Sim" : "Não";
  if (condition.field === "created_at") return formatDate(condition.value);
  return `“${condition.value}”`;
}
