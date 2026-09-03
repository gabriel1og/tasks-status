export type TaskStatusRow = {
  id: string;
  user_id: string;
  nome: string;
  azure: string;
  sprint: string;
  status: string;
  ambiente: string;
  created_at: string;
};

export type TaskStatusInsert = Omit<TaskStatusRow, "id" | "created_at">;

export type UserSettingsRow = {
  user_id: string;
  nome: string;
  cargo: string;
  updated_at: string;
};

export type TagKind = "status" | "ambiente";

export type TagOptionRow = {
  id: string;
  user_id: string;
  tipo: TagKind;
  nome: string;
  cor: string;
  created_at: string;
};

export type TagOptionInsert = Omit<TagOptionRow, "id" | "created_at">;
