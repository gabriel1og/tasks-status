"use client";

import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { TimeReportFiltersForm } from "@/components/time-tracking/time-report-filters";
import { TimeTrackingFeedback } from "@/components/time-tracking/time-tracking-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import {
  getRequestErrorFeedback,
  normalizeRequestError,
} from "@/lib/request-feedback";
import { formatDuration } from "@/lib/time-tracking/duration";
import {
  createDefaultTimeReportFilters,
  normalizeTimeReportFilters,
} from "@/lib/time-tracking/reporting";
import { timeTrackingRepository } from "@/lib/time-tracking/time-tracking-repository";
import type { TimeCategoryRow, TimeEntryPage } from "@/types/time-tracking";

const HISTORY_PAGE_SIZE = 10;
const emptyPage: TimeEntryPage = {
  entries: [],
  page: 1,
  pageSize: HISTORY_PAGE_SIZE,
  totalCount: 0,
  totalPages: 1,
};

/** Exibe o histórico paginado com filtros independentes da semana em edição. */
export function TimeEntryHistory({
  categories,
  refreshVersion,
  today,
  userId,
}: {
  categories: TimeCategoryRow[];
  refreshVersion: number;
  today: string;
  userId: string;
}) {
  const defaults = useMemo(() => createDefaultTimeReportFilters(today), [today]);
  const [draftFilters, setDraftFilters] = useState(defaults);
  const [appliedFilters, setAppliedFilters] = useState(defaults);
  const [currentPage, setCurrentPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(emptyPage);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setErrorMessage(null);
    setHistoryPage({ ...emptyPage, page: currentPage });
    timeTrackingRepository
      .listEntriesPage(userId, {
        categoryId: appliedFilters.categoryId || undefined,
        endDate: appliedFilters.endDate,
        page: currentPage,
        pageSize: HISTORY_PAGE_SIZE,
        startDate: appliedFilters.startDate,
        task: appliedFilters.task || undefined,
      })
      .then((nextPage) => {
        if (!isCurrent) return;
        if (currentPage > nextPage.totalPages) {
          setCurrentPage(nextPage.totalPages);
          return;
        }
        setHistoryPage(nextPage);
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        setErrorMessage(getHistoryError(error));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [
    appliedFilters.categoryId,
    appliedFilters.endDate,
    appliedFilters.startDate,
    appliedFilters.task,
    currentPage,
    refreshVersion,
    userId,
  ]);

  function applyFilters() {
    try {
      setAppliedFilters(normalizeTimeReportFilters(draftFilters, today));
      setCurrentPage(1);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Revise os filtros.");
    }
  }

  function resetFilters() {
    setDraftFilters(defaults);
    setAppliedFilters(defaults);
    setCurrentPage(1);
    setErrorMessage(null);
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <History className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-left text-lg">Histórico</CardTitle>
            <p className="text-sm text-muted-foreground">
              Consulte lançamentos por período, tarefa e categoria.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <TimeReportFiltersForm
          categories={categories}
          disabled={isLoading}
          filters={draftFilters}
          idPrefix="history"
          today={today}
          onChange={setDraftFilters}
          onReset={resetFilters}
          onSubmit={applyFilters}
        />
        {errorMessage ? (
          <TimeTrackingFeedback feedback={{ type: "error", message: errorMessage }} />
        ) : (
          <HistoryResults
            categories={categories}
            historyPage={historyPage}
            isLoading={isLoading}
            onPageChange={setCurrentPage}
          />
        )}
      </CardContent>
    </Card>
  );
}

function HistoryResults({
  categories,
  historyPage,
  isLoading,
  onPageChange,
}: {
  categories: TimeCategoryRow[];
  historyPage: TimeEntryPage;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}) {
  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Carregando histórico...</p>;
  }
  if (historyPage.entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-4 py-10 text-center">
        <p className="text-sm font-medium">Nenhum apontamento encontrado.</p>
        <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou registre um novo lançamento.</p>
      </div>
    );
  }
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  return (
    <div className="space-y-4">
      <div className="divide-y rounded-md border">
        {historyPage.entries.map((entry) => {
          const category = categoriesById.get(entry.category_id);
          return (
            <article key={entry.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="min-w-0 space-y-1">
                <p className="break-words text-sm font-medium">{entry.task}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(entry.entry_date)} · {category?.name ?? "Categoria removida"}
                  {category?.archived_at ? " (arquivada)" : ""}
                </p>
              </div>
              <strong className="whitespace-nowrap text-sm">{formatDuration(entry.duration_minutes)}</strong>
            </article>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>{historyPage.totalCount} {historyPage.totalCount === 1 ? "resultado" : "resultados"}</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={historyPage.page <= 1}
            aria-label="Página anterior do histórico"
            onClick={() => onPageChange(historyPage.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>Página {historyPage.page} de {historyPage.totalPages}</span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={historyPage.page >= historyPage.totalPages}
            aria-label="Próxima página do histórico"
            onClick={() => onPageChange(historyPage.page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function getHistoryError(error: unknown): string {
  return getRequestErrorFeedback(
    "list_time_entry_history",
    normalizeRequestError(error),
    "Não foi possível carregar o histórico. Tente novamente.",
  );
}
