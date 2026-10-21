import type { OcrItem, OcrReport, OcrWorkspace } from "@/types/ocr-tracking";
import { analyzeOcrItem, isOpenIssue } from "./rules";

export const emptyOcrFilters = { query: "", status: "", stage: "", stageStatus: "", issueKind: "", issueStatus: "", category: "", assignee: "", international: "", boleto: "", required: "", environment: "", tenant: "", archive: "active" };
export type OcrFilters = typeof emptyOcrFilters;
export type OcrSort = "name" | "progress" | "issues" | "updated";

function normalizeOcrText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function matchesItemMetadata(item: OcrItem, filters: OcrFilters, issueAssignee: boolean): boolean {
  if (filters.archive !== "all" && Boolean(item.archived_at) !== (filters.archive === "archived")) return false;
  const pairs = ["category", "environment", "tenant", "international", "boleto"] as const;
  if (pairs.some((key) => filters[key] && item[key] !== filters[key])) return false;
  if (issueAssignee) return true;
  if (filters.assignee === "__none") return !item.assignee.trim();
  return !filters.assignee || item.assignee === filters.assignee;
}

function matchesReport(report: OcrReport, filters: OcrFilters): boolean {
  if (filters.status === "open" && !report.openIssues) return false;
  if (filters.status && filters.status !== "open" && report.status !== filters.status) return false;
  if (filters.stage && filters.stageStatus && report.stages[Number(filters.stage) as 1 | 2 | 3 | 4] !== filters.stageStatus) return false;
  if (!filters.stage && filters.stageStatus && !Object.values(report.stages).some((state) => state === filters.stageStatus)) return false;
  if (filters.required === "missing" && !report.missing) return false;
  return filters.required !== "unvalidated" || report.unvalidated > 0;
}

/** Filtra todo o recorte antes de paginar. Ex.: filterOcrItems(workspace, filters, "name"). */
export function filterOcrItems(workspace: OcrWorkspace, filters: OcrFilters, sort: OcrSort, issueAssignee = false): OcrItem[] {
  const visible = workspace.items.filter((item) => {
    const issues = workspace.issues.filter((issue) => issue.item_id === item.id);
    const searchable = [item.supplier, item.filename, item.layout_id, item.sub_layout_id, item.source_notes, item.notes, item.next_action, item.assignee, ...issues.map((issue) => `${issue.description} ${issue.next_action} ${issue.assignee}`)].join(" ");
    if (!normalizeOcrText(searchable).includes(normalizeOcrText(filters.query))) return false;
    if (!matchesItemMetadata(item, filters, issueAssignee) || !matchesReport(analyzeOcrItem(item, workspace), filters)) return false;
    if (!issueAssignee && !filters.issueKind && !filters.issueStatus) return true;
    return issues.some((issue) => (!filters.issueKind || issue.kind === filters.issueKind) && (!filters.issueStatus || issue.status === filters.issueStatus) && (!issueAssignee || !filters.assignee || (filters.assignee === "__none" ? !issue.assignee.trim() : issue.assignee === filters.assignee)));
  });
  return visible.sort((left, right) => compareOcrItems(left, right, workspace, sort));
}

function compareOcrItems(left: OcrItem, right: OcrItem, workspace: OcrWorkspace, sort: OcrSort): number {
  if (sort === "updated") return right.updated_at.localeCompare(left.updated_at) || left.id.localeCompare(right.id);
  const leftReport = analyzeOcrItem(left, workspace), rightReport = analyzeOcrItem(right, workspace);
  if (sort === "progress" && leftReport.completedStages !== rightReport.completedStages) return rightReport.completedStages - leftReport.completedStages;
  if (sort === "issues" && leftReport.openIssues !== rightReport.openIssues) return rightReport.openIssues - leftReport.openIssues;
  return left.supplier.localeCompare(right.supplier, "pt-BR", { numeric: true, sensitivity: "base" }) || left.id.localeCompare(right.id);
}

/** Resume somente o recorte ativo. Ex.: summarizeOcrItems(items, workspace). */
export function summarizeOcrItems(items: OcrItem[], workspace: OcrWorkspace) {
  const reports = items.map((item) => analyzeOcrItem(item, workspace));
  return { total: items.length, done: reports.filter((row) => row.status === "done").length,
    open: reports.filter((row) => row.openIssues > 0).length, blocked: reports.filter((row) => row.status === "blocked").length,
    unknown: reports.filter((row) => row.status === "unknown").length };
}

/** Informa próxima ação a partir das pendências abertas. Ex.: nextOcrAction(item, workspace). */
export function nextOcrAction(item: OcrItem, workspace: OcrWorkspace): string {
  return item.next_action || workspace.issues.find((issue) => issue.item_id === item.id && isOpenIssue(issue))?.next_action || "Confirmar execução e registrar evidências.";
}
