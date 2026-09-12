import { Folder, ListFilter, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QueryFolderRow, SavedQueryRow } from "@/types/queries";

export type QueryLibraryScope =
  "all" | "favorites" | "unfiled" | `folder:${string}`;

type QueryLibraryNavProps = {
  folders: QueryFolderRow[];
  queries: SavedQueryRow[];
  scope: QueryLibraryScope;
  onScopeChange: (scope: QueryLibraryScope) => void;
};

/** Navega pelas pastas e favoritos. Ex.: <QueryLibraryNav {...navigation} />. */
export function QueryLibraryNav({
  folders,
  queries,
  scope,
  onScopeChange,
}: QueryLibraryNavProps) {
  const sections = [
    {
      id: "all" as const,
      label: "Todas as queries",
      icon: ListFilter,
      count: queries.length,
    },
    {
      id: "favorites" as const,
      label: "Favoritas",
      icon: Star,
      count: queries.filter((query) => query.is_favorite).length,
    },
    {
      id: "unfiled" as const,
      label: "Sem pasta",
      icon: Folder,
      count: queries.filter((query) => !query.folder_id).length,
    },
    ...folders.map((folder) => ({
      id: `folder:${folder.id}` as const,
      label: folder.nome,
      icon: Folder,
      count: queries.filter((query) => query.folder_id === folder.id).length,
    })),
  ];
  return (
    <nav
      aria-label="Pastas de queries"
      className="flex gap-1 overflow-x-auto p-3 lg:w-60 lg:shrink-0 lg:flex-col lg:border-r"
    >
      {sections.map(({ id, label, icon: Icon, count }) => (
        <Button
          key={id}
          variant={scope === id ? "secondary" : "ghost"}
          className="shrink-0 justify-start lg:w-full"
          onClick={() => onScopeChange(id)}
          aria-current={scope === id ? "page" : undefined}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="max-w-40 truncate">{label}</span>
          <span className="ml-auto pl-2 text-xs text-muted-foreground">
            {count}
          </span>
        </Button>
      ))}
    </nav>
  );
}
