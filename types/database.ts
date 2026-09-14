export type TaskStatusRow = {
  id: string;
  user_id: string;
  nome: string;
  azure: string;
  azure_url: string;
  liveops_url: string;
  github_branch: string;
  github_pr_url: string;
  sprint: string;
  sprint_id: string | null;
  is_future: boolean;
  status: string;
  ambiente: string;
  created_at: string;
};

export type TaskStatusInsert = Omit<TaskStatusRow, "id" | "created_at">;

export type TaskEnvironmentStatusRow = {
  id: string;
  user_id: string;
  task_id: string;
  environment_tag_id: string;
  available: boolean;
  created_at: string;
  updated_at: string;
};

export type TaskEnvironmentStatusInsert = Omit<
  TaskEnvironmentStatusRow,
  "id" | "created_at" | "updated_at"
>;

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

export type SprintRow = {
  id: string;
  user_id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  created_at: string;
};

export type SprintInsert = Omit<SprintRow, "id" | "created_at">;
