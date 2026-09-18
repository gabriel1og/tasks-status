"use client";

import { useMemo } from "react";
import { Trash2 } from "lucide-react";

import { selectInputClassName } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createQueryCondition,
  getQueryOperators,
  QUERY_FIELDS,
  QUERY_OPERATOR_LABELS,
} from "@/lib/task-queries";
import { getTaskGithubReferenceValues } from "@/lib/task-github";
import type { SprintRow, TagOptionRow, TaskStatusRow } from "@/types/database";
import type {
  QueryCondition,
  QueryField,
  QueryOperator,
} from "@/types/queries";

type ConditionRowProps = {
  condition: QueryCondition;
  index: number;
  tasks: TaskStatusRow[];
  tags: TagOptionRow[];
  sprints: SprintRow[];
  onChange: (condition: QueryCondition) => void;
  onRemove: () => void;
};

type ValueSuggestion = { value: string; label: string };

/** Edits one typed condition; for example, Status contains "Em andamento". */
export function QueryConditionRow(props: ConditionRowProps) {
  const { condition, index, onChange, onRemove } = props;
  const fieldId = `query-field-${condition.id}`;
  const operatorId = `query-operator-${condition.id}`;

  return (
    <div className="grid items-end gap-3 border-b border-border pb-4 last:border-b-0 sm:grid-cols-[1fr_1fr_1.5fr_auto]">
      <div className="space-y-2">
        <Label htmlFor={fieldId}>Campo {index + 1}</Label>
        <select
          id={fieldId}
          className={selectInputClassName}
          value={condition.field}
          onChange={(event) =>
            onChange({
              ...createQueryCondition(event.target.value as QueryField),
              id: condition.id,
            })
          }
        >
          {QUERY_FIELDS.map((field) => (
            <option key={field.value} value={field.value}>
              {field.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={operatorId}>Operador</Label>
        <select
          id={operatorId}
          className={selectInputClassName}
          value={condition.operator}
          onChange={(event) =>
            onChange({
              ...condition,
              operator: event.target.value as QueryOperator,
            })
          }
        >
          {getQueryOperators(condition.field).map((operator) => (
            <option key={operator} value={operator}>
              {QUERY_OPERATOR_LABELS[operator]}
            </option>
          ))}
        </select>
      </div>
      <ConditionValueInput {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={`Remover condição ${index + 1}`}
        className="justify-self-end"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ConditionValueInput({
  condition,
  index,
  tasks,
  tags,
  sprints,
  onChange,
}: ConditionRowProps) {
  const valueId = `query-value-${condition.id}`;
  const fieldType = QUERY_FIELDS.find(
    (field) => field.value === condition.field,
  )?.type;
  const suggestions = useMemo(
    () => getValueSuggestions(condition.field, tasks, tags, sprints),
    [condition.field, tasks, tags, sprints],
  );
  const updateValue = (value: string) => onChange({ ...condition, value });
  const label = `Valor da condição ${index + 1}`;

  if (
    condition.operator === "is_empty" ||
    condition.operator === "is_not_empty"
  ) {
    return (
      <p className="flex h-10 items-center text-sm text-muted-foreground">
        Não requer valor
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={valueId}>Valor</Label>
      {fieldType === "boolean" ? (
        <select
          id={valueId}
          aria-label={label}
          value={condition.value}
          className={selectInputClassName}
          onChange={(event) => updateValue(event.target.value)}
          required
        >
          <option value="">Selecione</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      ) : fieldType === "date" ? (
        <DateField
          id={valueId}
          label={label}
          value={condition.value}
          onChange={updateValue}
          required
        />
      ) : (
        <>
          <Input
            id={valueId}
            aria-label={label}
            value={condition.value}
            list={`${valueId}-options`}
            maxLength={2000}
            onChange={(event) => updateValue(event.target.value)}
            placeholder="Digite ou selecione um valor"
            required
          />
          <datalist id={`${valueId}-options`}>
            {suggestions.map((suggestion) => (
              <option
                key={suggestion.value}
                value={suggestion.value}
                label={suggestion.label}
              />
            ))}
          </datalist>
        </>
      )}
    </div>
  );
}

function getValueSuggestions(
  field: QueryField,
  tasks: TaskStatusRow[],
  tags: TagOptionRow[],
  sprints: SprintRow[],
): ValueSuggestion[] {
  const values = new Map<string, string>();
  tasks.forEach((task) => {
    const value = task[field];
    if (typeof value === "string" && value.trim()) values.set(value, value);
    if (field === "github_references") {
      getTaskGithubReferenceValues(value).forEach((referenceValue) =>
        values.set(referenceValue, referenceValue),
      );
    }
    if (field === "areas" && Array.isArray(value)) {
      value.forEach((area) => values.set(String(area), String(area)));
    }
  });
  if (field === "status" || field === "ambiente") {
    tags
      .filter((tag) => tag.tipo === field)
      .forEach((tag) => values.set(tag.nome, tag.nome));
  }
  if (field === "sprint" || field === "sprint_id") {
    sprints.forEach((sprint) =>
      values.set(field === "sprint_id" ? sprint.id : sprint.nome, sprint.nome),
    );
  }
  return [...values]
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
}
