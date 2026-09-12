import Link from "next/link";
import { ArrowUpRight, ListFilter, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { QueryFolderRow, SavedQueryRow } from "@/types/queries";

type QueryListProps = {
  queries: SavedQueryRow[];
  folders: QueryFolderRow[];
  disabled: boolean;
  onFavorite: (query: SavedQueryRow) => void;
  onDelete: (query: SavedQueryRow) => void;
};

/** Lista queries com links próprios e ações independentes. Ex.: <QueryList {...queriesState} />. */
export function QueryList({
  queries,
  folders,
  disabled,
  onFavorite,
  onDelete,
}: QueryListProps) {
  if (!queries.length)
    return (
      <p className="px-4 py-12 text-center text-sm text-muted-foreground">
        Nenhuma query encontrada nesta visualização. Crie uma query ou ajuste a
        busca.
      </p>
    );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">
            <span className="sr-only">Favorito</span>
          </TableHead>
          <TableHead>Query</TableHead>
          <TableHead>Pasta</TableHead>
          <TableHead>Atualizada em</TableHead>
          <TableHead>
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {queries.map((query) => (
          <TableRow key={query.id}>
            <TableCell className="px-2">
              <Button
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-pressed={query.is_favorite}
                aria-label={`${query.is_favorite ? "Desfavoritar" : "Favoritar"} ${query.nome}`}
                onClick={() => onFavorite(query)}
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    query.is_favorite && "fill-primary text-primary",
                  )}
                />
              </Button>
            </TableCell>
            <TableCell className="min-w-56">
              <Link
                href={`/queries/${query.id}`}
                className="group flex items-start gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ListFilter className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="font-medium group-hover:underline">
                    {query.nome}
                  </span>
                  {query.descricao && (
                    <span className="mt-1 block max-w-md truncate text-xs text-muted-foreground">
                      {query.descricao}
                    </span>
                  )}
                </span>
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {folders.find((folder) => folder.id === query.folder_id)?.nome ??
                "Sem pasta"}
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
              {new Date(query.updated_at).toLocaleString("pt-BR")}
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <Button asChild variant="ghost" size="icon">
                  <Link
                    href={`/queries/${query.id}`}
                    aria-label={`Abrir ${query.nome}`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  aria-label={`Excluir ${query.nome}`}
                  onClick={() => onDelete(query)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
