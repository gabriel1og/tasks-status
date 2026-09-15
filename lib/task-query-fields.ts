import type {
  QueryCondition,
  QueryField,
  QueryOperator,
} from "@/types/queries";

type QueryFieldDescription = {
  value: QueryField;
  label: string;
  type: "text" | "text-list" | "date" | "boolean";
};

export const QUERY_FIELDS: QueryFieldDescription[] = [
  { value: "nome", label: "Nome", type: "text" },
  { value: "azure", label: "Azure", type: "text" },
  { value: "azure_url", label: "Link do Azure", type: "text" },
  { value: "liveops_url", label: "Link do LiveOps", type: "text" },
  {
    value: "github_references",
    label: "GitHub (branch ou PR)",
    type: "text-list",
  },
  { value: "sprint", label: "Sprint", type: "text" },
  { value: "sprint_id", label: "ID da sprint", type: "text" },
  { value: "is_future", label: "Tarefa futura", type: "boolean" },
  { value: "status", label: "Status", type: "text" },
  { value: "ambiente", label: "Ambiente", type: "text" },
  { value: "created_at", label: "Data de criação", type: "date" },
  { value: "id", label: "ID da tarefa", type: "text" },
  { value: "user_id", label: "ID do usuário", type: "text" },
];

export const QUERY_OPERATOR_LABELS: Record<QueryOperator, string> = {
  eq: "É igual a",
  neq: "É diferente de",
  contains: "Contém",
  not_contains: "Não contém",
  starts_with: "Começa com",
  is_empty: "Está vazio",
  is_not_empty: "Não está vazio",
  before: "É anterior a",
  after: "É posterior a",
  on_or_before: "É anterior ou igual a",
  on_or_after: "É posterior ou igual a",
};

const TEXT_OPERATORS: QueryOperator[] = [
  "eq",
  "neq",
  "contains",
  "not_contains",
  "starts_with",
  "is_empty",
  "is_not_empty",
];
const DATE_OPERATORS: QueryOperator[] = [
  "eq",
  "neq",
  "before",
  "after",
  "on_or_before",
  "on_or_after",
  "is_empty",
  "is_not_empty",
];

/** Lists operators appropriate to a field, e.g. getQueryOperators("is_future"). */
export function getQueryOperators(field: QueryField): QueryOperator[] {
  const fieldType = QUERY_FIELDS.find((option) => option.value === field)?.type;
  if (fieldType === "boolean") return ["eq", "neq"];
  if (fieldType === "date") return [...DATE_OPERATORS];
  return fieldType === "text" || fieldType === "text-list"
    ? [...TEXT_OPERATORS]
    : [];
}

/** Starts an editable condition, e.g. createQueryCondition("status"). */
export function createQueryCondition(
  field: QueryField = "nome",
): QueryCondition {
  return {
    id: crypto.randomUUID(),
    field,
    operator: field === "nome" ? "contains" : "eq",
    value: field === "is_future" ? "true" : "",
  };
}
