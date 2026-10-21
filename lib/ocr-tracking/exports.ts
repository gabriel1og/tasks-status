import type { OcrIssue, OcrItem, OcrWorkspace } from "@/types/ocr-tracking";
import { issueKindLabels, issueStatusLabels, progressLabels, stageLabels, stages, testLabels, triStateLabels } from "./definitions";
import { analyzeOcrItem } from "./rules";
import { nextOcrAction, summarizeOcrItems } from "./filtering";

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  const safe = /^[\s\uFEFF]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Serializa CSV seguro para Excel. Ex.: toOcrCsv([["Nome"], ["Fornecedor"]]). */
export function toOcrCsv(rows: unknown[][]): string {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}

/** Exporta todos os documentos filtrados, sem paginação. Ex.: exportOcrItems(items, workspace). */
export function exportOcrItems(items: OcrItem[], workspace: OcrWorkspace): string {
  const rows = items.map((item) => {
    const report = analyzeOcrItem(item, workspace);
    const fields = workspace.fields.filter((field) => field.item_id === item.id);
    return [item.filename, item.supplier, item.layout_id, item.sub_layout_id, item.category, item.category_id, item.subcategory, item.environment, item.tenant,
      triStateLabels[item.international], triStateLabels[item.boleto], progressLabels[report.status], ...stages.map((stage) => progressLabels[report.stages[stage]]),
      report.requiredLabel, report.openIssues, item.assignee, nextOcrAction(item, workspace), item.source_notes, item.notes,
      fields.map((field) => `${field.label}: ${testLabels[field.triage_status]}${field.waiver_reason ? `; dispensa: ${field.waiver_reason} / ${field.waiver_by} / ${field.waiver_on}` : ""}`).join("\n"), item.updated_at];
  });
  return toOcrCsv([["Arquivo", "Fornecedor", "ID layout", "ID sub-layout", "Categoria NF", "ID categoria", "Subcategoria", "Ambiente", "Tenant/filial", "Internacional", "Boleto", "Situação", ...stages.map((stage) => stageLabels[stage]), "Obrigatórios", "Pendências abertas", "Responsável", "Próxima ação", "Observação original CSV", "Observações atuais", "Campos / triagem", "Atualização"], ...rows]);
}

/** Exporta pendências do recorte. Ex.: exportOcrIssues(items, workspace). */
export function exportOcrIssues(items: OcrItem[], workspace: OcrWorkspace, issues = workspace.issues): string {
  const byId = new Map(items.map((item) => [item.id, item]));
  const rows = issues.filter((issue) => byId.has(issue.item_id)).map((issue) => [byId.get(issue.item_id)?.filename,
    issueKindLabels[issue.kind], stageLabels[issue.stage], workspace.fields.find((field) => field.id === issue.field_id)?.label ?? "",
    issue.description, issue.assignee, issue.next_action, issueStatusLabels[issue.status], issue.resolution, issue.authorized_by, issue.authorized_on]);
  return toOcrCsv([["Documento", "Tipo", "Etapa", "Campo", "Pendência", "Responsável", "Próxima ação", "Situação", "Resolução", "Autorizador", "Data autorização"], ...rows]);
}

function markdownText(value: string): string {
  return value.replace(/[\\`*_{}\[\]<>#|]/g, "\\$&").replace(/\r?\n/g, " ");
}

function documentMarkdown(item: OcrItem, workspace: OcrWorkspace, issueRows: OcrIssue[]): string {
  const report = analyzeOcrItem(item, workspace);
  const issues = issueRows.filter((issue) => issue.item_id === item.id);
  return [`## ${markdownText(item.supplier)}`, `Arquivo: ${markdownText(item.filename)}`, `Situação: ${progressLabels[report.status]} · ${report.completedStages}/4 etapas concluídas · ${report.requiredLabel}`,
    `Responsável: ${markdownText(item.assignee || "Não informado")} · Próxima ação: ${markdownText(nextOcrAction(item, workspace))}`,
    ...stages.map((stage) => `- ${stageLabels[stage]}: ${progressLabels[report.stages[stage]]}`),
    "### Pendências e decisões", ...issues.map((issue) => `- **${issueStatusLabels[issue.status]}** — ${markdownText(issue.description)} Responsável: ${markdownText(issue.assignee || "Não informado")}. Próxima ação: ${markdownText(issue.next_action)}${issue.resolution ? ` Resolução: ${markdownText(issue.resolution)}` : ""}`),
    "### Campos", ...workspace.fields.filter((field) => field.item_id === item.id).map((field) => `- ${markdownText(field.label)}: lupinha ${testLabels[field.magnifier_status]}, triagem ${testLabels[field.triage_status]}${field.waiver_reason ? `; dispensa: ${markdownText(field.waiver_reason)} (${markdownText(field.waiver_by)}, ${field.waiver_on})` : ""}`),
    `Observação original do CSV: ${markdownText(item.source_notes || "Não informada")}`].join("\n\n");
}

/** Produz relatório legível para o time. Ex.: exportOcrMarkdown(items, workspace). */
export function exportOcrMarkdown(items: OcrItem[], workspace: OcrWorkspace, issues = workspace.issues): string {
  const summary = summarizeOcrItems(items, workspace);
  return [`# Acompanhamento OCR`, `Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}. Recorte filtrado completo.`,
    `${summary.total} documentos · ${summary.done} concluídos · ${summary.open} com pendências · ${summary.blocked} bloqueados · ${summary.unknown} sem confirmação.`,
    ...items.map((item) => documentMarkdown(item, workspace, issues))].join("\n\n");
}

/** Baixa um arquivo criado pela interface. Ex.: downloadOcrExport("ocr.csv", csv, "text/csv"). */
export function downloadOcrExport(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
