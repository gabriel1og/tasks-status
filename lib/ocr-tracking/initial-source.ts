import snapshot from "./initial-source.json";
import { newChecklist, newOcrField, newOcrItem, requiredFields } from "./definitions";
import type { OcrField, OcrInput, OcrIssue, OcrIssueKind, OcrSeed, OcrStage } from "@/types/ocr-tracking";

type SourceDocument = typeof snapshot.documents[number];
const issueMatchers: [RegExp, OcrIssueKind, OcrStage, string][] = [
  [/sub.categoria|categoria/i, "category", 3, "Conferir categoria e subcategoria com o time."],
  [/pedido/i, "purchase_order", 2, "Conferir extração e padrão SAP do pedido de compra."],
  [/linha digitável/i, "payment_line", 2, "Configurar e validar a linha digitável."],
  [/imposto|\bIOF\b|\bISS\b|\bPIS\/COFINS\b/i, "tax_values", 2, "Conferir impostos e composição dos valores."],
  [/não (?:tem|existe).*código.*parceiro/i, "partner", 2, "Obter o código de parceiro cadastrado."],
  [/não é aceito|não existe opção/i, "system", 2, "Definir alternativa para a restrição relatada."],
  [/data de emissão/i, "missing_field", 2, "Resolver a emissão incompleta ou por extenso."],
  [/n[uú]mero (?:do|de) documento|n[uú]mero pequeno/i, "missing_field", 2, "Conferir a identificação do documento; não compor um número sem decisão registrada."],
  [/n[aã]o tem (?:CFP|CPF)\/CNPJ/i, "missing_field", 2, "Tratar CPF/CNPJ do destinatário ausente."],
  [/n[aã]o tem descri/i, "missing_field", 2, "Tratar descrição obrigatória ausente."],
];

/** Monta uma pendência inicial sem presumir execução. Ex.: seedIssue("review", 2, "Conferir ID"). */
export function seedIssue(kind: OcrIssueKind, stage: OcrStage, description: string, next_action = "Conferir e registrar decisão."): OcrInput<OcrIssue> {
  return { field_id: null, stage, kind, description, next_action, assignee: "", status: "pending", resolution: "", authorized_by: "", authorized_on: null };
}

function sourceFields(document: SourceDocument): OcrInput<OcrField>[] {
  const fields: OcrInput<OcrField>[] = document.fields.map((source) => ({ ...newOcrField(source.key, source.label, source.required),
    applicability: "yes" as const, availability: sourceAvailability(source.availability),
    regex: source.regex, expected_value: source.expected, notes: "Candidata do Markdown; conferência local não comprova lupinha ou triagem." }));
  for (const [key, label] of requiredFields) if (!fields.some((field) => field.key === key)) fields.push(newOcrField(key, label, true));
  return fields;
}

function sourceAvailability(value: string): OcrField["availability"] {
  if (value.startsWith("Sim")) return "present";
  if (value.startsWith("Parcial")) return "incomplete";
  return value === "Não informado" ? "unknown" : "absent";
}

function knownReferences(document: SourceDocument, fields: OcrInput<OcrField>[]): void {
  const note = document.original["Campos não mapeados inicialmente"];
  const partner = /Código de parceiro emissor:\s*(\d+)/i.exec(note)?.[1];
  if (partner || document.original["Fatura Internacional"] === "SIM") fields.push({ ...newOcrField("partner_code", "Código de parceiro do emissor"), applicability: "yes", expected_value: partner ?? "", notes: "Referência do CSV; extração/configuração não confirmadas. Obter o código cadastrado quando ausente." });
  const recipient = /CNPJ do Destinatário:\s*(\d{14})/i.exec(note)?.[1];
  const field = fields.find((candidate) => candidate.key === "recipient_tax_id");
  if (recipient && field) { field.expected_value = recipient; field.notes += " Referência do CSV: CNPJ da matriz, sem confirmação de extração."; }
}

function documentIssues(document: SourceDocument, fields: OcrInput<OcrField>[]): OcrInput<OcrIssue>[] {
  const note = document.original["Campos não mapeados inicialmente"];
  const issues = issueMatchers.filter(([pattern]) => pattern.test(note)).map(([, kind, stage, action]) => seedIssue(kind, stage, `${action} Origem: ${note}`, action));
  for (const field of fields.filter((entry) => entry.required && entry.availability === "absent")) {
    if (!issues.some((issue) => issue.description.includes(field.label))) issues.push(seedIssue("missing_field", 2, `${field.label}: ausente/incompleto segundo a análise anterior. Conferir com o CSV e o documento.`));
  }
  if (fields.some((field) => field.key === "partner_code" && !field.expected_value) && !issues.some((issue) => issue.kind === "partner")) issues.push(seedIssue("partner", 2, "Fatura internacional: obter código de parceiro cadastrado; identificador fiscal estrangeiro não substitui esse código."));
  const gross = fields.find((field) => field.key === "gross_value")?.expected_value;
  const service = fields.find((field) => field.key === "service_value")?.expected_value;
  if (gross && service && gross !== service) issues.push(seedIssue("tax_values", 2, `Markdown: bruto ${gross} e serviço ${service} diferem. Confirmar composição e justificar a exceção; não igualar automaticamente.`));
  if (document.boleto && !issues.some((issue) => issue.kind === "payment_line")) issues.push(seedIssue("payment_line", 2, "Boleto identificado no Markdown: conferir linha digitável."));
  const filenameCategory = /^\s*(E[345])(?:\s|[-_])/i.exec(document.original["Nome do arquivo"])?.[1];
  if (filenameCategory) issues.push(seedIssue("review", 3, `Arquivo indica ${filenameCategory}; CSV informa ${document.original["Categoria de Nota Fiscal (MIRO)" ]}. Conferir divergência sem substituir automaticamente.`));
  return issues;
}

function documentSeed(document: SourceDocument, index: number): OcrSeed {
  const original = document.original;
  const fields = sourceFields(document);
  knownReferences(document, fields);
  const checklist = newChecklist();
  for (const entry of checklist.filter((row) => ["ocr", "analysis", "regex", "exceptions"].includes(row.key))) {
    if (document.anchor) Object.assign(entry, { status: "done", evidence: `Markdown de 21/10/2026, ficha layout-${document.anchor}. Preparação documental, sem teste no Inbound.`, confirmed_by: "Histórico documental", confirmed_on: "2026-10-21" });
  }
  const issues = documentIssues(document, fields);
  if ([0, 40].includes(index)) issues.push(seedIssue("review", 2, "LinkedIn e Club Coworking compartilham o ID externo no CSV. Conferir os cadastros; manter os documentos separados."));
  return { item: { ...newOcrItem(), source_key: `${snapshot.version}:${original["Nome do arquivo"]}`, supplier: document.supplier,
    filename: original["Nome do arquivo"], layout_id: original["ID layout"], category: original["Categoria de Nota Fiscal (MIRO)"],
    category_id: original["ID da categoria"], category_description: original["Descrição da Categoria"], source_notes: original["Campos não mapeados inicialmente"],
    source_record: original, source_match: document.anchor ? `Associação revisada: layout-${document.anchor}` : "Sem ficha no Markdown; conferir manualmente.",
    international: original["Fatura Internacional"] === "SIM" ? "yes" : original["Fatura Internacional"] === "NÃO" ? "no" : "unknown",
    boleto: document.boleto || /BOLETO/i.test(original["Campos não mapeados inicialmente"]) ? "yes" : "unknown",
    next_action: "" }, checklist, fields, issues };
}

/** Devolve a carga independente dos caminhos locais. Ex.: buildInitialOcrSeeds(). */
export function buildInitialOcrSeeds(): OcrSeed[] {
  return snapshot.documents.map(documentSeed);
}
