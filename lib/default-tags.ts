import type { TagKind, TagOptionInsert } from "@/types/database";

const fallbackTags = {
  status: [
    { nome: "Pendente", cor: "#b45309" },
    { nome: "Em andamento", cor: "#2563eb" },
    { nome: "Bloqueado", cor: "#dc2626" },
    { nome: "Concluido", cor: "#16a34a" },
  ],
  ambiente: [
    { nome: "Desenvolvimento", cor: "#0891b2" },
    { nome: "Homologacao", cor: "#7c3aed" },
    { nome: "Producao", cor: "#15803d" },
  ],
} satisfies Record<TagKind, Array<{ nome: string; cor: string }>>;

export function buildDefaultTags(userId: string): TagOptionInsert[] {
  return Object.entries(fallbackTags).flatMap(([tipo, tags]) =>
    tags.map((tag) => ({
      user_id: userId,
      tipo: tipo as TagKind,
      nome: tag.nome,
      cor: tag.cor,
    })),
  );
}
