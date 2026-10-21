"use client";

import { useMemo, useState } from "react";
import { Download, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildInitialOcrSeeds } from "@/lib/ocr-tracking/initial-source";
import type { OcrSeed, OcrWorkspace } from "@/types/ocr-tracking";
import { OcrModal } from "./ocr-modal";

/** Mostra associações e conflitos antes da carga transacional. Ex.: <OcrImportPreview ... />. */
export function OcrImportPreview({ workspace, onImport, onClose }: { workspace: OcrWorkspace; onImport: (seeds: OcrSeed[]) => Promise<number>; onClose: () => void }) {
  const seeds = useMemo(buildInitialOcrSeeds, []), [busy, setBusy] = useState(false), [feedback, setFeedback] = useState("");
  const existing = new Set(workspace.items.map((item) => item.source_key));
  async function importSource() { if (busy) return; setBusy(true); try { const imported = await onImport(seeds); setFeedback(`${imported} documentos importados; os existentes foram preservados.`); } catch { setFeedback("Importação não concluída. Os dados existentes foram preservados; confira o aviso da página."); } finally { setBusy(false); } }
  return <OcrModal title="Prévia da base inicial OCR" busy={busy} onClose={onClose}><div className="space-y-4">
    <p className="text-sm">41 documentos do CSV de 21/10/2026 · 28 observações originais · 39 associações ao Markdown · 28 linhas vazias ignoradas. Status legados ? e ?? significam andamento sem confirmação.</p>
    <p className="text-sm text-muted-foreground">A preparação documental pode estar registrada. IDs preenchidos não comprovam cadastro completo, e testes externos permanecem sem aprovação. Reimportar preserva registros existentes, inclusive arquivados.</p>
    <Table className="min-w-[900px]"><TableHeader><TableRow>{["Documento", "Associação", "Observação original", "Pendências / conflitos", "Importação"].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>{seeds.map((seed) => <TableRow key={seed.item.source_key}><TableCell className="max-w-72 break-words">{seed.item.filename}</TableCell><TableCell>{seed.item.source_match}</TableCell><TableCell className="max-w-96 whitespace-pre-wrap">{seed.item.source_notes || "Vazia na origem"}</TableCell><TableCell className="max-w-96"><details><summary className="cursor-pointer">{seed.issues.length} itens propostos</summary><ul className="mt-2 space-y-2">{seed.issues.map((issue, index) => <li key={index}>{issue.description}</li>)}</ul></details></TableCell><TableCell>{existing.has(seed.item.source_key) ? "Já existe: preservar" : "Novo"}</TableCell></TableRow>)}</TableBody></Table>
    {feedback && <p role="status" className="text-sm">{feedback}</p>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={onClose}><FileCheck2 className="h-4 w-4" />Fechar</Button><Button disabled={busy || seeds.every((seed) => existing.has(seed.item.source_key))} onClick={importSource}><Download className="h-4 w-4" />{busy ? "Importando..." : "Importar documentos novos"}</Button></div>
  </div></OcrModal>;
}
