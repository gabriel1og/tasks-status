"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import { Popover } from "@/components/ui/popover";
import {
  formatMonthYear,
  monthGrid,
  parseDateInput,
  shiftDays,
  shiftISOMonths,
  todayISO,
  WEEKDAY_LABELS,
} from "@/lib/calendar";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Campo de data com calendario proprio, no lugar do `input[type=date]`.
 *
 * O campo aceita digitacao curta (`05/08`, `05082026`) e calendario visual.
 * O valor final continua sendo ISO (`YYYY-MM-DD`) para manter as comparacoes e
 * o payload do Supabase simples.
 */
export function DateField({
  value,
  onChange,
  label,
  id,
  minDate,
  maxDate,
  required = false,
  className = "",
}: {
  /** ISO `YYYY-MM-DD`. */
  value: string;
  onChange: (next: string) => void;
  label: string;
  id?: string;
  minDate?: string;
  maxDate?: string;
  required?: boolean;
  className?: string;
}) {
  const today = todayISO();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => formatDate(value));
  const [focusDay, setFocusDay] = useState(() => clampDate(value || today));
  const triggerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const monthKey = focusDay.slice(0, 7);
  const [year, month] = monthKey.split("-").map(Number);
  const cells = monthGrid(year, month);

  useEffect(() => setText(formatDate(value)), [value]);

  useEffect(() => {
    if (!open) return;

    const cell = gridRef.current?.querySelector<HTMLButtonElement>(
      '[data-focus="true"]',
    );
    cell?.focus();
  }, [open, focusDay]);

  function isOutsideRange(iso: string) {
    return Boolean((minDate && iso < minDate) || (maxDate && iso > maxDate));
  }

  function clampDate(iso: string) {
    if (minDate && iso < minDate) return minDate;
    if (maxDate && iso > maxDate) return maxDate;
    return iso;
  }

  function openAt(iso: string) {
    setFocusDay(clampDate(iso));
    setOpen(true);
  }

  function pick(iso: string) {
    if (isOutsideRange(iso)) return;

    onChange(iso);
    setFocusDay(iso);
    setOpen(false);
  }

  function commitText() {
    const parsed = parseDateInput(text, value || minDate || today);
    if (parsed && !isOutsideRange(parsed)) {
      onChange(parsed);
      return;
    }

    setText(formatDate(value));
  }

  function moveFocus(nextDay: string) {
    setFocusDay(clampDate(nextDay));
  }

  function onGridKeyDown(event: React.KeyboardEvent) {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };

    if (event.key in moves) {
      event.preventDefault();
      moveFocus(shiftDays(focusDay, moves[event.key]));
      return;
    }

    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      moveFocus(shiftISOMonths(focusDay, event.key === "PageUp" ? -1 : 1));
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      moveFocus(getMonthEdge(focusDay, event.key));
    }
  }

  return (
    <div ref={triggerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex h-10 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-secondary px-3 py-2 text-sm ring-offset-background transition-colors focus-within:ring-2 focus-within:ring-ring",
          open && "ring-2 ring-ring",
        )}
      >
        <input
          id={id}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={commitText}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitText();
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              openAt(value || minDate || today);
            }
          }}
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          required={required}
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0"
        />

        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openAt(value || minDate || today))}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`${label}: escolher no calendario`}
          className="shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Calendar className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        label={label}
        width={268}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => moveFocus(shiftISOMonths(focusDay, -1))}
            aria-label="Mes anterior"
            className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="text-sm font-medium text-foreground" aria-live="polite">
            {formatMonthYear(monthKey)}
          </span>
          <button
            type="button"
            onClick={() => moveFocus(shiftISOMonths(focusDay, 1))}
            aria-label="Proximo mes"
            className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div
          ref={gridRef}
          role="grid"
          aria-label={`${formatMonthYear(monthKey)}. Use as setas para navegar`}
          onKeyDown={onGridKeyDown}
          className="mt-3 grid grid-cols-7 gap-0.5"
        >
          {WEEKDAY_LABELS.map((weekday, index) => (
            <span
              key={`${weekday}-${index}`}
              className="py-1 text-center text-[0.7rem] font-semibold text-muted-foreground"
              aria-hidden
            >
              {weekday}
            </span>
          ))}

          {cells.map((cell, index) => {
            if (!cell.iso) return <span key={`empty-${index}`} />;

            const isSelected = cell.iso === value;
            const isToday = cell.iso === today;
            const isFocus = cell.iso === focusDay;
            const isUnavailable = isOutsideRange(cell.iso);

            return (
              <button
                key={cell.iso}
                type="button"
                data-focus={isFocus ? "true" : undefined}
                tabIndex={isFocus ? 0 : -1}
                onClick={() => pick(cell.iso!)}
                aria-current={isSelected ? "date" : undefined}
                aria-disabled={isUnavailable}
                className={cn(
                  "rounded-md border border-transparent py-1.5 text-xs transition-colors",
                  isSelected
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  !isSelected && isToday && "border-border text-foreground",
                  isUnavailable &&
                    "cursor-not-allowed opacity-35 hover:bg-transparent hover:text-muted-foreground",
                )}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => pick(today)}
          disabled={isOutsideRange(today)}
          className="mt-3 w-full rounded-md border border-border py-1.5 text-xs text-muted-foreground transition-colors hover:border-input hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Hoje
        </button>
      </Popover>
    </div>
  );

  function getMonthEdge(iso: string, edge: "Home" | "End") {
    if (edge === "Home") return `${iso.slice(0, 7)}-01`;
    return shiftDays(shiftISOMonths(`${iso.slice(0, 7)}-01`, 1), -1);
  }
}
