"use client";

import { useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { Popover } from "@/components/ui/popover";
import type {
  TrackedEnvironmentColumn,
  TrackedEnvironmentKey,
} from "@/lib/environment-tracking";

type EnvironmentComparisonSelectorProps = {
  columns: TrackedEnvironmentColumn[];
  value: TrackedEnvironmentKey;
  onChange: (value: TrackedEnvironmentKey) => void;
};

/** Seleciona o ambiente da comparação por setas ou lista. Exemplo: <EnvironmentComparisonSelector columns={columns} value="development" onChange={setValue} />. */
export function EnvironmentComparisonSelector({
  columns,
  value,
  onChange,
}: EnvironmentComparisonSelectorProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    columns.findIndex((column) => column.key === value),
    0,
  );
  const selectedColumn = columns[selectedIndex];

  if (!selectedColumn) {
    return null;
  }

  function selectEnvironment(column: TrackedEnvironmentColumn) {
    onChange(column.key);
    setOpen(false);
  }

  function moveEnvironment(offset: -1 | 1) {
    const nextColumn = columns[selectedIndex + offset];
    if (nextColumn) onChange(nextColumn.key);
  }

  return (
    <div className="shrink-0 space-y-2">
      <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Ambiente da comparação
      </p>
      <div
        ref={anchorRef}
        className="inline-flex h-11 min-w-56 items-stretch rounded-lg border border-border bg-secondary shadow-sm"
      >
        <button
          type="button"
          disabled={selectedIndex === 0}
          onClick={() => moveEnvironment(-1)}
          aria-label="Ambiente anterior"
          className="flex w-10 items-center justify-center rounded-l-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setOpen((currentOpen) => !currentOpen)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="min-w-36 flex-1 border-x border-border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          {selectedColumn.label}
        </button>
        <button
          type="button"
          disabled={selectedIndex === columns.length - 1}
          onClick={() => moveEnvironment(1)}
          aria-label="Próximo ambiente"
          className="flex w-10 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        label="Selecionar ambiente da comparação"
        align="center"
        width={240}
      >
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Selecionar ambiente
        </p>
        <div className="space-y-1">
          {columns.map((column) => {
            const isSelected = column.key === selectedColumn.key;
            return (
              <button
                key={column.key}
                type="button"
                onClick={() => selectEnvironment(column)}
                aria-current={isSelected ? "true" : undefined}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                {column.label}
                {isSelected ? <Check className="h-4 w-4" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}
