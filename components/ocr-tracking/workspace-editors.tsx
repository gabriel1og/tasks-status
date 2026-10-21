"use client";

import { newChecklist, newOcrField, requiredFields } from "@/lib/ocr-tracking/definitions";
import { seedIssue } from "@/lib/ocr-tracking/initial-source";
import { validateOcrField, validateOcrIssue } from "@/lib/ocr-tracking/rules";
import { ocrTables } from "@/lib/ocr-tracking/repository";
import type { OcrChecklist, OcrField, OcrIssue, OcrItem } from "@/types/ocr-tracking";
import { OcrEditor, type OcrFormValues } from "./editor";
import { checklistEditorFields, fieldEditorFields, issueEditorFields, itemEditorFields } from "./editor-definitions";
import type { useOcrWorkspace } from "./use-ocr-workspace";

export type OcrEditorTarget =
  | { kind: "item"; row: OcrItem }
  | { kind: "newItem"; row: OcrItem }
  | { kind: "checklist"; row: OcrChecklist }
  | { kind: "field"; row: OcrField }
  | { kind: "newField"; row: OcrField }
  | { kind: "issue"; row: OcrIssue }
  | { kind: "newIssue"; row: OcrIssue };
type OcrController = ReturnType<typeof useOcrWorkspace>;

/** Conecta formulários ao domínio mantendo validação local legível. Ex.: <OcrWorkspaceEditor ... />. */
export function OcrWorkspaceEditor({ target, controller, onClose }: { target: OcrEditorTarget; controller: OcrController; onClose: () => void }) {
  const fields = editorFields(target, controller);
  const titles = { item: "Editar identificação", newItem: "Novo acompanhamento", checklist: "Editar atividade", field: "Editar campo", newField: "Adicionar campo", issue: "Editar pendência", newIssue: "Adicionar pendência" };
  return <OcrEditor title={titles[target.kind]} fields={fields} record={target.row} onClose={onClose} serverFeedback={controller.feedback}
    validate={(values) => validateEditor(target, values)} onSave={(values) => saveEditor(target, values, controller)} />;
}

function editorFields(target: OcrEditorTarget, controller: OcrController) {
  if (target.kind === "item" || target.kind === "newItem") return itemEditorFields;
  if (target.kind === "checklist") return checklistEditorFields.map((field) => field.key === "status" && !target.row.conditional ? { ...field, options: Object.fromEntries(Object.entries(field.options ?? {}).filter(([key]) => key !== "not_applicable")) } : field);
  if (target.kind === "field" || target.kind === "newField") return fieldEditorFields;
  const itemId = target.row.item_id;
  return [...issueEditorFields, { key: "field_id", label: "Campo relacionado", options: { "": "Sem vínculo", ...Object.fromEntries(controller.workspace.fields.filter((field) => field.item_id === itemId).map((field) => [field.id, field.label])) } }];
}

function mergedValues(target: OcrEditorTarget, values: OcrFormValues) {
  return { ...target.row, ...values, ...("stage" in values ? { stage: Number(values.stage) } : {}), ...("field_id" in values ? { field_id: values.field_id || null } : {}) };
}

function validateEditor(target: OcrEditorTarget, values: OcrFormValues): string {
  const merged = mergedValues(target, values);
  try {
    if (target.kind === "field" || target.kind === "newField") validateOcrField(merged as OcrField, target.kind === "field" ? target.row : undefined);
    if (target.kind === "issue" || target.kind === "newIssue") validateOcrIssue(merged as OcrIssue);
    if (target.kind === "checklist") validateChecklist(merged as OcrChecklist);
    return "";
  } catch (error) { return error instanceof Error ? error.message : "Confira os dados do formulário."; }
}

function validateChecklist(entry: OcrChecklist): void {
  if (entry.status === "done" && (!entry.evidence.trim() || !entry.confirmed_by.trim() || !entry.confirmed_on)) throw new Error("Para concluir, informe evidência, responsável e data da confirmação.");
  if (entry.status === "not_applicable" && (!entry.conditional || !entry.evidence.trim())) throw new Error("Não se aplica exige atividade condicional e justificativa.");
}

async function saveEditor(target: OcrEditorTarget, values: OcrFormValues, controller: OcrController): Promise<void> {
  const merged = mergedValues(target, values);
  if (target.kind === "newItem") {
    const { id, user_id, created_at, updated_at, ...item } = merged as OcrItem;
    await controller.importSeeds([{ item, checklist: newChecklist(), fields: requiredFields.map(([key, label]) => newOcrField(key, label, true)), issues: [] }]); return;
  }
  if (target.kind === "newField" || target.kind === "newIssue") {
    const { id, user_id, created_at, updated_at, item_id, ...input } = merged as OcrField | OcrIssue;
    await controller.add(target.kind === "newField" ? ocrTables.fields : ocrTables.issues, item_id, input); return;
  }
  const table = { item: ocrTables.items, checklist: ocrTables.checklist, field: ocrTables.fields, issue: ocrTables.issues }[target.kind];
  await controller.save(table, merged as OcrItem | OcrField | OcrIssue | OcrChecklist, target.row);
}

/** Cria rascunho com identidade estável para tentativas repetidas. Ex.: newChildTarget(item, "field"). */
export function newChildTarget(item: OcrItem, kind: "field" | "issue"): OcrEditorTarget {
  const audit = { id: "", item_id: item.id, user_id: item.user_id, created_at: "", updated_at: "" };
  return kind === "field" ? { kind: "newField", row: { ...audit, ...newOcrField(`custom_${crypto.randomUUID()}`, "") } }
    : { kind: "newIssue", row: { ...audit, ...seedIssue("review", 2, "") } };
}
