import { issueKindLabels, issueStatusLabels, progressLabels, stageLabels, testLabels, triStateLabels } from "@/lib/ocr-tracking/definitions";
import type { OcrFormField } from "./editor";

export const itemEditorFields: OcrFormField[] = [
  { key: "supplier", label: "Fornecedor", required: true }, { key: "filename", label: "Nome do arquivo", required: true },
  { key: "layout_id", label: "ID layout" }, { key: "sub_layout_id", label: "ID sub-layout" },
  { key: "category", label: "Categoria NF" }, { key: "category_description", label: "Descrição da categoria" },
  { key: "category_id", label: "ID categoria" }, { key: "subcategory", label: "Subcategoria" },
  { key: "environment", label: "Ambiente" }, { key: "tenant", label: "Tenant/filial" },
  { key: "assignee", label: "Responsável" }, { key: "next_action", label: "Próxima ação" },
  { key: "international", label: "Internacional", options: triStateLabels }, { key: "boleto", label: "Boleto", options: triStateLabels },
  { key: "notes", label: "Observações atuais", kind: "textarea" },
];
export const checklistEditorFields: OcrFormField[] = [
  { key: "status", label: "Situação", options: progressLabels }, { key: "confirmed_by", label: "Responsável pela confirmação" },
  { key: "confirmed_on", label: "Data da confirmação", kind: "date" }, { key: "evidence", label: "Evidência / justificativa", kind: "textarea" },
];
export const fieldEditorFields: OcrFormField[] = [
  { key: "label", label: "Nome do campo", required: true }, { key: "applicability", label: "Aplicável?", options: triStateLabels },
  { key: "availability", label: "Disponível no OCR", options: { unknown: "Não informado", present: "Presente", absent: "Ausente", incomplete: "Incompleto" } },
  { key: "configuration", label: "Configuração", options: { unknown: "Não informada", pending: "Pendente", configured: "Configurado" } },
  { key: "regex", label: "Regex candidata (a alteração exige reteste)", kind: "textarea" }, { key: "expected_value", label: "Valor esperado" },
  { key: "magnifier_status", label: "Resultado na lupinha", options: testLabels }, { key: "magnifier_value", label: "Valor obtido na lupinha" },
  { key: "triage_status", label: "Resultado na triagem", options: testLabels }, { key: "triage_value", label: "Valor obtido na triagem" },
  { key: "evidence", label: "Referência de evidência dos testes", kind: "textarea" }, { key: "notes", label: "Observações / justificativa de não aplicabilidade", kind: "textarea" },
  { key: "waiver_reason", label: "Motivo de dispensa formal", kind: "textarea" }, { key: "waiver_by", label: "Autorizador da dispensa" }, { key: "waiver_on", label: "Data da dispensa", kind: "date" },
];
export const issueEditorFields: OcrFormField[] = [
  { key: "description", label: "Descrição", kind: "textarea", required: true },
  { key: "kind", label: "Tipo", options: issueKindLabels }, { key: "stage", label: "Etapa", options: stageLabels },
  { key: "assignee", label: "Responsável" }, { key: "next_action", label: "Próxima ação", kind: "textarea" },
  { key: "status", label: "Situação", options: issueStatusLabels }, { key: "resolution", label: "Solução / motivo da dispensa", kind: "textarea" },
  { key: "authorized_by", label: "Autorizador da dispensa" }, { key: "authorized_on", label: "Data da autorização", kind: "date" },
];
