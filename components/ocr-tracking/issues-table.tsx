import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { issueKindLabels, issueStatusLabels, stageLabels } from "@/lib/ocr-tracking/definitions";
import type { OcrField, OcrIssue, OcrItem } from "@/types/ocr-tracking";

/** Expõe cada pendência como uma ação para o time. Ex.: <OcrIssuesTable ... />. */
export function OcrIssuesTable({ issues, items, fields, onEdit }: { issues: OcrIssue[]; items: OcrItem[]; fields: OcrField[]; onEdit: (issue: OcrIssue) => void }) {
  return <Table className="min-w-[1150px]"><TableHeader><TableRow>{["Documento", "Etapa / tipo", "Campo", "Pendência", "Responsável", "Próxima ação", "Situação", "Resolução", "Ações"].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
    <TableBody>{issues.map((issue) => <TableRow key={issue.id}>
      <TableCell className="min-w-48 max-w-64 break-words">{items.find((item) => item.id === issue.item_id)?.filename}</TableCell>
      <TableCell>{stageLabels[issue.stage]}<p className="text-xs text-muted-foreground">{issueKindLabels[issue.kind]}</p></TableCell>
      <TableCell>{fields.find((field) => field.id === issue.field_id)?.label || "Não vinculado"}</TableCell>
      <TableCell className="min-w-72 max-w-96 whitespace-pre-wrap">{issue.description}</TableCell><TableCell>{issue.assignee || "Sem responsável"}</TableCell>
      <TableCell className="min-w-56 max-w-80">{issue.next_action || "Não informada"}</TableCell>
      <TableCell>{issueStatusLabels[issue.status]}</TableCell><TableCell className="min-w-48 max-w-80">{issue.resolution || "Não informada"}{issue.status === "waived" && <p className="text-xs text-muted-foreground">{issue.authorized_by} · {issue.authorized_on}</p>}</TableCell>
      <TableCell><Button size="icon" variant="ghost" aria-label="Editar pendência" onClick={() => onEdit(issue)}><Pencil className="h-4 w-4" /></Button></TableCell>
    </TableRow>)}</TableBody>
  </Table>;
}
