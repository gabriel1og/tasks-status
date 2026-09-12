"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import {
  FolderPlus,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  QueryLibraryNav,
  type QueryLibraryScope,
} from "@/components/queries/query-library-nav";
import { QueryList } from "@/components/queries/query-list";
import { useQueryData } from "@/components/queries/use-query-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteQuery,
  deleteQueryFolder,
  saveQueryFolder,
  setQueryFavorite,
} from "@/lib/query-repository";
import type { SavedQueryRow } from "@/types/queries";

type FolderDraft = { id?: string; name: string };
type RemovalTarget = { kind: "query" | "folder"; id: string; name: string };

/** Biblioteca de queries persistidas por conta. Ex.: <QueryLibrary user={user} />. */
export function QueryLibrary({ user }: { user: User }) {
  const workspace = useQueryData(user.id, false);
  const [scope, setScope] = useState<QueryLibraryScope>("all");
  const [search, setSearch] = useState("");
  const [folderDraft, setFolderDraft] = useState<FolderDraft | null>(null);
  const [removal, setRemoval] = useState<RemovalTarget | null>(null);
  const [notice, setNotice] = useState("");
  const cancelRemovalButtonRef = useRef<HTMLButtonElement>(null);
  const libraryTitleRef = useRef<HTMLHeadingElement>(null);
  const removalTriggerRef = useRef<HTMLElement | null>(null);
  const currentFolder = workspace.folders.find(
    (folder) => scope === `folder:${folder.id}`,
  );
  const visibleQueries = workspace.queries.filter(
    (query) =>
      matchesScope(query, scope) &&
      `${query.nome} ${query.descricao}`
        .toLocaleLowerCase("pt-BR")
        .includes(search.trim().toLocaleLowerCase("pt-BR")),
  );
  const disabled = workspace.isLoading || workspace.isMutating;

  useEffect(() => {
    if (!removal) return;
    cancelRemovalButtonRef.current?.focus();
  }, [removal]);

  useEffect(() => {
    if (workspace.isLoading || workspace.error || !scope.startsWith("folder:"))
      return;
    const folderId = scope.slice(7);
    const folderExists = workspace.folders.some(
      (folder) => folder.id === folderId,
    );
    if (!folderExists) setScope("unfiled");
  }, [scope, workspace.error, workspace.folders, workspace.isLoading]);

  async function toggleFavorite(query: SavedQueryRow): Promise<void> {
    setNotice("");
    const saved = await workspace.runMutation(
      "favorite_query",
      "Não foi possível atualizar o favorito.",
      async () => {
        await setQueryFavorite(user.id, query.id, !query.is_favorite);
        return true;
      },
    );
    if (saved) await workspace.reload();
  }

  async function submitFolder(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!folderDraft || disabled) return;
    setNotice("");
    const saved = await workspace.runMutation(
      "save_query_folder",
      "Não foi possível salvar a pasta. Verifique se já existe uma pasta com esse nome.",
      () => saveQueryFolder(user.id, folderDraft.name, folderDraft.id),
    );
    if (!saved) return;
    setFolderDraft(null);
    setScope(`folder:${saved.id}`);
    setNotice("Pasta salva.");
    await workspace.reload();
  }

  async function confirmRemoval(): Promise<void> {
    if (!removal || disabled) return;
    setNotice("");
    const removed = await workspace.runMutation(
      "delete_query_item",
      "Não foi possível excluir. Tente novamente.",
      async () => {
        if (removal.kind === "folder")
          await deleteQueryFolder(user.id, removal.id);
        else await deleteQuery(user.id, removal.id);
        return true;
      },
    );
    if (!removed) return;
    if (removal.kind === "folder") setScope("unfiled");
    setNotice(
      removal.kind === "folder"
        ? "Pasta excluída. Suas queries estão em Sem pasta."
        : "Query excluída.",
    );
    setRemoval(null);
    libraryTitleRef.current?.focus();
    await workspace.reload();
  }

  function changeScope(nextScope: QueryLibraryScope): void {
    setScope(nextScope);
    setRemoval(null);
    setFolderDraft(null);
  }

  function openRemoval(target: RemovalTarget): void {
    const activeElement = document.activeElement;
    removalTriggerRef.current =
      activeElement instanceof HTMLElement ? activeElement : null;
    setRemoval(target);
    setFolderDraft(null);
  }

  function cancelRemoval(): void {
    setRemoval(null);
    removalTriggerRef.current?.focus();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1
            ref={libraryTitleRef}
            tabIndex={-1}
            className="text-lg font-semibold outline-none"
          >
            Minhas queries
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Salve filtros para encontrar e acompanhar suas tarefas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => {
              setFolderDraft({ name: "" });
              setRemoval(null);
            }}
          >
            <FolderPlus className="h-4 w-4" />
            Nova pasta
          </Button>
          <Button asChild>
            <Link href="/queries/new">
              <Plus className="h-4 w-4" />
              Criar nova query
            </Link>
          </Button>
        </div>
      </div>
      {workspace.error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 p-3 text-sm text-destructive"
        >
          {workspace.error}
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => void workspace.reload()}
          >
            Tentar novamente
          </Button>
        </div>
      )}
      {notice && !workspace.error && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {folderDraft && (
        <form
          onSubmit={submitFolder}
          className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-4"
        >
          <div className="min-w-48 flex-1 space-y-2">
            <Label htmlFor="query-folder-name">
              {folderDraft.id ? "Renomear pasta" : "Nome da nova pasta"}
            </Label>
            <Input
              id="query-folder-name"
              autoFocus
              required
              maxLength={120}
              value={folderDraft.name}
              disabled={disabled}
              onChange={(event) =>
                setFolderDraft({ ...folderDraft, name: event.target.value })
              }
              placeholder="Ex.: Homologação"
            />
          </div>
          <Button type="submit" disabled={disabled || !folderDraft.name.trim()}>
            {workspace.isMutating && (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            )}
            Salvar pasta
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => setFolderDraft(null)}
          >
            Cancelar
          </Button>
        </form>
      )}
      {removal && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-card p-4"
        >
          <div>
            <p className="text-sm font-medium">
              Excluir {removal.kind === "folder" ? "a pasta" : "a query"} “
              {removal.name}”?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {removal.kind === "folder"
                ? "As queries serão mantidas em Sem pasta."
                : "As tarefas da query serão mantidas."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={disabled}
              ref={cancelRemovalButtonRef}
              onClick={cancelRemoval}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={disabled}
              onClick={() => void confirmRemoval()}
            >
              Excluir
            </Button>
          </div>
        </div>
      )}
      <Card className="overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          <QueryLibraryNav
            folders={workspace.folders}
            queries={workspace.queries}
            scope={scope}
            onScopeChange={changeScope}
          />
          <section className="min-w-0 flex-1" aria-label="Lista de queries">
            <div className="flex flex-wrap items-center justify-between gap-3 border-y p-4 lg:border-t-0">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="max-w-64 truncate text-sm font-semibold">
                  {currentFolder?.nome ?? scopeLabel(scope)}
                </h2>
                {currentFolder && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      aria-label={`Renomear pasta ${currentFolder.nome}`}
                      onClick={() => {
                        setFolderDraft({
                          id: currentFolder.id,
                          name: currentFolder.nome,
                        });
                        setRemoval(null);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      aria-label={`Excluir pasta ${currentFolder.nome}`}
                      onClick={() =>
                        openRemoval({
                          kind: "folder",
                          id: currentFolder.id,
                          name: currentFolder.nome,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    aria-label="Buscar queries"
                    placeholder="Buscar queries..."
                    className="pl-9"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={disabled}
                  aria-label="Atualizar queries"
                  onClick={() => void workspace.reload()}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {workspace.isLoading ? (
              <p
                role="status"
                className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"
              >
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Carregando queries...
              </p>
            ) : (
              <QueryList
                queries={visibleQueries}
                folders={workspace.folders}
                disabled={disabled}
                onFavorite={(query) => void toggleFavorite(query)}
                onDelete={(query) =>
                  openRemoval({
                    kind: "query",
                    id: query.id,
                    name: query.nome,
                  })
                }
              />
            )}
          </section>
        </div>
      </Card>
    </div>
  );
}

function matchesScope(query: SavedQueryRow, scope: QueryLibraryScope): boolean {
  if (scope === "favorites") return query.is_favorite;
  if (scope === "unfiled") return !query.folder_id;
  if (scope.startsWith("folder:")) return query.folder_id === scope.slice(7);
  return true;
}

function scopeLabel(scope: QueryLibraryScope): string {
  if (scope === "favorites") return "Favoritas";
  return scope === "unfiled" ? "Sem pasta" : "Todas as queries";
}
