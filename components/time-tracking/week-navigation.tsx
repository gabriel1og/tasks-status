"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { WeekRange } from "@/lib/time-tracking/week";

/** Navega por semanas encerrando o avanço na semana civil atual. */
export function WeekNavigation({
  disabled,
  isCurrentWeek,
  range,
  onCurrentWeek,
  onNextWeek,
  onPreviousWeek,
}: {
  disabled: boolean;
  isCurrentWeek: boolean;
  range: WeekRange;
  onCurrentWeek: () => void;
  onNextWeek: () => void;
  onPreviousWeek: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-3 py-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium" aria-live="polite">
          {formatDate(range.startDate)} — {formatDate(range.endDate)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={onPreviousWeek}
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isCurrentWeek}
          onClick={onCurrentWeek}
        >
          Semana atual
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || isCurrentWeek}
          onClick={onNextWeek}
          aria-label="Próxima semana"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
