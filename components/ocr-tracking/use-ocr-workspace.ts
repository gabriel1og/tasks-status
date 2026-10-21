"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getRequestErrorFeedback, normalizeRequestError } from "@/lib/request-feedback";
import { importOcrSeeds, insertOcrChild, loadOcrWorkspace, ocrTables, updateOcrRow, type OcrMutableTable } from "@/lib/ocr-tracking/repository";
import type { OcrChecklist, OcrField, OcrIssue, OcrItem, OcrSeed, OcrWorkspace } from "@/types/ocr-tracking";

const emptyWorkspace: OcrWorkspace = { items: [], checklist: [], fields: [], issues: [] };
type MutableRow = OcrItem | OcrField | OcrIssue | OcrChecklist;

/** Mantém gravação e atualização com falhas separadas. Ex.: useOcrWorkspace(user.id). */
export function useOcrWorkspace(userId: string) {
  const [workspace, setWorkspace] = useState<OcrWorkspace>(emptyWorkspace);
  const [feedback, setFeedback] = useState(""), [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try { setWorkspace(await loadOcrWorkspace(supabase, userId)); }
    catch (error) { setFeedback(getRequestErrorFeedback("load_ocr_tracking", normalizeRequestError(error), "Não foi possível carregar o acompanhamento. Confira se a migration OCR foi aplicada e tente novamente.")); }
    finally { setLoading(false); }
  }, [userId]);
  useEffect(() => { setWorkspace(emptyWorkspace); void reload(); }, [reload]);
  async function refreshParent(itemId: string) {
    try {
      const { data: parent, error } = await supabase.from(ocrTables.items).select("*").eq("user_id", userId).eq("id", itemId).single();
      if (error) throw error;
      setWorkspace((current) => ({ ...current, items: current.items.map((item) => item.id === itemId ? parent as OcrItem : item) }));
    } catch (error) { setFeedback(getRequestErrorFeedback("refresh_ocr_item", normalizeRequestError(error), "Alteração salva. Não foi possível atualizar a data do documento; recarregue antes de editar sua identificação.")); }
  }
  async function save(table: OcrMutableTable, edited: MutableRow, previous: MutableRow): Promise<void> {
    setFeedback("");
    try { const saved = await updateOcrRow(supabase, table, { ...edited, user_id: userId }, previous); replaceRow(table, saved, setWorkspace); }
    catch (error) { setFeedback(getRequestErrorFeedback("save_ocr_tracking", normalizeRequestError(error), "Não foi possível salvar. Confira os dados ou recarregue se o registro foi alterado em outra janela.")); throw error; }
    if ("item_id" in edited) await refreshParent(edited.item_id);
  }
  async function add(table: "ocr_tracking_fields" | "ocr_tracking_issues", itemId: string, input: object) {
    setFeedback("");
    try { const saved = await insertOcrChild(supabase, table, userId, itemId, input); appendRow(table, saved, setWorkspace); }
    catch (error) { setFeedback(getRequestErrorFeedback("add_ocr_child", normalizeRequestError(error), "Não foi possível adicionar o registro. Confira os campos e tente novamente.")); throw error; }
    await refreshParent(itemId);
  }
  async function importSeeds(seeds: OcrSeed[]) {
    setFeedback("");
    let imported: number;
    try { imported = await importOcrSeeds(supabase, userId, seeds); }
    catch (error) { setFeedback(getRequestErrorFeedback("import_ocr_tracking", normalizeRequestError(error), "Não foi possível importar. A operação foi cancelada sem importação parcial.")); throw error; }
    await reload();
    return imported;
  }
  return { workspace, feedback, loading, reload, save, add, importSeeds };
}

function replaceRow(table: OcrMutableTable, saved: MutableRow, setter: React.Dispatch<React.SetStateAction<OcrWorkspace>>) {
  const key = Object.entries(ocrTables).find(([, name]) => name === table)?.[0] as keyof OcrWorkspace;
  setter((current) => ({ ...current, [key]: current[key].map((row) => row.id === saved.id ? saved : row) }));
}

function appendRow(table: OcrMutableTable, saved: MutableRow, setter: React.Dispatch<React.SetStateAction<OcrWorkspace>>) {
  const key = Object.entries(ocrTables).find(([, name]) => name === table)?.[0] as keyof OcrWorkspace;
  setter((current) => ({ ...current, [key]: [...current[key], saved] }));
}
