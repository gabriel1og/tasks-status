"use client";

import { Filter, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { TimeReportFilters } from "@/lib/time-tracking/reporting";
import type { TimeCategoryRow } from "@/types/time-tracking";

/** Formulário compartilhado pelos relatórios e pelo histórico de apontamentos. */
export function TimeReportFiltersForm({
  categories,
  disabled,
  filters,
  idPrefix,
  today,
  onChange,
  onReset,
  onSubmit,
}: {
  categories: TimeCategoryRow[];
  disabled: boolean;
  filters: TimeReportFilters;
  idPrefix: string;
  today: string;
  onChange: (filters: TimeReportFilters) => void;
  onReset: () => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr_1.2fr_auto] lg:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <FilterField label="Data inicial" htmlFor={`${idPrefix}-start-date`}>
        <DateField
          id={`${idPrefix}-start-date`}
          label="Data inicial do período"
          value={filters.startDate}
          maxDate={filters.endDate || today}
          required
          onChange={(startDate) => onChange({ ...filters, startDate })}
        />
      </FilterField>
      <FilterField label="Data final" htmlFor={`${idPrefix}-end-date`}>
        <DateField
          id={`${idPrefix}-end-date`}
          label="Data final do período"
          value={filters.endDate}
          minDate={filters.startDate}
          maxDate={today}
          required
          onChange={(endDate) => onChange({ ...filters, endDate })}
        />
      </FilterField>
      <FilterField label="Tarefa contém" htmlFor={`${idPrefix}-task`}>
        <Input
          id={`${idPrefix}-task`}
          value={filters.task}
          maxLength={200}
          placeholder="Ex.: relatório"
          disabled={disabled}
          onChange={(event) => onChange({ ...filters, task: event.target.value })}
        />
      </FilterField>
      <FilterField label="Categoria" htmlFor={`${idPrefix}-category`}>
        <Select
          id={`${idPrefix}-category`}
          value={filters.categoryId}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...filters, categoryId: event.target.value })
          }
        >
          <option value="">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.archived_at ? " (arquivada)" : ""}
            </option>
          ))}
        </Select>
      </FilterField>
      <div className="flex gap-2 lg:justify-end">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          aria-label="Limpar filtros"
          title="Limpar filtros"
          onClick={onReset}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button type="submit" disabled={disabled}>
          <Filter className="h-4 w-4" />
          Filtrar
        </Button>
      </div>
    </form>
  );
}

function FilterField({
  children,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
