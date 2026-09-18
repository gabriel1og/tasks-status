"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { EnvironmentTrackingTable } from "@/components/environments/environment-tracking-table";
import { AreaEnvironmentTrackingTable } from "@/components/environments/area-environment-tracking-table";
import { Button } from "@/components/ui/button";
import {
  getMissingTrackedEnvironmentDefinitions,
  resolveTrackedEnvironmentColumns,
  type TrackedEnvironmentColumn,
} from "@/lib/environment-tracking";
import { buildTaskEnvironmentAvailability } from "@/lib/task-environments";
import { getRequestErrorFeedback } from "@/lib/request-feedback";
import { supabase } from "@/lib/supabase";
import type {
  TagOptionRow,
  TaskArea,
  TaskEnvironmentAreaStatus,
  TaskEnvironmentAreaStatusInsert,
  TaskEnvironmentAreaStatusRow,
  TaskEnvironmentStatusInsert,
  TaskEnvironmentStatusRow,
  TaskStatusRow,
} from "@/types/database";

/** Carrega e persiste a visão de ambientes. Exemplo: <EnvironmentTrackingWorkspace user={user} />. */
export function EnvironmentTrackingWorkspace({ user }: { user: User }) {
  const [view, setView] = useState<"availability" | "areas">("availability");
  const [tasks, setTasks] = useState<TaskStatusRow[]>([]);
  const [tags, setTags] = useState<TagOptionRow[]>([]);
  const [environmentStatuses, setEnvironmentStatuses] = useState<
    TaskEnvironmentStatusRow[]
  >([]);
  const [areaStatuses, setAreaStatuses] = useState<
    TaskEnvironmentAreaStatusRow[]
  >([]);
  const [savingStatusKeys, setSavingStatusKeys] = useState<string[]>([]);
  const [savingAreaStatusKeys, setSavingAreaStatusKeys] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const environmentTags = useMemo(
    () => tags.filter((tag) => tag.tipo === "ambiente"),
    [tags],
  );
  const columns = useMemo(
    () => resolveTrackedEnvironmentColumns(environmentTags),
    [environmentTags],
  );
  const availability = useMemo(
    () => buildTaskEnvironmentAvailability(environmentStatuses),
    [environmentStatuses],
  );

  useEffect(() => {
    loadEnvironmentTracking(user.id);
  }, [user.id]);

  async function loadEnvironmentTracking(userId: string) {
    setIsLoading(true);
    setFeedback("");

    const [taskResult, tagResult] = await Promise.all([
      supabase
        .from("task_statuses")
        .select("*")
        .eq("user_id", userId)
        .eq("is_future", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("tag_options")
        .select("*")
        .eq("user_id", userId)
        .order("tipo")
        .order("nome"),
    ]);
    const loadError = taskResult.error ?? tagResult.error;

    if (loadError) {
      setFeedback(
        getRequestErrorFeedback(
          "load_environment_tracking",
          loadError,
          "Não foi possível carregar o rastreamento de ambientes.",
        ),
      );
      setIsLoading(false);
      return;
    }

    const loadedTasks = (taskResult.data ?? []) as TaskStatusRow[];
    const loadedTags = await ensureTrackedEnvironmentTags(
      userId,
      (tagResult.data ?? []) as TagOptionRow[],
    );
    const taskIds = loadedTasks.map((task) => task.id);
    const [loadedStatuses, loadedAreaStatuses] = await Promise.all([
      loadTaskEnvironmentStatuses(userId, taskIds),
      loadTaskEnvironmentAreaStatuses(userId, taskIds),
    ]);

    setTasks(loadedTasks);
    setTags(loadedTags);
    setEnvironmentStatuses(loadedStatuses);
    setAreaStatuses(loadedAreaStatuses);
    setIsLoading(false);
  }

  async function ensureTrackedEnvironmentTags(
    userId: string,
    loadedTags: TagOptionRow[],
  ) {
    const environmentTagRows = loadedTags.filter(
      (tag) => tag.tipo === "ambiente",
    );
    const missingDefinitions =
      getMissingTrackedEnvironmentDefinitions(environmentTagRows);

    if (!missingDefinitions.length) {
      return loadedTags;
    }

    const { error } = await supabase
      .from("tag_options")
      .upsert(
        missingDefinitions.map((definition) => ({
          user_id: userId,
          tipo: "ambiente" as const,
          nome: definition.persistedName,
          cor: definition.color,
        })),
        {
          onConflict: "user_id,tipo,nome",
          ignoreDuplicates: true,
        },
      )
      .select("id");

    if (error) {
      setFeedback(
        getRequestErrorFeedback(
          "ensure_tracked_environment_tags",
          error,
          "Os ambientes padrão não puderam ser preparados. Revise as Configurações.",
        ),
      );
      return loadedTags;
    }

    const { data: refreshedTags, error: refreshError } = await supabase
      .from("tag_options")
      .select("*")
      .eq("user_id", userId)
      .order("tipo")
      .order("nome");

    if (refreshError) {
      setFeedback(
        getRequestErrorFeedback(
          "refresh_tracked_environment_tags",
          refreshError,
          "Os ambientes foram preparados, mas não puderam ser recarregados.",
        ),
      );
      return loadedTags;
    }

    return (refreshedTags ?? []) as TagOptionRow[];
  }

  async function loadTaskEnvironmentStatuses(
    userId: string,
    taskIds: string[],
  ) {
    if (!taskIds.length) {
      return [];
    }

    const { data: statusRows, error } = await supabase
      .from("task_environment_statuses")
      .select("*")
      .eq("user_id", userId)
      .in("task_id", taskIds);

    if (error) {
      setFeedback(
        getRequestErrorFeedback(
          "load_environment_tracking_statuses",
          error,
          "Não foi possível carregar os status dos ambientes.",
        ),
      );
      return [];
    }

    return (statusRows ?? []) as TaskEnvironmentStatusRow[];
  }

  async function loadTaskEnvironmentAreaStatuses(
    userId: string,
    taskIds: string[],
  ) {
    if (!taskIds.length) {
      return [];
    }

    const { data: statusRows, error } = await supabase
      .from("task_environment_area_statuses")
      .select("*")
      .eq("user_id", userId)
      .in("task_id", taskIds);

    if (error) {
      setFeedback(
        getRequestErrorFeedback(
          "load_task_environment_area_statuses",
          error,
          "Não foi possível carregar o rastreamento entre as áreas.",
        ),
      );
      return [];
    }

    return (statusRows ?? []) as TaskEnvironmentAreaStatusRow[];
  }

  async function toggleEnvironment(
    task: TaskStatusRow,
    column: TrackedEnvironmentColumn,
    available: boolean,
  ) {
    if (!column.tag) {
      return;
    }

    const statusKey = `${task.id}:${column.tag.id}`;
    setFeedback("");
    setSavingStatusKeys((currentKeys) => [...currentKeys, statusKey]);

    const payload: TaskEnvironmentStatusInsert = {
      user_id: user.id,
      task_id: task.id,
      environment_tag_id: column.tag.id,
      available,
    };
    const { data: savedStatus, error } = await supabase
      .from("task_environment_statuses")
      .upsert(payload, { onConflict: "task_id,environment_tag_id" })
      .select("*")
      .single();

    setSavingStatusKeys((currentKeys) =>
      currentKeys.filter((key) => key !== statusKey),
    );
    if (error) {
      setFeedback(
        getRequestErrorFeedback(
          "toggle_environment_tracking_status",
          error,
          "Não foi possível atualizar o ambiente da tarefa.",
        ),
      );
      return;
    }

    upsertEnvironmentStatus(savedStatus as TaskEnvironmentStatusRow);
  }

  function upsertEnvironmentStatus(savedStatus: TaskEnvironmentStatusRow) {
    setEnvironmentStatuses((currentStatuses) => {
      const hasStatus = currentStatuses.some(
        (status) =>
          status.task_id === savedStatus.task_id &&
          status.environment_tag_id === savedStatus.environment_tag_id,
      );

      if (!hasStatus) {
        return [...currentStatuses, savedStatus];
      }

      return currentStatuses.map((status) =>
        status.task_id === savedStatus.task_id &&
        status.environment_tag_id === savedStatus.environment_tag_id
          ? savedStatus
          : status,
      );
    });
  }

  async function changeAreaStatus(
    task: TaskStatusRow,
    column: TrackedEnvironmentColumn,
    area: TaskArea,
    status: TaskEnvironmentAreaStatus | null,
  ) {
    if (!column.tag) {
      return;
    }

    const statusKey = `${task.id}:${column.tag.id}:${area}`;
    setFeedback("");
    setSavingAreaStatusKeys((currentKeys) => [...currentKeys, statusKey]);
    const savedStatus = status
      ? await saveAreaStatus(task.id, column.tag.id, area, status)
      : await removeAreaStatus(task.id, column.tag.id, area);
    setSavingAreaStatusKeys((currentKeys) =>
      currentKeys.filter((key) => key !== statusKey),
    );

    if (savedStatus) {
      upsertAreaStatus(savedStatus);
    }
  }

  async function saveAreaStatus(
    taskId: string,
    environmentTagId: string,
    area: TaskArea,
    status: TaskEnvironmentAreaStatus,
  ) {
    const payload: TaskEnvironmentAreaStatusInsert = {
      user_id: user.id,
      task_id: taskId,
      environment_tag_id: environmentTagId,
      area,
      status,
    };
    const { data, error } = await supabase
      .from("task_environment_area_statuses")
      .upsert(payload, { onConflict: "task_id,environment_tag_id,area" })
      .select("*")
      .single();

    if (error) {
      showAreaStatusError(error);
      return null;
    }
    return data as TaskEnvironmentAreaStatusRow;
  }

  async function removeAreaStatus(
    taskId: string,
    environmentTagId: string,
    area: TaskArea,
  ) {
    const { error } = await supabase
      .from("task_environment_area_statuses")
      .delete()
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .eq("environment_tag_id", environmentTagId)
      .eq("area", area);

    if (error) {
      showAreaStatusError(error);
      return null;
    }
    setAreaStatuses((currentStatuses) =>
      currentStatuses.filter(
        (currentStatus) =>
          currentStatus.task_id !== taskId ||
          currentStatus.environment_tag_id !== environmentTagId ||
          currentStatus.area !== area,
      ),
    );
    return null;
  }

  function showAreaStatusError(
    error: Parameters<typeof getRequestErrorFeedback>[1],
  ) {
    setFeedback(
      getRequestErrorFeedback(
        "change_task_environment_area_status",
        error,
        "Não foi possível atualizar o estado da área.",
      ),
    );
  }

  function upsertAreaStatus(savedStatus: TaskEnvironmentAreaStatusRow) {
    setAreaStatuses((currentStatuses) => {
      const otherStatuses = currentStatuses.filter(
        (currentStatus) => currentStatus.id !== savedStatus.id,
      );
      return [...otherStatuses, savedStatus];
    });
  }

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Carregando rastreamento de ambientes...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {feedback ? (
        <p role="alert" className="text-sm text-destructive">
          {feedback}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2" aria-label="Visão de ambientes">
        <Button
          type="button"
          variant={view === "availability" ? "default" : "outline"}
          aria-pressed={view === "availability"}
          onClick={() => setView("availability")}
        >
          Visão geral
        </Button>
        <Button
          type="button"
          variant={view === "areas" ? "default" : "outline"}
          aria-pressed={view === "areas"}
          onClick={() => setView("areas")}
        >
          Frontend × Backend
        </Button>
      </div>
      {view === "availability" ? (
        <EnvironmentTrackingTable
          tasks={tasks}
          tags={tags}
          columns={columns}
          availability={availability}
          savingStatusKeys={savingStatusKeys}
          onToggleEnvironment={toggleEnvironment}
        />
      ) : (
        <AreaEnvironmentTrackingTable
          tasks={tasks}
          columns={columns}
          areaStatuses={areaStatuses}
          savingStatusKeys={savingAreaStatusKeys}
          onStatusChange={changeAreaStatus}
        />
      )}
    </div>
  );
}
