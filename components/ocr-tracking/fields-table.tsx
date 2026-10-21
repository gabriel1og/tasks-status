"use client";

import { useState } from "react";
import { Copy, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { testLabels, triStateLabels } from "@/lib/ocr-tracking/definitions";
import type { OcrField } from "@/types/ocr-tracking";

const availabilityLabels = { unknown: "Não informado", present: "Presente", absent: "Ausente", incomplete: "Incompleto" };
const configurationLabels = { unknown: "Não informada", pending: "Pendente", configured: "Configurado" };

/** Confere configuração e resultados de cada campo. Ex.: <OcrFieldsTable fields={fields} onEdit={edit} />. */
export function OcrFieldsTable({ fields, onEdit }: { fields: OcrField[]; onEdit: (field: OcrField) => void }) {
  return <Table className="min-w-[1450px]"><TableHeader><TableRow>{["Campo", "Obrigatoriedade / aplicabilidade", "No OCR", "Regex candidata", "Esperado", "Configuração", "Lupinha", "Triagem", "Evidência / observações", "Dispensa", "Ações"].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>
    {fields.map((field) => <TableRow key={field.id}><TableCell className="min-w-44 font-medium">{field.label}</TableCell><TableCell>{field.required ? "Obrigatório" : "Adicional"}<p className="text-xs text-muted-foreground">Aplicável: {triStateLabels[field.applicability]}</p></TableCell>
      <TableCell>{availabilityLabels[field.availability]}</TableCell><TableCell className="min-w-64 max-w-96"><code className="break-all whitespace-pre-wrap text-xs">{field.regex || "Não informada"}</code>{field.regex && <CopyOcrText value={field.regex} />}</TableCell>
      <TableCell className="min-w-36 max-w-64 break-words">{field.expected_value || "Não informado"}</TableCell><TableCell>{configurationLabels[field.configuration]}</TableCell>
      <TableCell>{testLabels[field.magnifier_status]}<p className="mt-1 whitespace-pre-wrap text-xs">{field.magnifier_value}</p></TableCell><TableCell>{testLabels[field.triage_status]}<p className="mt-1 whitespace-pre-wrap text-xs">{field.triage_value}</p></TableCell>
      <TableCell className="min-w-64 max-w-80 whitespace-pre-wrap text-xs">{field.evidence}<p className="mt-2 text-muted-foreground">{field.notes}</p></TableCell>
      <TableCell className="min-w-40">{field.waiver_reason || "Não dispensado"}{field.waiver_on && <p className="text-xs">{field.waiver_by} · {field.waiver_on}</p>}</TableCell>
      <TableCell><Button size="icon" variant="ghost" aria-label={`Editar ${field.label}`} onClick={() => onEdit(field)}><Pencil className="h-4 w-4" /></Button></TableCell></TableRow>)}
  </TableBody></Table>;
}

/** Copia exatamente o padrão bruto e informa falhas. Ex.: <CopyOcrText value={field.regex} />. */
export function CopyOcrText({ value }: { value: string }) {
  const [feedback, setFeedback] = useState("");
  async function copy() { try { await navigator.clipboard.writeText(value); setFeedback("Copiado"); } catch { setFeedback("Não foi possível copiar; selecione o texto."); } }
  return <span className="inline-flex items-center"><Button type="button" variant="ghost" size="icon" aria-label="Copiar texto" onClick={copy}><Copy className="h-3.5 w-3.5" /></Button><span role="status" className="text-xs">{feedback}</span></span>;
}
