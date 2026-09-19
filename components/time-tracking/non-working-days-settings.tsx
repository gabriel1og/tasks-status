"use client";

import { CalendarOff, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  TimeTrackingFeedback,
  type TimeTrackingFeedbackValue,
} from "@/components/time-tracking/time-tracking-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { formatDate } from "@/lib/format";
import {
  getRequestErrorFeedback,
  normalizeRequestError,
} from "@/lib/request-feedback";
import {
  buildNonWorkingDayInputs,
  nonWorkingDayReasonLabels,
} from "@/lib/time-tracking/non-working-days";
import { timeTrackingRepository } from "@/lib/time-tracking/time-tracking-repository";
import { getSaoPauloToday } from "@/lib/time-tracking/week";
import type {
  TimeNonWorkingDayInput,
  TimeNonWorkingDayReason,
  TimeNonWorkingDayRow,
} from "@/types/time-tracking";

/** Permite retirar feriados, férias e exceções da jornada calculada. */
export function NonWorkingDaysSettings({ userId }: { userId: string }) {
  const today = getSaoPauloToday();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState<TimeNonWorkingDayReason>("holiday");
  const [note, setNote] = useState("");
  const [days, setDays] = useState<TimeNonWorkingDayRow[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>("load");
  const [feedback, setFeedback] = useState<TimeTrackingFeedbackValue | null>(null);

  useEffect(() => {
    let isMounted = true;
    timeTrackingRepository
      .listNonWorkingDays(userId)
      .then((loadedDays) => {
        if (isMounted) setDays(loadedDays);
      })
      .catch((error: unknown) => {
        if (isMounted) setFeedback(createDaysRequestFeedback("load", error));
      })
      .finally(() => {
        if (isMounted) setBusyAction(null);
      });
    return () => {
      isMounted = false;
    };
  }, [userId]);

  async function saveDays() {
    let inputs: TimeNonWorkingDayInput[];
    try {
      inputs = buildNonWorkingDayInputs({ endDate, note, reason, startDate });
    } catch (error) {
      setFeedback({ type: "error", message: getValidationMessage(error) });
      return;
    }

    setBusyAction("save");
    setFeedback(null);
    try {
      await timeTrackingRepository.saveNonWorkingDays(userId, inputs);
      setDays(await timeTrackingRepository.listNonWorkingDays(userId));
      setNote("");
      setFeedback({
        type: "success",
        message: inputs.length === 1
          ? "Dia sem apontamento salvo."
          : `${inputs.length} dias úteis foram marcados sem apontamento.`,
      });
    } catch (error) {
      setFeedback(createDaysRequestFeedback("save", error));
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteDay(day: TimeNonWorkingDayRow) {
    setBusyAction(`delete:${day.id}`);
    setFeedback(null);
    try {
      await timeTrackingRepository.deleteNonWorkingDay(userId, day.id);
      setDays((current) => current.filter((item) => item.id !== day.id));
      setFeedback({ type: "success", message: "Dia voltou a contar na meta." });
    } catch (error) {
      setFeedback(createDaysRequestFeedback("delete", error));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CalendarOff className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-left text-lg">Dias sem apontamento</CardTitle>
              <p className="text-sm text-muted-foreground">
                Retire feriados, férias e outras ausências dos cálculos de horas.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveDays();
            }}
          >
            <fieldset disabled={Boolean(busyAction)} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="non-working-start">Data inicial</Label>
                <DateField
                  id="non-working-start"
                  label="Data inicial sem apontamento"
                  value={startDate}
                  maxDate={endDate}
                  required
                  onChange={setStartDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="non-working-end">Data final</Label>
                <DateField
                  id="non-working-end"
                  label="Data final sem apontamento"
                  value={endDate}
                  minDate={startDate}
                  required
                  onChange={setEndDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="non-working-reason">Motivo</Label>
                <Select
                  id="non-working-reason"
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value as TimeNonWorkingDayReason)
                  }
                >
                  {Object.entries(nonWorkingDayReasonLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="non-working-note">Observação opcional</Label>
                <Input
                  id="non-working-note"
                  value={note}
                  maxLength={120}
                  placeholder="Ex.: feriado municipal"
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Sábados e domingos já são ignorados automaticamente.
              </p>
              <Button type="submit" disabled={Boolean(busyAction)}>
                {busyAction === "save" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {busyAction === "save" ? "Salvando..." : "Marcar período"}
              </Button>
            </div>
          </form>

          <TimeTrackingFeedback feedback={feedback} />
          <NonWorkingDaysList
            busyAction={busyAction}
            days={days}
            onDelete={(day) => void deleteDay(day)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function NonWorkingDaysList({
  busyAction,
  days,
  onDelete,
}: {
  busyAction: string | null;
  days: TimeNonWorkingDayRow[];
  onDelete: (day: TimeNonWorkingDayRow) => void;
}) {
  if (busyAction === "load") {
    return <p className="py-5 text-center text-sm text-muted-foreground">Carregando dias...</p>;
  }
  if (days.length === 0) {
    return <p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">Nenhum dia útil foi retirado da meta.</p>;
  }
  return (
    <div className="divide-y rounded-md border">
      {days.map((day) => (
        <div key={day.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-sm font-medium">{formatDate(day.non_working_date)}</p>
            <p className="text-xs text-muted-foreground">
              {nonWorkingDayReasonLabels[day.reason]}{day.note ? ` · ${day.note}` : ""}
            </p>
          </div>
          <Tooltip content="Voltar a contar este dia">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={Boolean(busyAction)}
              aria-label={`Remover ${formatDate(day.non_working_date)} dos dias sem apontamento`}
              onClick={() => onDelete(day)}
            >
              {busyAction === `delete:${day.id}` ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}

function createDaysRequestFeedback(
  operation: "delete" | "load" | "save",
  error: unknown,
): TimeTrackingFeedbackValue {
  const messages = {
    delete: "Não foi possível voltar a contar este dia.",
    load: "Não foi possível carregar os dias sem apontamento.",
    save: "Não foi possível salvar. Remova apontamentos existentes nessas datas.",
  };
  return {
    type: "error",
    message: getRequestErrorFeedback(
      `${operation}_time_non_working_days`,
      normalizeRequestError(error),
      messages[operation],
    ),
  };
}

function getValidationMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Revise o período informado.";
}
