"use client";

import { useEffect, useState } from "react";
import { Archive, Pencil, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { issueKindLabels, issueStatusLabels, progressLabels, stageLabels, stages, testLabels, triStateLabels } from "@/lib/ocr-tracking/definitions";
import { analyzeOcrItem } from "@/lib/ocr-tracking/rules";
import { loadOcrEvents } from "@/lib/ocr-tracking/repository";
import { supabase } from "@/lib/supabase";
import { getRequestErrorFeedback, normalizeRequestError } from "@/lib/request-feedback";
import type { OcrChecklist, OcrEvent, OcrField, OcrIssue, OcrItem, OcrStage, OcrWorkspace } from "@/types/ocr-tracking";
import { OcrModal } from "./ocr-modal";
import { OcrFieldsTable, CopyOcrText } from "./fields-table";
import { OcrIssuesTable } from "./issues-table";
import { OcrStatusBadge } from "./status-badge";

export type OcrDetailActions = { onEditItem: (item: OcrItem) => void; onEditChecklist: (entry: OcrChecklist) => void; onEditField: (field: OcrField) => void; onEditIssue: (issue: OcrIssue) => void; onAddField: (item: OcrItem) => void; onAddIssue: (item: OcrItem) => void; onArchive: (item: OcrItem) => Promise<void> };
type DetailsProps = OcrDetailActions & { item: OcrItem; workspace: OcrWorkspace; stage?: OcrStage; activeTab?: OcrDetailTab; onTabChange?: (tab: OcrDetailTab) => void; onClose: () => void };
const tabs = { identification: "Identificação", checklist: "Checklist", fields: "Campos", issues: "Pendências", history: "Histórico" };
export type OcrDetailTab = keyof typeof tabs;

/** Ficha completa sem navegação para fora do acompanhamento. Ex.: <OcrItemDetails ... />. */
export function OcrItemDetails(props: DetailsProps) {
  const [localTab, setTab] = useState<OcrDetailTab>(props.stage ? "checklist" : "identification");
  const tab = props.activeTab ?? localTab;
  const report = analyzeOcrItem(props.item, props.workspace);
  return <OcrModal title={props.item.supplier} onClose={props.onClose}>
    <div className="mb-4 space-y-2"><OcrStatusBadge status={report.status} /><p className="text-sm text-muted-foreground">{report.requiredLabel} · {report.completedStages}/4 etapas concluídas</p><p className="text-sm">{report.reasons.join(" ") || "Conferências concluídas."}</p></div>
    <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Seções da ficha">{Object.entries(tabs).map(([key, label]) => <Button key={key} role="tab" aria-selected={tab === key} variant={tab === key ? "default" : "outline"} onClick={() => { setTab(key as OcrDetailTab); props.onTabChange?.(key as OcrDetailTab); }}>{label}</Button>)}</div>
    {tab === "identification" && <Identification {...props} />}
    {tab === "checklist" && <ChecklistDetails {...props} />}
    {tab === "fields" && <div className="space-y-3"><Button variant="outline" onClick={() => props.onAddField(props.item)}><Plus className="h-4 w-4" />Adicionar campo</Button><OcrFieldsTable fields={props.workspace.fields.filter((field) => field.item_id === props.item.id)} onEdit={props.onEditField} /></div>}
    {tab === "issues" && <div className="space-y-3"><Button variant="outline" onClick={() => props.onAddIssue(props.item)}><Plus className="h-4 w-4" />Adicionar pendência</Button><OcrIssuesTable issues={props.workspace.issues.filter((issue) => issue.item_id === props.item.id)} items={[props.item]} fields={props.workspace.fields} onEdit={props.onEditIssue} /></div>}
    {tab === "history" && <OcrHistory item={props.item} />}
  </OcrModal>;
}

function Identification({ item, onEditItem, onArchive }: DetailsProps) {
  const [busy, setBusy] = useState(false);
  const labels = { filename: "Arquivo", supplier: "Fornecedor", layout_id: "ID layout", sub_layout_id: "ID sub-layout", category: "Categoria NF", category_description: "Descrição da categoria", category_id: "ID categoria", subcategory: "Subcategoria", environment: "Ambiente", tenant: "Tenant/filial", assignee: "Responsável", next_action: "Próxima ação", source_match: "Associação à origem", notes: "Observações atuais" } as const;
  async function archive() { setBusy(true); try { await onArchive(item); } catch { /* Feedback belongs to the workspace. */ } finally { setBusy(false); } }
  return <div className="space-y-4"><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => onEditItem(item)}><Pencil className="h-4 w-4" />Editar identificação</Button><Button variant="outline" disabled={busy} onClick={archive}>{item.archived_at ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}{item.archived_at ? "Reativar" : "Arquivar"}</Button></div>
    <dl className="grid gap-3 sm:grid-cols-2">{Object.entries(labels).map(([key, label]) => <div key={key} className="min-w-0 border-b pb-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words whitespace-pre-wrap text-sm">{item[key as keyof typeof labels] || "Não informado"}{["layout_id", "sub_layout_id", "category_id"].includes(key) && item[key as keyof typeof labels] && <CopyOcrText value={item[key as keyof typeof labels]} />}</dd></div>)}<div><dt className="text-xs text-muted-foreground">Internacional / boleto</dt><dd>{triStateLabels[item.international]} / {triStateLabels[item.boleto]}</dd></div></dl>
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3"><h3 className="font-medium">Observação original do CSV</h3><p className="mt-2 whitespace-pre-wrap text-sm">{item.source_notes || "Não informada. Isso não comprova ausência de pendências."}</p></div>
    <details><summary className="cursor-pointer text-sm">Todas as colunas originais do CSV</summary><dl className="mt-2 space-y-2">{Object.entries(item.source_record).map(([key, value]) => <div key={key}><dt className="text-xs text-muted-foreground">{key}</dt><dd className="whitespace-pre-wrap text-sm">{value || "(vazio na origem)"}</dd></div>)}</dl></details>
  </div>;
}

function ChecklistDetails({ item, workspace, stage, onEditChecklist }: DetailsProps) {
  return <div className="space-y-5">{stages.filter((number) => !stage || number === stage).map((number) => <section key={number}><h3 className="mb-2 font-medium">{number} — {stageLabels[number]}</h3><Table className="min-w-[700px]"><TableHeader><TableRow>{["Atividade", "Situação", "Evidência / justificativa", "Confirmação", "Ação"].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>
    {workspace.checklist.filter((entry) => entry.item_id === item.id && entry.stage === number).map((entry) => <TableRow key={entry.id}><TableCell>{entry.label}</TableCell><TableCell>{entry.status === "not_applicable" ? "Não se aplica" : <OcrStatusBadge status={entry.status} />}</TableCell><TableCell className="max-w-96 whitespace-pre-wrap text-sm">{entry.evidence || "Não informada"}</TableCell><TableCell>{entry.confirmed_by || "Não informado"}<p className="text-xs">{entry.confirmed_on}</p></TableCell><TableCell><Button size="icon" variant="ghost" aria-label={`Editar ${entry.label}`} onClick={() => onEditChecklist(entry)}><Pencil className="h-4 w-4" /></Button></TableCell></TableRow>)}
  </TableBody></Table></section>)}{stage && <p className="text-xs text-muted-foreground">Feche a ficha e abra outra etapa na matriz para conferir as demais atividades.</p>}</div>;
}

function OcrHistory({ item }: { item: OcrItem }) {
  const [events, setEvents] = useState<OcrEvent[]>([]), [feedback, setFeedback] = useState("Carregando histórico...");
  useEffect(() => { let active = true;
    loadOcrEvents(supabase, item.user_id, item.id).then((rows) => { if (active) { setEvents(rows); setFeedback(rows.length ? "" : "Nenhuma alteração registrada."); } }).catch((error) => { if (active) setFeedback(getRequestErrorFeedback("load_ocr_history", normalizeRequestError(error), "Não foi possível carregar o histórico. Reabra esta seção para tentar novamente.")); });
    return () => { active = false; };
  }, [item.id, item.user_id]);
  return <div className="space-y-3">{feedback && <p role="status">{feedback}</p>}{events.map((event) => <article key={event.id} className="border-b pb-3 text-sm"><p className="font-medium">{event.operation === "INSERT" ? "Registro criado" : "Registro atualizado"} · {new Date(event.created_at).toLocaleString("pt-BR")} · Sua conta</p><p className="text-xs text-muted-foreground">{String(event.new_record?.label ?? event.new_record?.description ?? event.new_record?.supplier ?? "Acompanhamento")}</p><EventChanges event={event} /></article>)}</div>;
}

function EventChanges({ event }: { event: OcrEvent }) {
  const ignored = ["id", "user_id", "item_id", "created_at", "updated_at", "source_record", "source_key", "key"];
  const changes = Object.entries(event.new_record ?? {}).filter(([key, value]) => !ignored.includes(key) && (!event.old_record || JSON.stringify(value) !== JSON.stringify(event.old_record[key])));
  return <details className="mt-2"><summary className="cursor-pointer text-xs">Valores registrados</summary><dl className="mt-2 grid gap-2">{changes.map(([key, value]) => <div key={key} className="break-all text-xs"><dt className="font-medium">{historyLabel(key)}</dt><dd>{event.old_record && <span className="text-muted-foreground">Anterior: {String(event.old_record[key] ?? "vazio")} → </span>}{historyValue(key, value)}</dd></div>)}</dl></details>;
}

function historyLabel(key: string): string {
  const labels: Record<string, string> = { status: "Situação", regex: "Regex", evidence: "Evidência", resolution: "Resolução", label: "Campo / atividade", assignee: "Responsável", next_action: "Próxima ação", description: "Descrição", magnifier_status: "Resultado na lupinha", triage_status: "Resultado na triagem", expected_value: "Valor esperado", notes: "Observações", waiver_reason: "Dispensa", waiver_by: "Autorizador", waiver_on: "Data da dispensa", configuration: "Configuração", archived_at: "Arquivamento", filename: "Arquivo", supplier: "Fornecedor", stage: "Etapa", international: "Internacional", boleto: "Boleto", layout_id: "ID layout", sub_layout_id: "ID sub-layout", category: "Categoria NF", category_description: "Descrição da categoria", category_id: "ID categoria", subcategory: "Subcategoria", environment: "Ambiente", tenant: "Tenant/filial", source_match: "Associação à origem", source_notes: "Observação original do CSV", confirmed_by: "Responsável pela confirmação", confirmed_on: "Data da confirmação", applicability: "Aplicabilidade", availability: "Disponibilidade no OCR", magnifier_value: "Valor obtido na lupinha", triage_value: "Valor obtido na triagem", required: "Obrigatório", conditional: "Condicional", field_id: "Campo relacionado", kind: "Tipo de pendência", authorized_by: "Autorizador", authorized_on: "Data da autorização" };
  return labels[key] || key.replace(/_/g, " ");
}

function historyValue(key: string, value: unknown): string {
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (key === "stage") return stageLabels[value as OcrStage] ?? String(value);
  const labels: Record<string, string> = { ...progressLabels, ...issueStatusLabels, ...testLabels, ...triStateLabels, ...issueKindLabels,
    present: "Presente", absent: "Ausente", incomplete: "Incompleto", configured: "Configurado" };
  return typeof value === "string" ? labels[value] ?? value : String(value ?? "vazio");
}
