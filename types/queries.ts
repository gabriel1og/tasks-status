import type { TaskStatusRow } from "@/types/database";

export type QueryField = keyof TaskStatusRow;

export type QueryOperator =
  | "eq"
  | "neq"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "is_empty"
  | "is_not_empty"
  | "before"
  | "after"
  | "on_or_before"
  | "on_or_after";

export type QueryCondition = {
  id: string;
  field: QueryField;
  operator: QueryOperator;
  value: string;
};

export type QueryDefinition = {
  match: "all" | "any";
  conditions: QueryCondition[];
};

export type SavedQueryRow = {
  id: string;
  user_id: string;
  nome: string;
  descricao: string;
  folder_id: string | null;
  is_favorite: boolean;
  definition: QueryDefinition;
  created_at: string;
  updated_at: string;
};

export type QueryFolderRow = {
  id: string;
  user_id: string;
  nome: string;
  created_at: string;
};

export type QuerySaveInput = Pick<
  SavedQueryRow,
  "nome" | "descricao" | "folder_id" | "definition"
>;
