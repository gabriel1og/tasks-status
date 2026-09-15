create extension if not exists "pgcrypto";

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  cargo text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.tag_options (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('status', 'ambiente')),
  nome text not null,
  cor text not null default '#2563eb',
  created_at timestamptz not null default now(),
  unique (user_id, tipo, nome)
);

create table if not exists public.sprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  data_inicio date not null,
  data_fim date not null,
  created_at timestamptz not null default now(),
  unique (user_id, nome),
  check (data_fim >= data_inicio)
);

create table if not exists public.task_statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  azure text not null default '',
  azure_url text not null default '',
  liveops_url text not null default '',
  github_references jsonb not null default '[]'::jsonb,
  sprint text not null default '',
  sprint_id uuid,
  is_future boolean not null default false,
  status text not null,
  ambiente text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.task_environment_statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.task_statuses(id) on delete cascade,
  environment_tag_id uuid not null references public.tag_options(id) on delete cascade,
  available boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, environment_tag_id)
);

alter table public.task_statuses
  add column if not exists azure_url text not null default '',
  add column if not exists liveops_url text not null default '',
  add column if not exists github_references jsonb not null default '[]'::jsonb,
  add column if not exists sprint_id uuid,
  add column if not exists is_future boolean not null default false;

-- Migra a referencia singular criada pela issue #4 antes de remover as colunas antigas.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'task_statuses'
      and column_name = 'github_branch'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'task_statuses'
      and column_name = 'github_pr_url'
  ) then
    execute $migration$
      update public.task_statuses
      set github_references = jsonb_build_array(
        jsonb_build_object(
          'branch', btrim(github_branch),
          'pr_url', btrim(github_pr_url)
        )
      )
      where github_references = '[]'::jsonb
        and (btrim(github_branch) <> '' or btrim(github_pr_url) <> '')
    $migration$;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'task_statuses'
      and column_name = 'github_branch'
  ) then
    execute $migration$
      update public.task_statuses
      set github_references = jsonb_build_array(
        jsonb_build_object('branch', btrim(github_branch), 'pr_url', '')
      )
      where github_references = '[]'::jsonb
        and btrim(github_branch) <> ''
    $migration$;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'task_statuses'
      and column_name = 'github_pr_url'
  ) then
    execute $migration$
      update public.task_statuses
      set github_references = jsonb_build_array(
        jsonb_build_object('branch', '', 'pr_url', btrim(github_pr_url))
      )
      where github_references = '[]'::jsonb
        and btrim(github_pr_url) <> ''
    $migration$;
  end if;
end;
$$;

alter table public.task_statuses
  drop column if exists github_branch,
  drop column if exists github_pr_url;

alter table public.task_statuses
  drop constraint if exists task_statuses_sprint_id_fkey;

alter table public.task_statuses
  add constraint task_statuses_sprint_id_fkey
  foreign key (sprint_id) references public.sprints(id) on delete set null;

-- As FKs compostas dependem das constraints unicas e devem ser removidas primeiro.
alter table public.task_environment_statuses drop constraint if exists task_environment_statuses_task_id_fkey;
alter table public.task_environment_statuses drop constraint if exists task_environment_statuses_environment_tag_id_fkey;
alter table public.task_environment_statuses drop constraint if exists task_environment_statuses_task_owner_fkey;
alter table public.task_environment_statuses drop constraint if exists task_environment_statuses_environment_owner_fkey;
alter table public.tag_options drop constraint if exists tag_options_id_user_id_key;
alter table public.task_statuses drop constraint if exists task_statuses_id_user_id_key;

alter table public.tag_options
  add constraint tag_options_id_user_id_key unique (id, user_id);

alter table public.task_statuses
  add constraint task_statuses_id_user_id_key unique (id, user_id);

alter table public.task_environment_statuses
  add constraint task_environment_statuses_task_owner_fkey
  foreign key (task_id, user_id) references public.task_statuses(id, user_id) on delete cascade;

alter table public.task_environment_statuses
  add constraint task_environment_statuses_environment_owner_fkey
  foreign key (environment_tag_id, user_id) references public.tag_options(id, user_id) on delete cascade;

alter table public.user_settings drop constraint if exists user_settings_user_id_fkey;
alter table public.tag_options drop constraint if exists tag_options_user_id_fkey;
alter table public.sprints drop constraint if exists sprints_user_id_fkey;
alter table public.task_statuses drop constraint if exists task_statuses_user_id_fkey;
alter table public.task_environment_statuses drop constraint if exists task_environment_statuses_user_id_fkey;

-- NOT VALID preserva registros do acesso compartilhado anterior durante a migracao.
-- A restricao continua sendo aplicada a todo novo registro autenticado.
alter table public.user_settings
  add constraint user_settings_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table public.tag_options
  add constraint tag_options_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table public.sprints
  add constraint sprints_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table public.task_statuses
  add constraint task_statuses_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table public.task_environment_statuses
  add constraint task_environment_statuses_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table public.user_settings enable row level security;
alter table public.tag_options enable row level security;
alter table public.sprints enable row level security;
alter table public.task_statuses enable row level security;
alter table public.task_environment_statuses enable row level security;

drop policy if exists "Usuarios leem o proprio perfil" on public.user_settings;
drop policy if exists "Usuarios salvam o proprio perfil" on public.user_settings;
drop policy if exists "Usuarios atualizam o proprio perfil" on public.user_settings;
drop policy if exists "Usuarios leem as proprias tags" on public.tag_options;
drop policy if exists "Usuarios criam as proprias tags" on public.tag_options;
drop policy if exists "Usuarios atualizam as proprias tags" on public.tag_options;
drop policy if exists "Usuarios removem as proprias tags" on public.tag_options;
drop policy if exists "Usuarios leem as proprias sprints" on public.sprints;
drop policy if exists "Usuarios criam as proprias sprints" on public.sprints;
drop policy if exists "Usuarios atualizam as proprias sprints" on public.sprints;
drop policy if exists "Usuarios removem as proprias sprints" on public.sprints;
drop policy if exists "Usuarios leem as proprias tarefas" on public.task_statuses;
drop policy if exists "Usuarios criam as proprias tarefas" on public.task_statuses;
drop policy if exists "Usuarios atualizam as proprias tarefas" on public.task_statuses;
drop policy if exists "Usuarios removem as proprias tarefas" on public.task_statuses;
drop policy if exists "Usuarios leem os proprios ambientes das tarefas" on public.task_environment_statuses;
drop policy if exists "Usuarios criam os proprios ambientes das tarefas" on public.task_environment_statuses;
drop policy if exists "Usuarios atualizam os proprios ambientes das tarefas" on public.task_environment_statuses;
drop policy if exists "Usuarios removem os proprios ambientes das tarefas" on public.task_environment_statuses;

create policy "Usuarios leem o proprio perfil"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Usuarios salvam o proprio perfil"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Usuarios atualizam o proprio perfil"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuarios leem as proprias tags"
  on public.tag_options for select
  using (auth.uid() = user_id);

create policy "Usuarios criam as proprias tags"
  on public.tag_options for insert
  with check (auth.uid() = user_id);

create policy "Usuarios atualizam as proprias tags"
  on public.tag_options for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuarios removem as proprias tags"
  on public.tag_options for delete
  using (auth.uid() = user_id);

create policy "Usuarios leem as proprias sprints"
  on public.sprints for select
  using (auth.uid() = user_id);

create policy "Usuarios criam as proprias sprints"
  on public.sprints for insert
  with check (auth.uid() = user_id);

create policy "Usuarios atualizam as proprias sprints"
  on public.sprints for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuarios removem as proprias sprints"
  on public.sprints for delete
  using (auth.uid() = user_id);

create policy "Usuarios leem as proprias tarefas"
  on public.task_statuses for select
  using (auth.uid() = user_id);

create policy "Usuarios criam as proprias tarefas"
  on public.task_statuses for insert
  with check (auth.uid() = user_id);

create policy "Usuarios atualizam as proprias tarefas"
  on public.task_statuses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuarios removem as proprias tarefas"
  on public.task_statuses for delete
  using (auth.uid() = user_id);

create policy "Usuarios leem os proprios ambientes das tarefas"
  on public.task_environment_statuses for select
  using (auth.uid() = user_id);

create policy "Usuarios criam os proprios ambientes das tarefas"
  on public.task_environment_statuses for insert
  with check (auth.uid() = user_id);

create policy "Usuarios atualizam os proprios ambientes das tarefas"
  on public.task_environment_statuses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuarios removem os proprios ambientes das tarefas"
  on public.task_environment_statuses for delete
  using (auth.uid() = user_id);

create or replace function public.touch_task_environment_status_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists task_environment_statuses_touch_updated_at on public.task_environment_statuses;
create trigger task_environment_statuses_touch_updated_at
  before update on public.task_environment_statuses
  for each row execute function public.touch_task_environment_status_updated_at();

create table if not exists public.query_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, nome)
);

create table if not exists public.saved_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 120),
  descricao text not null default '' check (char_length(descricao) <= 2000),
  folder_id uuid,
  is_favorite boolean not null default false,
  definition jsonb not null default '{"match":"all","conditions":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_queries_folder_owner_fkey
    foreign key (folder_id, user_id) references public.query_folders(id, user_id),
  constraint saved_queries_definition_shape check (coalesce(
    jsonb_typeof(definition) = 'object'
    and definition->>'match' in ('all', 'any')
    and case when jsonb_typeof(definition->'conditions') = 'array'
      then jsonb_array_length(definition->'conditions') <= 50
      else false
    end,
    false
  ))
);

create index if not exists saved_queries_user_folder_idx
  on public.saved_queries(user_id, folder_id);

create index if not exists saved_queries_user_updated_idx
  on public.saved_queries(user_id, updated_at desc);

-- Queries salvas continuam validas depois da migracao dos campos singulares.
update public.saved_queries as saved_query
set definition = jsonb_set(
  saved_query.definition,
  '{conditions}',
  (
    select jsonb_agg(
      case
        when condition->>'field' in ('github_branch', 'github_pr_url')
          then jsonb_set(
            condition,
            '{field}',
            to_jsonb('github_references'::text)
          )
        else condition
      end
      order by condition_index
    )
    from jsonb_array_elements(saved_query.definition->'conditions')
      with ordinality as conditions(condition, condition_index)
  )
)
where exists (
  select 1
  from jsonb_array_elements(saved_query.definition->'conditions') as conditions(condition)
  where condition->>'field' in ('github_branch', 'github_pr_url')
);

-- Apenas a pasta e removida; as queries continuam pertencendo ao mesmo usuario.
-- O trigger preserva user_id sem depender de SET NULL parcial em FKs compostas.
create or replace function public.move_queries_to_root_before_folder_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.saved_queries
    set folder_id = null
    where folder_id = old.id and user_id = old.user_id;
  return old;
end;
$$;

drop trigger if exists query_folders_move_queries_to_root on public.query_folders;
create trigger query_folders_move_queries_to_root
  before delete on public.query_folders
  for each row execute function public.move_queries_to_root_before_folder_delete();

create or replace function public.touch_saved_query_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saved_queries_touch_updated_at on public.saved_queries;
create trigger saved_queries_touch_updated_at
  before update on public.saved_queries
  for each row execute function public.touch_saved_query_updated_at();

alter table public.query_folders enable row level security;
alter table public.saved_queries enable row level security;

drop policy if exists "Usuarios leem as proprias pastas de queries" on public.query_folders;
drop policy if exists "Usuarios criam as proprias pastas de queries" on public.query_folders;
drop policy if exists "Usuarios atualizam as proprias pastas de queries" on public.query_folders;
drop policy if exists "Usuarios removem as proprias pastas de queries" on public.query_folders;
drop policy if exists "Usuarios leem as proprias queries" on public.saved_queries;
drop policy if exists "Usuarios criam as proprias queries" on public.saved_queries;
drop policy if exists "Usuarios atualizam as proprias queries" on public.saved_queries;
drop policy if exists "Usuarios removem as proprias queries" on public.saved_queries;

create policy "Usuarios leem as proprias pastas de queries"
  on public.query_folders for select
  using (auth.uid() = user_id);

create policy "Usuarios criam as proprias pastas de queries"
  on public.query_folders for insert
  with check (auth.uid() = user_id);

create policy "Usuarios atualizam as proprias pastas de queries"
  on public.query_folders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuarios removem as proprias pastas de queries"
  on public.query_folders for delete
  using (auth.uid() = user_id);

create policy "Usuarios leem as proprias queries"
  on public.saved_queries for select
  using (auth.uid() = user_id);

create policy "Usuarios criam as proprias queries"
  on public.saved_queries for insert
  with check (auth.uid() = user_id);

create policy "Usuarios atualizam as proprias queries"
  on public.saved_queries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuarios removem as proprias queries"
  on public.saved_queries for delete
  using (auth.uid() = user_id);
