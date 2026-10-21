"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OcrModal } from "./ocr-modal";

export type OcrFormField = { key: string; label: string; kind?: "textarea" | "date" | "number"; options?: Record<string, string>; required?: boolean };
export const ocrSelectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
export type OcrFormValues = Record<string, string | number | null>;

/** Edita dados mantendo rascunho em falhas. Ex.: <OcrEditor fields={fields} record={item} onSave={save} ... />. */
export function OcrEditor({ title, fields, record, onSave, onClose, validate, serverFeedback }: { title: string; fields: OcrFormField[]; record: object; onSave: (values: OcrFormValues) => Promise<void>; onClose: () => void; validate?: (values: OcrFormValues) => string; serverFeedback?: string }) {
  const [values, setValues] = useState<OcrFormValues>(() => Object.fromEntries(fields.map((field) => [field.key, (record as OcrFormValues)[field.key] ?? (field.kind === "date" ? null : "")])));
  const [busy, setBusy] = useState(false), [feedback, setFeedback] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    const validation = validate?.(values); if (validation) { setFeedback(validation); return; }
    setBusy(true); setFeedback("");
    try { await onSave(values); onClose(); } catch { setFeedback("Não foi possível salvar. Confira os dados e o aviso da página; seu preenchimento foi mantido."); } finally { setBusy(false); }
  }
  return <OcrModal title={title} onClose={onClose} busy={busy}><form onSubmit={submit} aria-busy={busy} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <EditorControl key={field.key} field={field} value={values[field.key]} disabled={busy} onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))} />)}</div>
    {feedback && <p role="alert" className="text-sm text-destructive">{feedback}</p>}
    {feedback && serverFeedback && <p role="alert" className="text-sm text-destructive">{serverFeedback}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}><X className="h-4 w-4" />Cancelar</Button><Button disabled={busy}><Check className="h-4 w-4" />{busy ? "Salvando..." : "Salvar"}</Button></div>
  </form></OcrModal>;
}

function EditorControl({ field, value, onChange, disabled }: { field: OcrFormField; value: string | number | null; onChange: (value: string | number | null) => void; disabled: boolean }) {
  const common = { value: value ?? "", disabled, required: field.required, "aria-label": field.label };
  return <label className={`space-y-1 text-sm ${field.kind === "textarea" ? "sm:col-span-2" : ""}`}><span className="font-medium">{field.label}</span>
    {field.options ? <select {...common} className={ocrSelectClass} onChange={(event) => onChange(event.target.value)}>{Object.entries(field.options).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      : field.kind === "textarea" ? <textarea {...common} className="min-h-24 w-full rounded-md border border-input bg-background p-3 font-mono text-sm" onChange={(event) => onChange(event.target.value)} />
        : <Input {...common} type={field.kind === "date" ? "date" : field.kind === "number" ? "number" : "text"} onChange={(event) => onChange(field.kind === "date" ? event.target.value || null : field.kind === "number" ? Number(event.target.value) : event.target.value)} />}
  </label>;
}
