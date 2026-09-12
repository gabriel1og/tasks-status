"use client";

import { RotateCcw } from "lucide-react";

import {
  Field,
  selectInputClassName,
  TagSelectField,
} from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SprintRow, TagOptionRow } from "@/types/database";

export type TaskFilterState = {
  nome: string;
  azure: string;
  sprint: string;
  status: string;
  ambiente: string;
  availableEnvironment: string;
  query: string;
};

export const emptyTaskFilters: TaskFilterState = {
  nome: "",
  azure: "",
  sprint: "",
  status: "",
  ambiente: "",
  availableEnvironment: "",
  query: "",
};

export function TaskFilters({
  filters,
  hasActiveFilters,
  hasSort,
  showAvailableEnvironmentFilter,
  showSprintFilter,
  sprints,
  statusTags,
  environmentTags,
  onChange,
  onClear,
}: {
  filters: TaskFilterState;
  hasActiveFilters: boolean;
  hasSort: boolean;
  showAvailableEnvironmentFilter: boolean;
  showSprintFilter: boolean;
  sprints: SprintRow[];
  statusTags: TagOptionRow[];
  environmentTags: TagOptionRow[];
  onChange: (field: keyof TaskFilterState, value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <FilterInput
        label="Busca geral"
        value={filters.query}
        placeholder="Buscar em qualquer campo"
        className="min-w-60 flex-1"
        onChange={(value) => onChange("query", value)}
      />
      <FilterInput
        label="Nome"
        value={filters.nome}
        className="min-w-60 flex-1"
        onChange={(value) => onChange("nome", value)}
      />
      <FilterInput
        label="Azure"
        value={filters.azure}
        className="min-w-24 flex-1"
        onChange={(value) => onChange("azure", value)}
      />
      {showSprintFilter ? (
        <Field label="Sprint" className="min-w-24 flex-1">
          <select
            className={selectInputClassName}
            value={filters.sprint}
            onChange={(event) => onChange("sprint", event.target.value)}
          >
            <option value="">Todas</option>
            {sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.nome}>
                {sprint.nome}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <div className="min-w-48 flex-1">
        <TagSelectField
          label="Status"
          value={filters.status}
          options={statusTags}
          placeholder="Todos"
          onChange={(value) => onChange("status", value)}
        />
      </div>
      <div className="min-w-48 flex-1">
        <TagSelectField
          label="Ambiente atual"
          value={filters.ambiente}
          options={environmentTags}
          placeholder="Todos"
          onChange={(value) => onChange("ambiente", value)}
        />
      </div>
      {showAvailableEnvironmentFilter ? (
        <Field label="Disponível em" className="min-w-48 flex-1">
        <select
          className={selectInputClassName}
          value={filters.availableEnvironment}
          onChange={(event) =>
            onChange("availableEnvironment", event.target.value)
          }
        >
          <option value="">Todos</option>
          {environmentTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.nome}
            </option>
          ))}
        </select>
        </Field>
      ) : null}
      <div className="flex min-w-48 flex-1 items-end">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onClear}
          disabled={!hasActiveFilters && !hasSort}
        >
          <RotateCcw className="h-4 w-4" />
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}

function FilterInput({
  label,
  value,
  placeholder,
  className,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  className: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} className={className}>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}
