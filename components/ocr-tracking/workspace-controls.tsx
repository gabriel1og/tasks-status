"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { summarizeOcrItems } from "@/lib/ocr-tracking/filtering";
import {
  downloadOcrExport,
  exportOcrItems,
  exportOcrIssues,
  exportOcrMarkdown,
} from "@/lib/ocr-tracking/exports";
import type { OcrIssue, OcrItem, OcrWorkspace } from "@/types/ocr-tracking";
import { ocrSelectClass } from "./editor";

/** Cabeçalho de ações e exportações do recorte completo. Ex.: <OcrToolbar ... />. */
export function OcrToolbar({
  items,
  issues,
  workspace,
  loading,
  onNew,
  onImport,
  onReload,
}: {
  items: OcrItem[];
  issues: OcrIssue[];
  workspace: OcrWorkspace;
  loading: boolean;
  onNew: () => void;
  onImport: () => void;
  onReload: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">Acompanhamento OCR</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Etapas, campos e pendências da configuração de layouts. Atualização
          manual, com evidências e próxima ação para o time.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={loading} onClick={onNew}>
          <Plus className="h-4 w-4" />
          Novo acompanhamento
        </Button>
        <Button disabled={loading} variant="outline" onClick={onImport}>
          <Upload className="h-4 w-4" />
          Importar base inicial
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={loading}
          aria-label="Recarregar acompanhamento"
          onClick={onReload}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <label className="flex items-center gap-1 text-sm">
          <Download className="h-4 w-4" />
          <select
            aria-label="Exportar recorte completo"
            className={ocrSelectClass}
            value=""
            disabled={loading || !items.length}
            onChange={(event) =>
              exportSelection(event.target.value, items, workspace, issues)
            }
          >
            <option value="">Exportar</option>
            <option value="items">CSV de acompanhamentos</option>
            <option value="issues">CSV de pendências</option>
            <option value="markdown">Relatório Markdown</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function exportSelection(
  format: string,
  items: OcrItem[],
  workspace: OcrWorkspace,
  issues: OcrIssue[],
) {
  if (format === "items")
    downloadOcrExport(
      "ocr-acompanhamentos.csv",
      exportOcrItems(items, workspace),
      "text/csv",
    );
  if (format === "issues")
    downloadOcrExport(
      "ocr-pendencias.csv",
      exportOcrIssues(items, workspace, issues),
      "text/csv",
    );
  if (format === "markdown")
    downloadOcrExport(
      "ocr-relatorio.md",
      exportOcrMarkdown(items, workspace, issues),
      "text/markdown",
    );
}

/** Indicadores clicáveis referentes aos filtros ativos. Ex.: <OcrSummary ... />. */
export function OcrSummary({
  items,
  workspace,
  onFilter,
}: {
  items: OcrItem[];
  workspace: OcrWorkspace;
  onFilter: (value: string) => void;
}) {
  const summary = summarizeOcrItems(items, workspace);
  const metrics = [
    ["total", "Total de documentos", ""],
    ["done", "Concluídos", "done"],
    ["open", "Com pendências abertas", "open"],
    ["blocked", "Com bloqueios", "blocked"],
    ["unknown", "Sem confirmação", "unknown"],
  ] as const;
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        Indicadores do recorte filtrado. Clique para filtrar a situação.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([key, label, filter]) => (
          <Card key={key}>
            <CardContent className="p-0">
              <button
                onClick={() => onFilter(filter)}
                className="w-full p-4 text-left"
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{summary[key]}</p>
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Paginação visual posterior aos filtros. Ex.: <OcrPagination ... />. */
export function OcrPagination({
  page,
  size,
  total,
  onPage,
  onSize,
}: {
  page: number;
  size: number;
  total: number;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p>
        {total} resultados · Página {page} de {pages}
      </p>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          <p className="flex items-center gap-2 w-36">Por página</p>
          <select
            className={ocrSelectClass}
            value={size}
            onChange={(event) => onSize(Number(event.target.value))}
          >
            {[25, 50, 100].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <Button
          size="icon"
          variant="outline"
          disabled={page <= 1}
          aria-label="Página anterior"
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          disabled={page >= pages}
          aria-label="Próxima página"
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
