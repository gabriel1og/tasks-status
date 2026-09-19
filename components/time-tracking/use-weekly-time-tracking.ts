"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getRequestErrorFeedback,
  normalizeRequestError,
} from "@/lib/request-feedback";
import { DEFAULT_DAILY_GOAL_MINUTES } from "@/lib/time-tracking/daily-goal";
import { timeTrackingRepository } from "@/lib/time-tracking/time-tracking-repository";
import {
  getSaoPauloToday,
  getWeekRange,
  shiftWeekReference,
} from "@/lib/time-tracking/week";
import type {
  TimeCategoryRow,
  TimeEntryRow,
  TimeTrackingSettingsRow,
} from "@/types/time-tracking";

/** Carrega apontamentos, categorias e meta para uma semana da conta autenticada. */
export function useWeeklyTimeTracking(userId: string) {
  const today = useMemo(() => getSaoPauloToday(), []);
  const currentWeek = useMemo(() => getWeekRange(today), [today]);
  const [weekReference, setWeekReference] = useState(today);
  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [categories, setCategories] = useState<TimeCategoryRow[]>([]);
  const [settings, setSettings] = useState<TimeTrackingSettingsRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const weekRange = useMemo(() => getWeekRange(weekReference), [weekReference]);
  const isCurrentWeek = weekRange.startDate === currentWeek.startDate;

  useEffect(() => {
    let isMounted = true;

    async function loadWeek() {
      setIsLoading(true);
      setLoadError("");
      setEntries([]);
      try {
        const [loadedEntries, loadedCategories, loadedSettings] = await Promise.all([
          timeTrackingRepository.listEntries(userId, {
            startDate: weekRange.startDate,
            endDate: weekRange.endDate,
          }),
          loadTimeCategories(userId),
          loadTimeSettings(userId),
        ]);
        if (!isMounted) return;
        setEntries(loadedEntries);
        setCategories(loadedCategories);
        setSettings(loadedSettings);
      } catch (error) {
        if (!isMounted) return;
        setLoadError(
          getRequestErrorFeedback(
            "load_weekly_time_tracking",
            normalizeRequestError(error),
            "Não foi possível carregar os apontamentos da semana.",
          ),
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadWeek();
    return () => {
      isMounted = false;
    };
  }, [refreshVersion, userId, weekRange.endDate, weekRange.startDate]);

  return {
    categories,
    entries,
    isCurrentWeek,
    isLoading,
    loadError,
    settings,
    today,
    weekRange,
    goToCurrentWeek: () => setWeekReference(today),
    goToNextWeek: () => {
      if (!isCurrentWeek) {
        setWeekReference((current) => shiftWeekReference(current, 1));
      }
    },
    goToPreviousWeek: () =>
      setWeekReference((current) => shiftWeekReference(current, -1)),
    refresh: () => setRefreshVersion((current) => current + 1),
  };
}

async function loadTimeCategories(userId: string): Promise<TimeCategoryRow[]> {
  let categories = await timeTrackingRepository.listCategories(userId, true);
  if (categories.length > 0) return categories;

  await timeTrackingRepository.ensureDefaultCategories(userId);
  categories = await timeTrackingRepository.listCategories(userId, true);
  return categories;
}

async function loadTimeSettings(userId: string): Promise<TimeTrackingSettingsRow> {
  const settings = await timeTrackingRepository.getSettings(userId);
  if (settings) return settings;
  return timeTrackingRepository.saveSettings(userId, {
    daily_goal_minutes: DEFAULT_DAILY_GOAL_MINUTES,
  });
}
