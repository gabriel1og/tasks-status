"use client";

import { LoaderCircle, Save, Target } from "lucide-react";
import { useEffect, useState } from "react";

import {
  TimeTrackingFeedback,
  type TimeTrackingFeedbackValue,
} from "@/components/time-tracking/time-tracking-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRequestErrorFeedback } from "@/lib/request-feedback";
import {
  DEFAULT_DAILY_GOAL_MINUTES,
  parseDailyGoalMinutes,
  splitDailyGoalMinutes,
} from "@/lib/time-tracking/daily-goal";
import { timeTrackingRepository } from "@/lib/time-tracking/time-tracking-repository";

const defaultGoalParts = splitDailyGoalMinutes(DEFAULT_DAILY_GOAL_MINUTES);

export function DailyGoalSettings({ userId }: { userId: string }) {
  const [hours, setHours] = useState(String(defaultGoalParts.hours));
  const [minutes, setMinutes] = useState(String(defaultGoalParts.minutes));
  const [savedGoalMinutes, setSavedGoalMinutes] = useState(
    DEFAULT_DAILY_GOAL_MINUTES,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] =
    useState<TimeTrackingFeedbackValue | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const storedSettings = await timeTrackingRepository.getSettings(userId);
        const settings =
          storedSettings ??
          (await timeTrackingRepository.saveSettings(userId, {
            daily_goal_minutes: DEFAULT_DAILY_GOAL_MINUTES,
          }));
        if (!isMounted) return;

        applyGoalToFields(settings.daily_goal_minutes, setHours, setMinutes);
        setSavedGoalMinutes(settings.daily_goal_minutes);
      } catch (error) {
        if (isMounted) {
          setFeedback({
            type: "error",
            message: getSettingsRequestFeedback(
              "load_time_tracking_settings",
              error,
              "Não foi possível carregar a meta diária.",
            ),
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadSettings();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  async function saveDailyGoal() {
    let dailyGoalMinutes: number;
    try {
      dailyGoalMinutes = parseDailyGoalMinutes(hours, minutes);
    } catch (error) {
      setFeedback({ type: "error", message: getValidationMessage(error) });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const settings = await timeTrackingRepository.saveSettings(userId, {
        daily_goal_minutes: dailyGoalMinutes,
      });
      applyGoalToFields(settings.daily_goal_minutes, setHours, setMinutes);
      setSavedGoalMinutes(settings.daily_goal_minutes);
      setFeedback({ type: "success", message: "Meta diária salva com sucesso." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getSettingsRequestFeedback(
          "save_time_tracking_settings",
          error,
          "Não foi possível salvar a meta diária.",
        ),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-left text-lg">Meta diária</CardTitle>
              <p className="text-sm text-muted-foreground">
                Defina quanto tempo pretende apontar em cada dia de trabalho.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void saveDailyGoal();
            }}
          >
            <fieldset disabled={isLoading || isSaving} className="space-y-3">
              <legend className="sr-only">Duração da meta diária</legend>
              <div className="grid max-w-md gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="daily-goal-hours">Horas</Label>
                  <Input
                    id="daily-goal-hours"
                    type="number"
                    min={0}
                    step={1}
                    required
                    inputMode="numeric"
                    value={hours}
                    onChange={(event) => setHours(event.target.value)}
                    aria-describedby="daily-goal-help"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily-goal-minutes">Minutos</Label>
                  <Input
                    id="daily-goal-minutes"
                    type="number"
                    min={0}
                    max={59}
                    step={1}
                    required
                    inputMode="numeric"
                    value={minutes}
                    onChange={(event) => setMinutes(event.target.value)}
                    aria-describedby="daily-goal-help"
                  />
                </div>
              </div>
              <p id="daily-goal-help" className="text-sm text-muted-foreground">
                A meta é armazenada em minutos e pode ser alterada a qualquer
                momento.
              </p>
            </fieldset>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border bg-secondary/20 px-4 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Meta atual
                </p>
                <p className="text-lg font-semibold">
                  {formatDailyGoal(savedGoalMinutes)} por dia
                </p>
              </div>
              <Button type="submit" disabled={isLoading || isSaving}>
                {isSaving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? "Salvando..." : "Salvar meta"}
              </Button>
            </div>
          </form>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Carregando configurações...
            </p>
          ) : null}
          <TimeTrackingFeedback feedback={feedback} />
        </CardContent>
      </Card>
    </div>
  );
}

function applyGoalToFields(
  dailyGoalMinutes: number,
  setHours: (value: string) => void,
  setMinutes: (value: string) => void,
): void {
  const parts = splitDailyGoalMinutes(dailyGoalMinutes);
  setHours(String(parts.hours));
  setMinutes(String(parts.minutes));
}

function formatDailyGoal(dailyGoalMinutes: number): string {
  const { hours, minutes } = splitDailyGoalMinutes(dailyGoalMinutes);
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

function getValidationMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Informe uma meta diária válida.";
}

function getSettingsRequestFeedback(
  operation: string,
  error: unknown,
  userMessage: string,
): string {
  return getRequestErrorFeedback(
    operation,
    normalizeRequestError(error),
    userMessage,
  );
}

function normalizeRequestError(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return error as {
      code?: string;
      details?: string | null;
      hint?: string | null;
      message: string;
      status?: number;
    };
  }
  return { message: String(error) };
}
