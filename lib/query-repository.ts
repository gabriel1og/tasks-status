import { supabase } from "@/lib/supabase";
import { validateQueryDefinition } from "@/lib/task-queries";
import type { SprintRow, TagOptionRow, TaskStatusRow } from "@/types/database";
import type {
  QueryFolderRow,
  QuerySaveInput,
  SavedQueryRow,
} from "@/types/queries";

type QueryTableRows = {
  saved_queries: SavedQueryRow;
  query_folders: QueryFolderRow;
  task_statuses: TaskStatusRow;
  tag_options: TagOptionRow;
  sprints: SprintRow;
};

export type QueryWorkspaceData = {
  queries: SavedQueryRow[];
  folders: QueryFolderRow[];
  tasks: TaskStatusRow[];
  tags: TagOptionRow[];
  sprints: SprintRow[];
};

async function loadOwnedRows<Table extends keyof QueryTableRows>(
  table: Table,
  userId: string,
): Promise<QueryTableRows[Table][]> {
  const rows: QueryTableRows[Table][] = [];
  let totalRows = Infinity;
  while (rows.length < totalRows) {
    const { data, error, count } = await supabase
      .from(table)
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("id")
      .range(rows.length, rows.length + 499);
    if (error) throw error;
    totalRows = count ?? Infinity;
    if (!data?.length) break;
    rows.push(...(data as QueryTableRows[Table][]));
  }
  return rows;
}

/** Carrega registros da conta, incluindo todas as páginas. Ex.: loadQueryWorkspace(user.id). */
export async function loadQueryWorkspace(
  userId: string,
  includeTasks = true,
): Promise<QueryWorkspaceData> {
  const [queries, folders, tasks, tags, sprints] = await Promise.all([
    loadOwnedRows("saved_queries", userId),
    loadOwnedRows("query_folders", userId),
    includeTasks ? loadOwnedRows("task_statuses", userId) : Promise.resolve([]),
    includeTasks ? loadOwnedRows("tag_options", userId) : Promise.resolve([]),
    includeTasks ? loadOwnedRows("sprints", userId) : Promise.resolve([]),
  ]);
  queries.sort((left, right) =>
    right.updated_at.localeCompare(left.updated_at),
  );
  folders.sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"));
  tasks.sort((left, right) => right.created_at.localeCompare(left.created_at));
  return { queries, folders, tasks, tags, sprints };
}

/** Salva os critérios, nunca uma cópia das tarefas. Ex.: saveQuery(user.id, input, query.id). */
export async function saveQuery(
  userId: string,
  input: QuerySaveInput,
  queryId?: string,
): Promise<SavedQueryRow> {
  const definitionError = validateQueryDefinition(input.definition);
  if (definitionError) throw new Error(definitionError);
  const changes = {
    ...input,
    nome: input.nome.trim(),
    descricao: input.descricao.trim(),
  };
  if (!changes.nome || changes.nome.length > 120)
    throw new Error("Nome da query deve ter entre 1 e 120 caracteres.");
  const request = queryId
    ? supabase
        .from("saved_queries")
        .update(changes)
        .eq("id", queryId)
        .eq("user_id", userId)
    : supabase.from("saved_queries").insert({ ...changes, user_id: userId });
  const { data, error } = await request.select("*").single();
  if (error) throw error;
  return data as SavedQueryRow;
}

/** Remove somente a query da conta. Ex.: deleteQuery(user.id, query.id). */
export async function deleteQuery(
  userId: string,
  queryId: string,
): Promise<void> {
  const { error } = await supabase
    .from("saved_queries")
    .delete()
    .eq("id", queryId)
    .eq("user_id", userId)
    .select("id")
    .single();
  if (error) throw error;
}

/** Persiste o favorito da conta. Ex.: setQueryFavorite(user.id, query.id, true). */
export async function setQueryFavorite(
  userId: string,
  queryId: string,
  isFavorite: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("saved_queries")
    .update({ is_favorite: isFavorite })
    .eq("id", queryId)
    .eq("user_id", userId)
    .select("id")
    .single();
  if (error) throw error;
}

/** Cria ou renomeia uma pasta. Ex.: saveQueryFolder(user.id, "Homologação"). */
export async function saveQueryFolder(
  userId: string,
  name: string,
  folderId?: string,
): Promise<QueryFolderRow> {
  const nome = name.trim();
  if (!nome || nome.length > 120)
    throw new Error("Nome da pasta deve ter entre 1 e 120 caracteres.");
  const request = folderId
    ? supabase
        .from("query_folders")
        .update({ nome })
        .eq("id", folderId)
        .eq("user_id", userId)
    : supabase.from("query_folders").insert({ nome, user_id: userId });
  const { data, error } = await request.select("*").single();
  if (error) throw error;
  return data as QueryFolderRow;
}

/** Exclui a pasta; o banco preserva suas queries na raiz. Ex.: deleteQueryFolder(user.id, folder.id). */
export async function deleteQueryFolder(
  userId: string,
  folderId: string,
): Promise<void> {
  const { error } = await supabase
    .from("query_folders")
    .delete()
    .eq("id", folderId)
    .eq("user_id", userId)
    .select("id")
    .single();
  if (error) throw error;
}
