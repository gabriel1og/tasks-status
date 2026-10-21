"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { issueKindLabels, issueStatusLabels, progressLabels, stageLabels, triStateLabels } from "@/lib/ocr-tracking/definitions";
import type { OcrFilters } from "@/lib/ocr-tracking/filtering";
import type { OcrIssue, OcrItem } from "@/types/ocr-tracking";
import { ocrSelectClass } from "./editor";

/** Filtros mantidos pelo workspace, comuns às três visões. Ex.: <OcrFiltersBar ... />. */
export function OcrFiltersBar({ filters, items, issues, issueAssignee, onChange, onClear }: { filters: OcrFilters; items: OcrItem[]; issues: OcrIssue[]; issueAssignee: boolean; onChange: (key: keyof OcrFilters, value: string) => void; onClear: () => void }) {
  const progressOptions = Object.fromEntries(Object.entries(progressLabels).filter(([key]) => key !== "not_applicable"));
  const assignees = Object.fromEntries([...new Set([...items, ...issues].map((row) => row.assignee).filter(Boolean))].sort().map((value) => [value, value]));
  const select = (key: keyof OcrFilters, label: string, options: Record<string, string>) => <label key={key} className="min-w-40 flex-1 space-y-1 text-sm"><span>{label}</span><select aria-label={label} className={ocrSelectClass} value={filters[key]} onChange={(event) => onChange(key, event.target.value)}><option value="">Todos</option>{Object.entries(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
  return <div className="space-y-3"><div className="flex flex-wrap items-end gap-3">
    <label className="min-w-60 flex-1 space-y-1 text-sm"><span>Busca geral</span><Input value={filters.query} onChange={(event) => onChange("query", event.target.value)} placeholder="Fornecedor, arquivo, ID ou pendência" /></label>
    {select("status", "Situação geral", { ...progressOptions, open: "Com pendências abertas" })}
    {select("stage", "Etapa", stageLabels)}{select("stageStatus", "Situação da etapa", progressOptions)}
    {select("category", "Categoria NF", uniqueOptions(items, "category"))}
    {select("assignee", issueAssignee ? "Responsável da pendência" : "Responsável do acompanhamento", { __none: "Sem responsável", ...assignees })}
    <Button variant="outline" onClick={onClear}><RotateCcw className="h-4 w-4" />Limpar filtros</Button>
  </div><details><summary className="cursor-pointer text-sm font-medium">Filtros adicionais</summary><div className="mt-3 flex flex-wrap gap-3">
    {select("issueKind", "Tipo de pendência", issueKindLabels)}{select("issueStatus", "Situação da pendência", issueStatusLabels)}
    {select("international", "Internacional", triStateLabels)}{select("boleto", "Boleto", triStateLabels)}
    {select("required", "Campos obrigatórios", { missing: "Ausentes/incompletos", unvalidated: "Sem validação concluída" })}
    {select("environment", "Ambiente", uniqueOptions(items, "environment"))}{select("tenant", "Tenant/filial", uniqueOptions(items, "tenant"))}
    {select("archive", "Exibição", { active: "Ativos", archived: "Arquivados", all: "Todos" })}
  </div></details></div>;
}

function uniqueOptions(items: OcrItem[], key: "category" | "assignee" | "environment" | "tenant"): Record<string, string> {
  return Object.fromEntries([...new Set(items.map((item) => item[key]).filter(Boolean))].sort().map((value) => [value, value]));
}
