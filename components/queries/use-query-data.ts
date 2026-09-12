"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadQueryWorkspace,
  type QueryWorkspaceData,
} from "@/lib/query-repository";
import { getRequestErrorFeedback } from "@/lib/request-feedback";

const emptyWorkspace: QueryWorkspaceData = {
  queries: [],
  folders: [],
  tasks: [],
  tags: [],
  sprints: [],
};

function queryErrorMessage(
  operation: string,
  failure: unknown,
  fallback: string,
): string {
  const error =
    failure && typeof failure === "object" && "message" in failure
      ? (failure as { message: string; code?: string })
      : { message: String(failure) };
  return getRequestErrorFeedback(operation, error, fallback);
}

/** Carrega e atualiza o estado das queries da conta. Ex.: useQueryData(user.id). */
export function useQueryData(userId: string, includeTasks = true) {
  const [workspace, setWorkspace] =
    useState<QueryWorkspaceData>(emptyWorkspace);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState("");
  const loadVersion = useRef(0);
  const mutationPending = useRef(false);
  const mounted = useRef(true);

  const reload = useCallback(async (): Promise<void> => {
    const version = ++loadVersion.current;
    setIsLoading(true);
    setError("");
    try {
      const loadedWorkspace = await loadQueryWorkspace(userId, includeTasks);
      if (version === loadVersion.current) setWorkspace(loadedWorkspace);
    } catch (failure) {
      if (version === loadVersion.current)
        setError(
          queryErrorMessage(
            "load_queries",
            failure,
            "Não foi possível carregar as queries. Tente novamente.",
          ),
        );
    } finally {
      if (version === loadVersion.current) setIsLoading(false);
    }
  }, [userId, includeTasks]);

  useEffect(() => {
    mounted.current = true;
    setWorkspace(emptyWorkspace);
    void reload();
    return () => {
      mounted.current = false;
      loadVersion.current += 1;
    };
  }, [reload]);

  async function runMutation<T>(
    operation: string,
    fallback: string,
    action: () => Promise<T>,
  ): Promise<T | undefined> {
    if (mutationPending.current) return undefined;
    mutationPending.current = true;
    setIsMutating(true);
    setError("");
    try {
      return await action();
    } catch (failure) {
      if (mounted.current)
        setError(queryErrorMessage(operation, failure, fallback));
      return undefined;
    } finally {
      mutationPending.current = false;
      if (mounted.current) setIsMutating(false);
    }
  }

  return { ...workspace, isLoading, isMutating, error, reload, runMutation };
}
