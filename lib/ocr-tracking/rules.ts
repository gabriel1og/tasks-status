import type { OcrChecklist, OcrField, OcrIssue, OcrItem, OcrProgress, OcrReport, OcrStage, OcrWorkspace } from "@/types/ocr-tracking";
import { requiredFields, stages } from "./definitions";

/** Reconhece dispensas documentadas. Ex.: hasOcrWaiver(field). */
export function hasOcrWaiver(field: OcrField): boolean {
  return Boolean(field.waiver_reason.trim() && field.waiver_by.trim() && field.waiver_on);
}

/** Retorna pendências ainda abertas. Ex.: isOpenIssue(issue). */
export function isOpenIssue(issue: OcrIssue): boolean {
  return !["resolved", "waived"].includes(issue.status);
}

/** Resume o checklist preservando o desconhecido. Ex.: stageProgress(checklist, 1). */
export function stageProgress(checklist: OcrChecklist[], stage: OcrStage): OcrProgress {
  const rows = checklist.filter((entry) => entry.stage === stage);
  if (!rows.length) return "unknown";
  if (rows.some((entry) => entry.status === "blocked")) return "blocked";
  if (rows.every((entry) => entry.status === "done" || (entry.conditional && entry.status === "not_applicable" && entry.evidence.trim()))) return "done";
  if (rows.some((entry) => ["done", "in_progress", "not_applicable"].includes(entry.status))) return "in_progress";
  return rows.some((entry) => entry.status === "pending") ? "pending" : "unknown";
}

function fieldTreated(field: OcrField): boolean {
  if (hasOcrWaiver(field)) return true;
  if (!field.required && field.applicability === "no") return Boolean(field.notes.trim());
  if (field.required && field.availability !== "present") return false;
  return field.applicability === "yes" && field.configuration === "configured" && field.magnifier_status === "approved" && field.triage_status === "approved";
}

function reportReasons(stageStates: OcrProgress[], fields: OcrField[], openIssues: OcrIssue[]): string[] {
  const requiredMissing = requiredFields.filter(([key]) => !fields.some((field) => field.key === key && fieldTreated(field))).length;
  const conditionalMissing = fields.filter((field) => !field.required && !fieldTreated(field)).length;
  return [requiredMissing ? `Faltam validar ou dispensar formalmente ${requiredMissing} campos obrigatórios.` : "",
    conditionalMissing ? `${conditionalMissing} campos adicionais sem tratamento concluído.` : "",
    openIssues.length ? `${openIssues.length} pendências abertas.` : "",
    stageStates.filter((state) => state !== "done").length ? "Há etapas sem conclusão confirmada." : ""].filter(Boolean);
}

/** Deriva a conclusão dos fatos registrados. Ex.: analyzeOcrItem(item, workspace). */
export function analyzeOcrItem(item: OcrItem, workspace: OcrWorkspace): OcrReport {
  const fields = workspace.fields.filter((field) => field.item_id === item.id);
  const checklist = workspace.checklist.filter((entry) => entry.item_id === item.id);
  const issues = workspace.issues.filter((issue) => issue.item_id === item.id && isOpenIssue(issue));
  const stageStates = Object.fromEntries(stages.map((stage) => [stage, stageProgress(checklist, stage)])) as Record<OcrStage, OcrProgress>;
  const required = fields.filter((field) => field.required);
  const reasons = reportReasons(Object.values(stageStates), fields, issues);
  const status = deriveOverallStatus(reasons, stageStates, fields, issues);
  const approved = required.filter((field) => field.triage_status === "approved" && !hasOcrWaiver(field)).length;
  const waived = required.filter(hasOcrWaiver).length;
  return { status, stages: stageStates, approved, waived, unvalidated: Math.max(0, 6 - approved - waived),
    missing: required.filter((field) => ["absent", "incomplete"].includes(field.availability)).length,
    openIssues: issues.length, completedStages: Object.values(stageStates).filter((state) => state === "done").length, reasons,
    requiredLabel: required.every((field) => field.triage_status === "unknown") && !waived ? "Sem validação informada" : `${approved}/6 aprovados${waived ? ` · ${waived} dispensados` : ""}` };
}

function deriveOverallStatus(reasons: string[], states: Record<OcrStage, OcrProgress>, fields: OcrField[], issues: OcrIssue[]): OcrProgress {
  if (!reasons.length) return "done";
  if (issues.some((issue) => issue.status === "blocked") || Object.values(states).includes("blocked")) return "blocked";
  if (Object.values(states).some((state) => ["done", "in_progress"].includes(state)) || issues.some((issue) => issue.status === "in_progress")) return "in_progress";
  if (fields.some((field) => field.configuration === "configured" || field.triage_status !== "unknown" || field.magnifier_status !== "unknown")) return "in_progress";
  return issues.length || Object.values(states).includes("pending") ? "pending" : "unknown";
}

/** Valida decisões antes de persistir. Ex.: validateOcrField(field, previous). */
export function validateOcrField(field: OcrField, previous?: OcrField): OcrField {
  if (!field.label.trim()) throw new Error("Campo sem nome: informe o nome esperado.");
  const waiverStarted = field.waiver_reason || field.waiver_by || field.waiver_on;
  if (waiverStarted && !hasOcrWaiver(field)) throw new Error("Dispensa incompleta: informe motivo, autorizador e data.");
  if (field.required && field.applicability !== "yes") throw new Error("Campo obrigatório: use dispensa formal em vez de não se aplica.");
  if (previous && previous.regex !== field.regex) return { ...field, magnifier_status: "pending", triage_status: "pending", magnifier_value: "", triage_value: "" };
  if (field.applicability === "no" && !field.notes.trim()) throw new Error("Campo não aplicável: informe a justificativa nas observações.");
  if ((field.magnifier_status === "approved" || field.triage_status === "approved") && !field.evidence.trim()) throw new Error("Teste aprovado: informe a referência da evidência.");
  return field;
}

/** Exige justificativa das resoluções. Ex.: validateOcrIssue(issue). */
export function validateOcrIssue(issue: OcrIssue): void {
  if (!issue.description.trim()) throw new Error("Pendência vazia: informe a descrição.");
  if (["resolved", "waived"].includes(issue.status) && !issue.resolution.trim()) throw new Error("Resolução vazia: descreva a solução ou dispensa.");
  if (issue.status === "waived" && (!issue.authorized_by.trim() || !issue.authorized_on)) throw new Error("Dispensa incompleta: informe autorizador e data.");
}
