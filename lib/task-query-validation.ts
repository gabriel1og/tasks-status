import { getQueryOperators, QUERY_FIELDS } from "@/lib/task-query-fields";
import type { QueryField, QueryOperator } from "@/types/queries";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1)
    return false;
  const timestamp = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(timestamp.getTime()) &&
    timestamp.toISOString().slice(0, 10) === value
  );
}

function validateConditionValue(
  condition: Record<string, unknown>,
): string | null {
  if (typeof condition.value !== "string" || condition.value.length > 2000) {
    return "Informe um valor de até 2.000 caracteres para cada condição.";
  }
  if (
    condition.operator === "is_empty" ||
    condition.operator === "is_not_empty"
  )
    return null;
  if (!condition.value.trim())
    return "Preencha o valor de cada condição ou escolha Está vazio.";
  if (
    condition.field === "is_future" &&
    !["true", "false"].includes(condition.value)
  ) {
    return "Escolha Sim ou Não para a condição de tarefa futura.";
  }
  if (condition.field === "created_at" && !isCalendarDate(condition.value)) {
    return "Informe uma data válida para a condição de data de criação.";
  }
  return null;
}

function validateCondition(condition: unknown): string | null {
  if (
    !isRecord(condition) ||
    typeof condition.id !== "string" ||
    !condition.id.trim()
  ) {
    return "Uma condição da query está inválida. Edite ou remova essa condição.";
  }
  if (!QUERY_FIELDS.some((field) => field.value === condition.field)) {
    return "Escolha um campo de tarefa válido para cada condição.";
  }
  if (
    !getQueryOperators(condition.field as QueryField).includes(
      condition.operator as QueryOperator,
    )
  ) {
    return "Escolha um operador compatível com o campo de cada condição.";
  }
  return validateConditionValue(condition);
}

function validateConditions(conditions: unknown[]): string | null {
  const conditionIds = new Set<string>();
  for (const condition of conditions) {
    const conditionError = validateCondition(condition);
    if (conditionError) return conditionError;
    const conditionId = (condition as { id: string }).id;
    if (conditionIds.has(conditionId))
      return "As condições da query precisam de identificadores únicos.";
    conditionIds.add(conditionId);
  }
  return null;
}

/** Rejects unsafe or incomplete saved filters, e.g. validateQueryDefinition(query.definition). */
export function validateQueryDefinition(definition: unknown): string | null {
  if (
    !isRecord(definition) ||
    !["all", "any"].includes(definition.match as string)
  ) {
    return "Escolha se as tarefas devem atender a todas ou a qualquer uma das condições.";
  }
  if (!Array.isArray(definition.conditions))
    return "As condições desta query estão inválidas.";
  if (definition.conditions.length > 50)
    return "Use no máximo 50 condições em uma query.";
  return validateConditions(definition.conditions);
}
