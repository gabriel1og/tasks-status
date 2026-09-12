"use client";

import type { FormEvent } from "react";
import { Plus, Save, X } from "lucide-react";

import { QueryConditionRow } from "@/components/queries/query-condition-row";
import { selectInputClassName } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createQueryCondition } from "@/lib/task-queries";
import type { SprintRow, TagOptionRow, TaskStatusRow } from "@/types/database";
import type {
  QueryDefinition,
  QueryFolderRow,
  QuerySaveInput,
} from "@/types/queries";

type QueryEditorProps = {
  draft: QuerySaveInput;
  folders: QueryFolderRow[];
  tasks: TaskStatusRow[];
  tags: TagOptionRow[];
  sprints: SprintRow[];
  isSaving: boolean;
  validationError: string | null;
  onChange: (draft: QuerySaveInput) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

/** Builds query metadata and conditions; an empty group includes every task. */
export function QueryEditor(props: QueryEditorProps) {
  const { draft, isSaving, validationError, onChange, onSave, onCancel } =
    props;
  const updateDefinition = (definition: QueryDefinition) =>
    onChange({ ...draft, definition });

  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={onSave} className="space-y-6">
        <fieldset disabled={isSaving} className="min-w-0 space-y-6">
          <legend className="mb-4 text-base font-semibold">
            Editor da query
          </legend>
          <QueryMetadataFields {...props} />
          <div className="space-y-4 border-t border-border pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Label htmlFor="query-match">Incluir tarefas que atendam</Label>
                <select
                  id="query-match"
                  className={`${selectInputClassName} sm:w-auto`}
                  value={draft.definition.match}
                  onChange={(event) =>
                    updateDefinition({
                      ...draft.definition,
                      match: event.target.value as QueryDefinition["match"],
                    })
                  }
                >
                  <option value="all">Todas as condições (E)</option>
                  <option value="any">Qualquer condição (OU)</option>
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={draft.definition.conditions.length >= 50}
                onClick={() =>
                  updateDefinition({
                    ...draft.definition,
                    conditions: [
                      ...draft.definition.conditions,
                      createQueryCondition(),
                    ],
                  })
                }
              >
                <Plus className="h-4 w-4" /> Adicionar condição
              </Button>
            </div>
            <QueryConditions {...props} />
            <p className="text-xs text-muted-foreground">
              Use até 50 condições. A query considera todas as suas tarefas,
              incluindo futuras e de qualquer sprint. Datas de criação usam o
              dia no seu fuso horário.
            </p>
          </div>
        </fieldset>
        {validationError ? (
          <p role="alert" className="text-sm text-destructive">
            {validationError}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4" /> Cancelar
          </Button>
          <Button
            type="submit"
            disabled={
              isSaving || !draft.nome.trim() || Boolean(validationError)
            }
          >
            <Save className="h-4 w-4" />{" "}
            {isSaving ? "Salvando..." : "Salvar query"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function QueryMetadataFields({ draft, folders, onChange }: QueryEditorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="query-name">Nome da query</Label>
        <Input
          id="query-name"
          value={draft.nome}
          onChange={(event) => onChange({ ...draft, nome: event.target.value })}
          maxLength={120}
          placeholder="Ex.: Pendências de homologação"
          autoFocus
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="query-folder">Pasta</Label>
        <select
          id="query-folder"
          className={selectInputClassName}
          value={draft.folder_id ?? ""}
          onChange={(event) =>
            onChange({ ...draft, folder_id: event.target.value || null })
          }
        >
          <option value="">Sem pasta</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="query-description">Descrição (opcional)</Label>
        <textarea
          id="query-description"
          value={draft.descricao}
          rows={2}
          maxLength={2000}
          onChange={(event) =>
            onChange({ ...draft, descricao: event.target.value })
          }
          placeholder="Descreva o objetivo desta query"
          className="flex w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </div>
  );
}

function QueryConditions({
  draft,
  tasks,
  tags,
  sprints,
  onChange,
}: QueryEditorProps) {
  const { definition } = draft;
  if (!definition.conditions.length) {
    return (
      <p className="rounded-md bg-muted/50 px-4 py-5 text-sm text-muted-foreground">
        Sem condições: esta query retorna todas as tarefas. Adicione uma
        condição para filtrar os resultados.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {definition.conditions.map((condition, index) => (
        <QueryConditionRow
          key={condition.id}
          condition={condition}
          index={index}
          tasks={tasks}
          tags={tags}
          sprints={sprints}
          onChange={(updated) =>
            onChange({
              ...draft,
              definition: {
                ...definition,
                conditions: definition.conditions.map((current) =>
                  current.id === updated.id ? updated : current,
                ),
              },
            })
          }
          onRemove={() =>
            onChange({
              ...draft,
              definition: {
                ...definition,
                conditions: definition.conditions.filter(
                  (current) => current.id !== condition.id,
                ),
              },
            })
          }
        />
      ))}
    </div>
  );
}
