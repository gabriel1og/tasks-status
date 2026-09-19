"use client";

import { CalendarCheck2, Clock3, ListChecks, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { TimeTrackingFeedback } from "@/components/time-tracking/time-tracking-feedback";
import { WeekNavigation } from "@/components/time-tracking/week-navigation";
import { useWeeklyTimeTracking } from "@/components/time-tracking/use-weekly-time-tracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { DEFAULT_DAILY_GOAL_MINUTES } from "@/lib/time-tracking/daily-goal";
import { formatDuration } from "@/lib/time-tracking/duration";
import { summarizeWeek, type WeeklyDaySummary } from "@/lib/time-tracking/week";
import { cn } from "@/lib/utils";

/** Apresenta totais calculados e progresso diário para a semana selecionada. */
export function WeeklyOverview({ userId }: { userId: string }) {
  const weeklyData = useWeeklyTimeTracking(userId);
  const dailyGoalMinutes =
    weeklyData.settings?.daily_goal_minutes ?? DEFAULT_DAILY_GOAL_MINUTES;
  const days = summarizeWeek(weeklyData.entries, weeklyData.weekRange.startDate);
  const totalMinutes = days.reduce((total, day) => total + day.totalMinutes, 0);
  const daysWithEntries = days.filter((day) => day.entryCount > 0).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Acompanhe o total realizado em cada dia sem misturar os apontamentos
          com o domínio de tarefas.
        </p>
        <Button asChild>
          <Link href="/time-tracking/entries">Gerenciar apontamentos</Link>
        </Button>
      </div>

      <WeekNavigation
        range={weeklyData.weekRange}
        disabled={weeklyData.isLoading}
        isCurrentWeek={weeklyData.isCurrentWeek}
        onCurrentWeek={weeklyData.goToCurrentWeek}
        onNextWeek={weeklyData.goToNextWeek}
        onPreviousWeek={weeklyData.goToPreviousWeek}
      />

      {weeklyData.loadError ? (
        <TimeTrackingFeedback
          feedback={{ type: "error", message: weeklyData.loadError }}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={Clock3}
          label="Total da semana"
          value={formatDuration(totalMinutes)}
        />
        <SummaryCard
          icon={CalendarCheck2}
          label="Meta diária"
          value={formatDuration(dailyGoalMinutes)}
        />
        <SummaryCard
          icon={ListChecks}
          label="Dias com lançamento"
          value={`${daysWithEntries} de 7`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-lg">Visão semanal</CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyData.isLoading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Carregando resumo semanal...
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {days.map((day) => (
                <WeeklyDayCard
                  key={day.date}
                  day={day}
                  dailyGoalMinutes={dailyGoalMinutes}
                  isFuture={day.date > weeklyData.today}
                  isToday={day.date === weeklyData.today}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
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
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyDayCard({
  dailyGoalMinutes,
  day,
  isFuture,
  isToday,
}: {
  dailyGoalMinutes: number;
  day: WeeklyDaySummary;
  isFuture: boolean;
  isToday: boolean;
}) {
  const progress = Math.min((day.totalMinutes / dailyGoalMinutes) * 100, 100);

  return (
    <article
      className={cn(
        "space-y-3 rounded-md border bg-secondary/20 p-4",
        isToday && "border-primary/60 bg-primary/5",
        isFuture && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{day.label}</p>
          <p className="text-xs text-muted-foreground">{formatDate(day.date)}</p>
        </div>
        {isToday ? (
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase text-primary">
            Hoje
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-lg font-semibold">{formatDuration(day.totalMinutes)}</p>
        <p className="text-xs text-muted-foreground">
          {day.entryCount} {day.entryCount === 1 ? "apontamento" : "apontamentos"}
        </p>
      </div>
      {isFuture ? (
        <p className="text-xs text-muted-foreground">Data futura</p>
      ) : (
        <div className="space-y-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDuration(day.totalMinutes)} de {formatDuration(dailyGoalMinutes)}
          </p>
        </div>
      )}
    </article>
  );
}
