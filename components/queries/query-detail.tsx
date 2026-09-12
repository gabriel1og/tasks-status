"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { QueryEditor } from "@/components/queries/query-editor";
import {
  DeleteQueryConfirmation,
  InvalidQueryDefinition,
  QueryActions,
  QueryDefinitionSummary,
  QueryLoadError,
  QueryMetadata,
} from "@/components/queries/query-detail-sections";
import { QueryResults } from "@/components/queries/query-results";
import { useQueryData } from "@/components/queries/use-query-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  deleteQuery,
  saveQuery,
  setQueryFavorite,
} from "@/lib/query-repository";
import { filterQueryTasks, validateQueryDefinition } from "@/lib/task-queries";
import type {
  QueryDefinition,
  QuerySaveInput,
  SavedQueryRow,
} from "@/types/queries";

const emptyQueryDraft: QuerySaveInput = {
  nome: "",
  descricao: "",
  folder_id: null,
  definition: { match: "all", conditions: [] },
};

/** Opens saved results or a new query editor; for example, queryId="uuid". */
export function QueryDetail({
  user,
  queryId,
}: {
  user: User;
  queryId?: string;
}) {
  const router = useRouter();
  const queryData = useQueryData(user.id);
  const [draft, setDraft] = useState<QuerySaveInput>(emptyQueryDraft);
  const [isEditing, setIsEditing] = useState(!queryId);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [hasLoadedWorkspace, setHasLoadedWorkspace] = useState(false);
  const [committedQuery, setCommittedQuery] = useState<SavedQueryRow | null>(
    null,
  );
  const savedQuery =
    committedQuery?.id === queryId
      ? committedQuery
      : queryData.queries.find((query) => query.id === queryId);
  const definition = isEditing
    ? draft.definition
    : savedQuery
      ? savedQuery.definition
      : emptyQueryDraft.definition;
  const validationError = validateQueryDefinition(definition);
  const matchingTasks = useMemo(
    () =>
      validationError ? [] : filterQueryTasks(queryData.tasks, definition),
    [queryData.tasks, definition, validationError],
  );
  const isBusy = queryData.isLoading || queryData.isMutating;

  useEffect(() => setCommittedQuery(null), [queryData.queries, queryId]);
  useEffect(() => setHasLoadedWorkspace(false), [user.id]);
  useEffect(() => {
    if (!queryData.isLoading && !queryData.error) setHasLoadedWorkspace(true);
  }, [queryData.isLoading, queryData.error]);

  async function persistQuery(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (isBusy || validationError || !draft.nome.trim()) return;
    setFeedback("");
    const saved = await queryData.runMutation(
      "save_query",
      "Não foi possível salvar a query. Tente novamente.",
      () =>
        saveQuery(
          user.id,
          {
            ...draft,
            nome: draft.nome.trim(),
            descricao: draft.descricao.trim(),
          },
          queryId,
        ),
    );
    if (!saved) return;
    setDraft(toQueryDraft(saved));
    setCommittedQuery(saved);
    if (!queryId) {
      router.replace(`/queries/${saved.id}`);
      return;
    }
    setFeedback("Query salva com sucesso.");
    setIsEditing(false);
    await queryData.reload();
  }

  async function removeQuery(): Promise<void> {
    if (!queryId || isBusy) return;
    const removed = await queryData.runMutation(
      "delete_query",
      "Não foi possível excluir a query. Tente novamente.",
      async () => {
        await deleteQuery(user.id, queryId);
        return true;
      },
    );
    if (removed) router.replace("/queries");
  }

  async function toggleFavorite(): Promise<void> {
    if (!savedQuery || isBusy) return;
    const changed = await queryData.runMutation(
      "favorite_query",
      "Não foi possível atualizar o favorito. Tente novamente.",
      async () => {
        await setQueryFavorite(user.id, savedQuery.id, !savedQuery.is_favorite);
        return true;
      },
    );
    if (!changed) return;
    setCommittedQuery({ ...savedQuery, is_favorite: !savedQuery.is_favorite });
    await queryData.reload();
  }

  function startEditing(): void {
    if (!savedQuery || isBusy || validateQueryDefinition(savedQuery.definition))
      return;
    setDraft(toQueryDraft(savedQuery));
    setFeedback("");
    setIsConfirmingDelete(false);
    setIsEditing(true);
  }

  function cancelEditing(): void {
    if (isBusy) return;
    if (!queryId) {
      router.push("/queries");
      return;
    }
    setIsEditing(false);
    setFeedback("");
  }

  function resetInvalidConditions(): void {
    if (!savedQuery || isBusy) return;
    setDraft(toQueryDraft(savedQuery, emptyQueryDraft.definition));
    setFeedback(
      "As condições foram limpas no rascunho. Adicione os novos filtros e salve a query.",
    );
    setIsConfirmingDelete(false);
    setIsEditing(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/queries">
            <ArrowLeft className="h-4 w-4" /> Todas as queries
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void queryData.reload()}
          disabled={isBusy}
        >
          <RefreshCw
            className={`h-4 w-4 ${queryData.isLoading ? "animate-spin" : ""}`}
          />{" "}
          Atualizar tarefas
        </Button>
      </div>
      {queryData.error ? (
        <QueryLoadError
          error={queryData.error}
          onRetry={() => void queryData.reload()}
          disabled={isBusy}
        />
      ) : null}
      {feedback ? (
        <p
          role="status"
          className="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm"
        >
          {feedback}
        </p>
      ) : null}
      {!hasLoadedWorkspace ? (
        !queryData.error ? (
          <p
            role="status"
            className="flex items-center gap-2 py-10 text-sm text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando query e
            tarefas...
          </p>
        ) : null
      ) : queryId && !savedQuery ? (
        !queryData.error ? (
          <Card className="p-6 text-sm text-muted-foreground">
            Esta query não foi encontrada. Ela pode ter sido excluída.
          </Card>
        ) : null
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="break-words text-xl font-semibold">
                {queryId ? savedQuery?.nome : "Nova query"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isEditing
                  ? "Defina os campos e as condições para encontrar suas tarefas."
                  : savedQuery?.descricao ||
                    "Consulta personalizada das suas tarefas."}
              </p>
              {savedQuery ? (
                <QueryMetadata
                  query={savedQuery}
                  folderName={
                    queryData.folders.find(
                      (folder) => folder.id === savedQuery.folder_id,
                    )?.nome
                  }
                />
              ) : null}
            </div>
            {savedQuery && !isEditing ? (
              <QueryActions
                query={savedQuery}
                disabled={isBusy}
                canEdit={!validationError}
                onEdit={startEditing}
                onFavorite={() => void toggleFavorite()}
                onDelete={() => {
                  setFeedback("");
                  setIsConfirmingDelete(true);
                }}
              />
            ) : null}
          </div>
          {isConfirmingDelete && savedQuery ? (
            <DeleteQueryConfirmation
              name={savedQuery.nome}
              isBusy={isBusy}
              onConfirm={() => void removeQuery()}
              onCancel={() => setIsConfirmingDelete(false)}
            />
          ) : null}
          {isEditing ? (
            <QueryEditor
              draft={draft}
              folders={queryData.folders}
              tasks={queryData.tasks}
              tags={queryData.tags}
              sprints={queryData.sprints}
              isSaving={isBusy}
              validationError={validationError}
              onChange={setDraft}
              onSave={persistQuery}
              onCancel={cancelEditing}
            />
          ) : validationError ? (
            <InvalidQueryDefinition
              disabled={isBusy}
              onReset={resetInvalidConditions}
            />
          ) : (
            <QueryDefinitionSummary definition={definition} />
          )}
          <QueryResults
            tasks={matchingTasks}
            tags={queryData.tags}
            totalCount={queryData.tasks.length}
            isPreview={isEditing}
            validationError={validationError}
          />
        </>
      )}
    </div>
  );
}

function toQueryDraft(
  query: SavedQueryRow,
  definition: QueryDefinition = query.definition,
): QuerySaveInput {
  return {
    nome: query.nome,
    descricao: query.descricao,
    folder_id: query.folder_id,
    definition: {
      ...definition,
      conditions: definition.conditions.map((condition) => ({ ...condition })),
    },
  };
}
