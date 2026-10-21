import type { OcrChecklist, OcrField, OcrInput, OcrItem, OcrIssueKind, OcrStage } from "@/types/ocr-tracking";

export const progressLabels = { unknown: "Não informado", pending: "Pendente", in_progress: "Em andamento", blocked: "Bloqueado", done: "Concluído", not_applicable: "Não se aplica" };
export const testLabels = { unknown: "Não informado", pending: "Pendente", approved: "Aprovado", rejected: "Reprovado" };
export const triStateLabels = { unknown: "Não informado", yes: "Sim", no: "Não" };
export const issueStatusLabels = { pending: "Pendente", in_progress: "Em andamento", blocked: "Bloqueada", resolved: "Resolvida", waived: "Dispensada" };
export const issueKindLabels: Record<OcrIssueKind, string> = {
  missing_field: "Campo ausente ou incompleto", regex: "Regex ou extração", configuration: "Layout/sub-layout",
  category: "Categoria/subcategoria", partner: "Parceiro/fornecedor", purchase_order: "Pedido de compra",
  tax_values: "Impostos ou valores", payment_line: "Linha digitável", system: "Restrição do sistema", review: "Conferência de dados",
};
export const stageLabels: Record<OcrStage, string> = { 1: "Preparação", 2: "Configuração", 3: "Categoria NF vinculada", 4: "Triagem" };
export const stages: OcrStage[] = [1, 2, 3, 4];
export const requiredFields = [
  ["document_number", "Número do documento"], ["issue_date", "Data de emissão"],
  ["recipient_tax_id", "CPF/CNPJ do destinatário"], ["gross_value", "Valor bruto"],
  ["service_value", "Valor do serviço"], ["description", "Descrição do serviço"],
] as const;
const checklistDefinitions: [OcrStage, string, string, boolean?][] = [
  [1, "sample", "Documento identificado"], [1, "ocr", "Texto OCR obtido"],
  [1, "analysis", "Campos analisados"], [1, "regex", "Regexs preparadas"], [1, "exceptions", "Exceções identificadas"],
  [2, "existing", "Layouts existentes consultados"], [2, "layout", "Layout cadastrado"],
  [2, "sub_layout", "Sub-layout cadastrado"], [2, "fields", "Campos configurados"], [2, "magnifier", "Lupinha aprovada"],
  [3, "category", "Categoria/subcategoria identificada"], [3, "link", "Vínculo cadastrado e conferido"],
  [4, "upload", "Documento incluído na triagem"], [4, "review", "Edição e campos conferidos"],
  [4, "corrections", "Divergências tratadas"], [4, "retest", "Reteste aprovado", true],
];

/** Prepara os itens fixos sem presumir execução. Ex.: newChecklist(). */
export function newChecklist(): OcrInput<OcrChecklist>[] {
  return checklistDefinitions.map(([stage, key, label, conditional]) => ({
    stage, key, label, conditional: Boolean(conditional), status: "unknown", evidence: "", confirmed_by: "", confirmed_on: null,
  }));
}

/** Cria um campo sem aprovação implícita. Ex.: newOcrField("gross_value", "Valor bruto", true). */
export function newOcrField(key: string, label: string, required = false): OcrInput<OcrField> {
  return { key, label, required, applicability: required ? "yes" : "unknown", availability: "unknown", regex: "", expected_value: "",
    configuration: "unknown", magnifier_status: "unknown", triage_status: "unknown", magnifier_value: "", triage_value: "",
    evidence: "", notes: "", waiver_reason: "", waiver_by: "", waiver_on: null };
}

/** Cria identificação vazia para cadastro manual. Ex.: newOcrItem(). */
export function newOcrItem(): OcrInput<OcrItem> {
  return { source_key: "", supplier: "", filename: "", layout_id: "", sub_layout_id: "", category: "", category_description: "",
    category_id: "", subcategory: "", environment: "", tenant: "", assignee: "", next_action: "", international: "unknown", boleto: "unknown",
    notes: "", source_notes: "", source_record: {}, source_match: "Cadastro manual", archived_at: null };
}
