"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  TimeEntryForm,
  type TimeEntryDraft,
} from "@/components/time-tracking/time-entry-form";
import { TimeEntryList } from "@/components/time-tracking/time-entry-list";
import {
  TimeTrackingFeedback,
  type TimeTrackingFeedbackValue,
} from "@/components/time-tracking/time-tracking-feedback";
import { WeekNavigation } from "@/components/time-tracking/week-navigation";
import { useWeeklyTimeTracking } from "@/components/time-tracking/use-weekly-time-tracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRequestErrorFeedback } from "@/lib/request-feedback";
import { formatDuration, parseDurationToMinutes } from "@/lib/time-tracking/duration";
import { timeTrackingRepository } from "@/lib/time-tracking/time-tracking-repository";
import { buildTimeEntryChanges } from "@/lib/time-tracking/time-tracking-rules";
import type { TimeEntryInput, TimeEntryRow } from "@/types/time-tracking";

type EntryMutationOptions = {
  action: () => Promise<unknown>;
  busyAction: string;
  fallbackMessage: string;
  operation: string;
  successMessage: string;
};

/** Coordena o formulário e o CRUD dos apontamentos da semana selecionada. */
export function TimeEntriesWorkspace({ userId }: { userId: string }) {
  const weeklyData = useWeeklyTimeTracking(userId);
  const activeCategories = useMemo(
    () => weeklyData.categories.filter((category) => !category.archived_at),
    [weeklyData.categories],
  );
  const [draft, setDraft] = useState<TimeEntryDraft>(() =>
    createEmptyEntryDraft(weeklyData.today, ""),
  );
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<TimeTrackingFeedbackValue | null>(null);

  useEffect(() => {
    if (draft.categoryId || activeCategories.length === 0) return;
    setDraft((current) => ({ ...current, categoryId: activeCategories[0].id }));
  }, [activeCategories, draft.categoryId]);

  useEffect(() => {
    if (editingEntryId) return;
    setDraft((current) => ({
      ...current,
      date: getDefaultEntryDate(weeklyData.weekRange, weeklyData.today),
    }));
  }, [editingEntryId, weeklyData.today, weeklyData.weekRange]);

  const maxEntryDate =
    weeklyData.weekRange.endDate < weeklyData.today
      ? weeklyData.weekRange.endDate
      : weeklyData.today;

  async function saveEntry() {
    const input = buildEntryInput(draft, setFeedback);
    if (!input) return;

    const editingEntry = editingEntryId;
    const succeeded = await runMutation({
      action: () =>
        editingEntry
          ? timeTrackingRepository.updateEntry(userId, editingEntry, input)
          : timeTrackingRepository.createEntry(userId, input),
      busyAction: editingEntry ? `edit:${editingEntry}` : "create",
      fallbackMessage:
        "Não foi possível salvar o apontamento. Verifique a data e a categoria.",
      operation: editingEntry ? "update_time_entry" : "create_time_entry",
      successMessage: editingEntry
        ? "Apontamento atualizado com sucesso."
        : "Apontamento criado com sucesso.",
    });
    if (succeeded) resetEntryForm();
  }

  function editEntry(entry: TimeEntryRow) {
    setEditingEntryId(entry.id);
    setPendingDeleteId(null);
    setDraft({
      categoryId: entry.category_id,
      date: entry.entry_date,
      duration: formatDuration(entry.duration_minutes),
      task: entry.task,
    });
    setFeedback(null);
    focusEntryForm();
  }

  async function duplicateEntry(entry: TimeEntryRow) {
    const isCategoryActive = activeCategories.some(
      (category) => category.id === entry.category_id,
    );
    if (isCategoryActive) {
      await runMutation({
        action: () =>
          timeTrackingRepository.createEntry(userId, {
            category_id: entry.category_id,
            duration_minutes: entry.duration_minutes,
            entry_date: entry.entry_date,
            task: entry.task,
          }),
        busyAction: `duplicate:${entry.id}`,
        fallbackMessage: "Não foi possível duplicar o apontamento.",
        operation: "duplicate_time_entry",
        successMessage: "Apontamento duplicado com sucesso.",
      });
      return;
    }

    setEditingEntryId(null);
    setPendingDeleteId(null);
    setDraft({
      categoryId: isCategoryActive ? entry.category_id : "",
      date: entry.entry_date,
      duration: formatDuration(entry.duration_minutes),
      task: entry.task,
    });
    setFeedback({
      type: "error",
      message: "Cópia preparada. Selecione uma categoria ativa antes de salvar.",
    });
    focusEntryForm();
  }

  async function deleteEntry(entry: TimeEntryRow) {
    const succeeded = await runMutation({
      action: () => timeTrackingRepository.deleteEntry(userId, entry.id),
      busyAction: `delete:${entry.id}`,
      fallbackMessage: "Não foi possível excluir o apontamento.",
      operation: "delete_time_entry",
      successMessage: "Apontamento excluído com sucesso.",
    });
    if (succeeded) setPendingDeleteId(null);
  }

  async function runMutation(options: EntryMutationOptions): Promise<boolean> {
    setBusyAction(options.busyAction);
    setFeedback(null);
    try {
      await options.action();
      weeklyData.refresh();
      setFeedback({ type: "success", message: options.successMessage });
      return true;
    } catch (error) {
      setFeedback({
        type: "error",
        message: getRequestErrorFeedback(
          options.operation,
          normalizeRequestError(error),
          options.fallbackMessage,
        ),
      });
      return false;
    } finally {
      setBusyAction(null);
    }
  }

  function resetEntryForm() {
    setEditingEntryId(null);
    setDraft(
      createEmptyEntryDraft(
        getDefaultEntryDate(weeklyData.weekRange, weeklyData.today),
        activeCategories[0]?.id ?? "",
      ),
    );
  }

  function navigateWeek(navigate: () => void) {
    setPendingDeleteId(null);
    setFeedback(null);
    resetEntryForm();
    navigate();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <WeekNavigation
        range={weeklyData.weekRange}
        disabled={weeklyData.isLoading || Boolean(busyAction)}
        isCurrentWeek={weeklyData.isCurrentWeek}
        onCurrentWeek={() => navigateWeek(weeklyData.goToCurrentWeek)}
        onNextWeek={() => navigateWeek(weeklyData.goToNextWeek)}
        onPreviousWeek={() => navigateWeek(weeklyData.goToPreviousWeek)}
      />

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-left text-lg">
                {editingEntryId ? "Editar apontamento" : "Novo apontamento"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Registre manualmente a data, duração, tarefa e categoria.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <TimeEntryForm
            categories={weeklyData.categories}
            draft={draft}
            isEditing={Boolean(editingEntryId)}
            isSaving={Boolean(busyAction)}
            minDate={weeklyData.weekRange.startDate}
            maxDate={maxEntryDate}
            onCancel={resetEntryForm}
            onChange={setDraft}
            onSubmit={() => void saveEntry()}
          />
          {activeCategories.length === 0 && !weeklyData.isLoading ? (
            <p role="alert" className="text-sm text-destructive">
              Crie ou reative uma categoria antes de adicionar apontamentos.
            </p>
          ) : null}
          <TimeTrackingFeedback feedback={feedback} />
          {weeklyData.loadError ? (
            <TimeTrackingFeedback
              feedback={{ type: "error", message: weeklyData.loadError }}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-lg">Apontamentos da semana</CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyData.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Carregando apontamentos...
            </p>
          ) : (
            <TimeEntryList
              entries={weeklyData.entries}
              categories={weeklyData.categories}
              busyAction={busyAction}
              pendingDeleteId={pendingDeleteId}
              onCancelDelete={() => setPendingDeleteId(null)}
              onConfirmDelete={(entry) => void deleteEntry(entry)}
              onDeleteRequest={(entry) => {
                setPendingDeleteId(entry.id);
                setFeedback(null);
              }}
              onDuplicate={(entry) => void duplicateEntry(entry)}
              onEdit={editEntry}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function createEmptyEntryDraft(date: string, categoryId: string): TimeEntryDraft {
  return { categoryId, date, duration: "", task: "" };
}

function getDefaultEntryDate(
  range: { endDate: string; startDate: string },
  today: string,
): string {
  return today >= range.startDate && today <= range.endDate
    ? today
    : range.startDate;
}

function buildEntryInput(
  draft: TimeEntryDraft,
  setFeedback: (feedback: TimeTrackingFeedbackValue) => void,
): TimeEntryInput | null {
  try {
    return buildTimeEntryChanges({
      category_id: draft.categoryId,
      duration_minutes: parseDurationToMinutes(draft.duration),
      entry_date: draft.date,
      task: draft.task,
    });
  } catch (error) {
    setFeedback({
      type: "error",
      message: error instanceof Error ? error.message : "Revise o apontamento.",
    });
    return null;
  }
}

function focusEntryForm(): void {
  window.requestAnimationFrame(() => {
    document.getElementById("time-entry-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
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
