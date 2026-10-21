import type { SupabaseClient } from "@supabase/supabase-js";
import type { OcrChecklist, OcrEvent, OcrField, OcrIssue, OcrItem, OcrSeed, OcrWorkspace } from "@/types/ocr-tracking";
import { validateOcrField, validateOcrIssue } from "./rules";

export const ocrTables = { items: "ocr_tracking_items", checklist: "ocr_tracking_checklist", fields: "ocr_tracking_fields", issues: "ocr_tracking_issues" } as const;
export type OcrMutableTable = typeof ocrTables[keyof typeof ocrTables];
type MutableRow = OcrItem | OcrChecklist | OcrField | OcrIssue;

/** Lê todas as páginas da conta, inclusive além do limite da API. Ex.: readOwnedRows(client, table, user.id). */
export async function readOwnedRows<T>(client: SupabaseClient, table: string, userId: string, itemId?: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; ) {
    let query = client.from(table).select("*", { count: "exact" }).eq("user_id", userId).order("id").range(offset, offset + 499);
    if (itemId) query = query.eq("item_id", itemId);
    const { data: page, error, count } = await query;
    if (error) throw error;
    rows.push(...(page ?? []) as T[]);
    offset += page?.length ?? 0;
    if (!page?.length || (count !== null && offset >= count)) return rows;
  }
}

/** Carrega o domínio sem acessar tarefas. Ex.: loadOcrWorkspace(client, user.id). */
export async function loadOcrWorkspace(client: SupabaseClient, userId: string): Promise<OcrWorkspace> {
  const [items, checklist, fields, issues] = await Promise.all([
    readOwnedRows<OcrItem>(client, ocrTables.items, userId), readOwnedRows<OcrChecklist>(client, ocrTables.checklist, userId),
    readOwnedRows<OcrField>(client, ocrTables.fields, userId), readOwnedRows<OcrIssue>(client, ocrTables.issues, userId),
  ]);
  return { items, checklist, fields, issues };
}

/** Importa atomicamente sem sobrescrever documentos existentes. Ex.: importOcrSeeds(client, user.id, seeds). */
export async function importOcrSeeds(client: SupabaseClient, userId: string, seeds: OcrSeed[]): Promise<number> {
  const { data: imported, error } = await client.rpc("import_ocr_tracking", { p_user_id: userId, p_documents: seeds });
  if (error) throw error;
  return Number(imported);
}

/** Salva com controle de concorrência. Ex.: updateOcrRow(client, "ocr_tracking_items", edited, previous). */
export async function updateOcrRow<T extends MutableRow>(client: SupabaseClient, table: OcrMutableTable, edited: T, previous: T): Promise<T> {
  let payload: MutableRow = edited;
  if (table === ocrTables.fields) payload = validateOcrField(edited as OcrField, previous as OcrField);
  if (table === ocrTables.issues) validateOcrIssue(edited as OcrIssue);
  const { id, user_id, created_at, updated_at, ...changes } = payload;
  const { data: saved, error } = await client.from(table).update(changes).eq("user_id", user_id).eq("id", id).eq("updated_at", previous.updated_at).select("*").single();
  if (error) throw error;
  return saved as T;
}

/** Adiciona um campo ou pendência à conta. Ex.: insertOcrChild(client, table, user.id, item.id, input). */
export async function insertOcrChild<T extends OcrField | OcrIssue>(client: SupabaseClient, table: "ocr_tracking_fields" | "ocr_tracking_issues", userId: string, itemId: string, input: object): Promise<T> {
  const { data: saved, error } = await client.from(table).insert({ ...input, user_id: userId, item_id: itemId }).select("*").single();
  if (error) throw error;
  return saved as T;
}

/** Lê o histórico apenas do documento selecionado. Ex.: loadOcrEvents(client, user.id, item.id). */
export async function loadOcrEvents(client: SupabaseClient, userId: string, itemId: string): Promise<OcrEvent[]> {
  const events = await readOwnedRows<OcrEvent>(client, "ocr_tracking_events", userId, itemId);
  return events.sort((left, right) => right.created_at.localeCompare(left.created_at));
}
