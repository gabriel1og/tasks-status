"use client";

import { useState } from "react";
import { Check, Eye, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { stages, stageLabels } from "@/lib/ocr-tracking/definitions";
import { nextOcrAction } from "@/lib/ocr-tracking/filtering";
import { analyzeOcrItem } from "@/lib/ocr-tracking/rules";
import type { OcrItem, OcrStage, OcrWorkspace } from "@/types/ocr-tracking";
import { OcrStatusBadge } from "./status-badge";

type StageTableProps = { items: OcrItem[]; workspace: OcrWorkspace; onOpen: (item: OcrItem, stage?: OcrStage) => void; onSave: (edited: OcrItem, previous: OcrItem) => Promise<void> };

/** Matriz compacta de etapas com edição por linha. Ex.: <OcrStagesTable ... />. */
export function OcrStagesTable(props: StageTableProps) {
  return <Table className="min-w-[1450px]"><TableHeader><TableRow><TableHead>Documento / fornecedor</TableHead><TableHead>Categoria NF</TableHead>
    {stages.map((stage) => <TableHead key={stage}>{stageLabels[stage]}</TableHead>)}
    <TableHead>Obrigatórios</TableHead><TableHead>Pendências</TableHead><TableHead>Responsável</TableHead><TableHead>Próxima ação</TableHead><TableHead>Ações</TableHead>
  </TableRow></TableHeader><TableBody>{props.items.map((item) => <OcrStageRow key={item.id} {...props} item={item} />)}</TableBody></Table>;
}

function OcrStageRow({ item, workspace, onOpen, onSave }: StageTableProps & { item: OcrItem }) {
  const [draft, setDraft] = useState<OcrItem | null>(null), [saving, setSaving] = useState(false);
  const report = analyzeOcrItem(item, workspace);
  async function save() { if (!draft || saving) return; setSaving(true); try { await onSave(draft, item); setDraft(null); } catch { /* Workspace retains friendly feedback and the draft. */ } finally { setSaving(false); } }
  const input = (key: "supplier" | "category" | "assignee" | "next_action", label: string) => <Input aria-label={label} disabled={saving} value={draft?.[key] ?? ""} onChange={(event) => setDraft((current) => current ? { ...current, [key]: event.target.value } : current)} />;
  return <TableRow><TableCell className="min-w-64 max-w-80">{draft ? input("supplier", "Fornecedor") : <button className="text-left font-medium hover:underline" onClick={() => onOpen(item)}>{item.supplier}</button>}<p className="mt-1 break-words text-xs text-muted-foreground">{item.filename}</p><OcrStatusBadge status={report.status} /></TableCell>
    <TableCell>{draft ? input("category", "Categoria NF") : item.category || "Não informada"}</TableCell>
    {stages.map((stage) => <TableCell key={stage}><button onClick={() => onOpen(item, stage)} aria-label={`Editar ${stageLabels[stage]} de ${item.supplier}`}><OcrStatusBadge status={report.stages[stage]} /></button></TableCell>)}
    <TableCell className="min-w-40"><span>{report.requiredLabel}</span><p className="mt-1 text-xs text-muted-foreground">{report.completedStages}/4 etapas concluídas</p></TableCell>
    <TableCell><button onClick={() => onOpen(item)} className="underline decoration-dotted" title={report.reasons.join(" ")}>{report.openIssues} abertas</button></TableCell>
    <TableCell className="min-w-40">{draft ? input("assignee", "Responsável") : item.assignee || "Sem responsável"}</TableCell>
    <TableCell className="min-w-64 max-w-80">{draft ? input("next_action", "Próxima ação") : <><p>{nextOcrAction(item, workspace)}</p><p className="mt-1 text-xs text-muted-foreground">{report.reasons.join(" ") || "Conferências concluídas."}</p></>}</TableCell>
    <TableCell><div className="flex gap-1">{draft ? <><Button size="icon" variant="ghost" disabled={saving} aria-label="Salvar linha" onClick={save}><Check className="h-4 w-4" /></Button><Button size="icon" variant="ghost" disabled={saving} aria-label="Cancelar edição" onClick={() => setDraft(null)}><X className="h-4 w-4" /></Button></> : <><Button size="icon" variant="ghost" aria-label="Editar linha" onClick={() => setDraft({ ...item })}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Abrir ficha" onClick={() => onOpen(item)}><Eye className="h-4 w-4" /></Button></>}</div></TableCell>
  </TableRow>;
}
