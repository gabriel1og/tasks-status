"use client";

import {
  CalendarX2,
  Gauge,
  Target,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { TimeReportFiltersForm } from "@/components/time-tracking/time-report-filters";
import { TimeTrackingFeedback } from "@/components/time-tracking/time-tracking-feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import {
  getRequestErrorFeedback,
  normalizeRequestError,
} from "@/lib/request-feedback";
import { DEFAULT_DAILY_GOAL_MINUTES } from "@/lib/time-tracking/daily-goal";
import {
  formatDuration,
  formatSignedDuration,
} from "@/lib/time-tracking/duration";
import {
  buildTimeTrackingReport,
  createDefaultTimeReportFilters,
  normalizeTimeReportFilters,
  type TimeReportTotal,
  type TimeTrackingReport,
} from "@/lib/time-tracking/reporting";
import { timeTrackingRepository } from "@/lib/time-tracking/time-tracking-repository";
import { cn } from "@/lib/utils";
import type { TimeCategoryRow } from "@/types/time-tracking";

/** Consulta o período selecionado e apresenta os indicadores históricos. */
export function TimeTrackingReportDashboard({
  today,
  userId,
}: {
  today: string;
  userId: string;
}) {
  const defaults = useMemo(
    () => createDefaultTimeReportFilters(today),
    [today],
  );
  const [draftFilters, setDraftFilters] = useState(defaults);
  const [appliedFilters, setAppliedFilters] = useState(defaults);
  const [categories, setCategories] = useState<TimeCategoryRow[]>([]);
  const [report, setReport] = useState<TimeTrackingReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setErrorMessage(null);
    setReport(null);
    Promise.all([
      timeTrackingRepository.listCategories(userId, true),
      timeTrackingRepository.getSettings(userId),
      timeTrackingRepository.listNonWorkingDays(userId, {
        endDate: appliedFilters.endDate,
        startDate: appliedFilters.startDate,
      }),
      timeTrackingRepository.listEntries(userId, {
        categoryId: appliedFilters.categoryId || undefined,
        endDate: appliedFilters.endDate,
        startDate: appliedFilters.startDate,
        task: appliedFilters.task || undefined,
      }),
    ])
      .then(([nextCategories, settings, excludedDays, entries]) => {
        if (!isCurrent) return;
        setCategories(nextCategories);
        setReport(
          buildTimeTrackingReport(
            entries,
            nextCategories,
            settings?.daily_goal_minutes ?? DEFAULT_DAILY_GOAL_MINUTES,
            appliedFilters,
            excludedDays,
          ),
        );
      })
      .catch((error: unknown) => {
        if (isCurrent) setErrorMessage(getDashboardError(error));
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
    userId,
  ]);

  function applyFilters() {
    try {
      setAppliedFilters(normalizeTimeReportFilters(draftFilters, today));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Revise os filtros.",
      );
    }
  }

  function resetFilters() {
    setDraftFilters(defaults);
    setAppliedFilters(defaults);
    setErrorMessage(null);
  }

  return (
    <section className="space-y-6" aria-labelledby="historical-dashboard-title">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle
            id="historical-dashboard-title"
            className="text-left text-lg"
          >
            Dashboard histórico
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Os totais abaixo são calculados diretamente a partir dos
            apontamentos.
          </p>
        </CardHeader>
        <CardContent>
          <TimeReportFiltersForm
            categories={categories}
            disabled={isLoading}
            filters={draftFilters}
            idPrefix="dashboard"
            today={today}
            onChange={setDraftFilters}
            onReset={resetFilters}
            onSubmit={applyFilters}
          />
        </CardContent>
      </Card>

      {errorMessage ? (
        <TimeTrackingFeedback
          feedback={{ type: "error", message: errorMessage }}
        />
      ) : null}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Carregando indicadores do período...
          </CardContent>
        </Card>
      ) : report ? (
        <ReportContent report={report} />
      ) : null}
    </section>
  );
}

function ReportContent({ report }: { report: TimeTrackingReport }) {
  const progress = report.goalMinutes
    ? Math.min((report.actualMinutes / report.goalMinutes) * 100, 100)
    : 0;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportSummaryCard
          icon={Timer}
          label="Realizado"
          value={formatDuration(report.actualMinutes)}
        />
        <ReportSummaryCard
          icon={Target}
          label="Meta do período"
          value={formatDuration(report.goalMinutes)}
        />
        <ReportSummaryCard
          icon={Gauge}
          label="Saldo"
          value={formatSignedDuration(report.balanceMinutes)}
          valueClassName={
            report.balanceMinutes < 0 ? "text-destructive" : "text-primary"
          }
        />
        <ReportSummaryCard
          icon={CalendarX2}
          label="Dias sem lançamento"
          value={String(report.missingDays)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-lg">
            Meta versus realizado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
            <span>
              {formatDuration(report.actualMinutes)} de{" "}
              {formatDuration(report.goalMinutes)}
            </span>
            <span>{report.daysWithEntries} dias com lançamento</span>
          </div>
        </CardContent>
      </Card>

      {report.actualMinutes === 0 ? (
        <div className="rounded-md border border-dashed px-4 py-10 text-center">
          <p className="text-sm font-medium">
            Nenhum apontamento no período filtrado.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajuste os filtros ou registre um novo lançamento.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportBreakdown title="Total por tarefa" totals={report.taskTotals} />
        <ReportBreakdown
          title="Total por categoria"
          totals={report.categoryTotals}
          showColor
        />
        <ReportBreakdown
          title="Total por dia"
          totals={report.dailyTotals}
          formatLabel={(total) => formatDate(total.key)}
        />
        <ReportBreakdown
          title="Total por semana"
          totals={report.weeklyTotals}
          formatLabel={(total) => {
            const week = report.weeklyTotals.find(
              (item) => item.key === total.key,
            );
            return week
              ? `${formatDate(week.startDate)} a ${formatDate(week.endDate)}`
              : total.label;
          }}
        />
      </div>
    </>
  );
}

function ReportSummaryCard({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className={cn("text-xl font-semibold", valueClassName)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportBreakdown({
  formatLabel = (total) => total.label,
  showColor = false,
  title,
  totals,
}: {
  formatLabel?: (total: TimeReportTotal) => string;
  showColor?: boolean;
  title: string;
  totals: TimeReportTotal[];
}) {
  const maximum = Math.max(...totals.map((total) => total.totalMinutes), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-left text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {totals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem dados para este agrupamento.
          </p>
        ) : (
          <div className="scrollbar-clean max-h-80 space-y-4 overflow-y-auto pr-2">
            {totals.map((total) => (
              <div key={total.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    {showColor ? (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: total.color }}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="truncate">{formatLabel(total)}</span>
                  </span>
                  <strong className="whitespace-nowrap">
                    {formatDuration(total.totalMinutes)}
                  </strong>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/80"
                    style={{
                      width: `${(total.totalMinutes / maximum) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getDashboardError(error: unknown): string {
  return getRequestErrorFeedback(
    "load_time_tracking_dashboard",
    normalizeRequestError(error),
    "Não foi possível carregar o dashboard. Tente novamente.",
  );
}
