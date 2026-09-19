import type { TimeCategoryInsert } from "@/types/time-tracking";

const defaultTimeCategories = [
  { name: "Desenvolvimento", color: "#2563eb" },
  { name: "Reunião", color: "#7c3aed" },
  { name: "Suporte", color: "#dc2626" },
  { name: "Outros", color: "#64748b" },
] as const;

/** Cria o payload idempotente das categorias iniciais. Ex.: buildDefaultTimeCategories(user.id). */
export function buildDefaultTimeCategories(
  userId: string,
): TimeCategoryInsert[] {
  if (!userId.trim()) {
    throw new Error(
      `Usuário inválido: "${userId}". Informe o identificador da conta.`,
    );
  }
  return defaultTimeCategories.map((category) => ({
    ...category,
    user_id: userId,
  }));
}
