import { TRACKED_ENVIRONMENT_DEFINITIONS } from "@/lib/environment-tracking";
import type { TagKind, TagOptionInsert } from "@/types/database";

const fallbackTags = {
  status: [
    { nome: "Pendente", cor: "#b45309" },
    { nome: "Em andamento", cor: "#2563eb" },
    { nome: "Bloqueado", cor: "#dc2626" },
    { nome: "Concluido", cor: "#16a34a" },
  ],
  ambiente: TRACKED_ENVIRONMENT_DEFINITIONS.map(({ persistedName, color }) => ({
    nome: persistedName,
    cor: color,
  })),
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
