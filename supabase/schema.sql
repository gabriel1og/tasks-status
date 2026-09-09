create extension if not exists "pgcrypto";

create table if not exists public.user_settings (
  user_id uuid primary key,
  nome text not null default '',
  cargo text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.tag_options (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tipo text not null check (tipo in ('status', 'ambiente')),
  nome text not null,
  cor text not null default '#2563eb',
  created_at timestamptz not null default now(),
  unique (user_id, tipo, nome)
);

create table if not exists public.sprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  nome text not null,
  data_inicio date not null,
  data_fim date not null,
  created_at timestamptz not null default now(),
  unique (user_id, nome),
  check (data_fim >= data_inicio)
);

create table if not exists public.task_statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  nome text not null,
  azure text not null default '',
  azure_url text not null default '',
  liveops_url text not null default '',
  sprint text not null default '',
  sprint_id uuid,
  is_future boolean not null default false,
  status text not null,
  ambiente text not null,
  created_at timestamptz not null default now()
);

alter table public.task_statuses
  add column if not exists azure_url text not null default '',
  add column if not exists liveops_url text not null default '',
  add column if not exists sprint_id uuid,
  add column if not exists is_future boolean not null default false;

alter table public.task_statuses
  drop constraint if exists task_statuses_sprint_id_fkey;

alter table public.task_statuses
  add constraint task_statuses_sprint_id_fkey
  foreign key (sprint_id) references public.sprints(id) on delete set null;

alter table public.user_settings drop constraint if exists user_settings_user_id_fkey;
alter table public.tag_options drop constraint if exists tag_options_user_id_fkey;
alter table public.sprints drop constraint if exists sprints_user_id_fkey;
alter table public.task_statuses drop constraint if exists task_statuses_user_id_fkey;

alter table public.user_settings enable row level security;
alter table public.tag_options enable row level security;
alter table public.sprints enable row level security;
alter table public.task_statuses enable row level security;

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

create policy "Usuarios leem o proprio perfil"
  on public.user_settings for select
  using (user_id = '00000000-0000-4000-8000-000000000001');

create policy "Usuarios salvam o proprio perfil"
  on public.user_settings for insert
  with check (user_id = '00000000-0000-4000-8000-000000000001');

create policy "Usuarios atualizam o proprio perfil"
  on public.user_settings for update
  using (user_id = '00000000-0000-4000-8000-000000000001')
  with check (user_id = '00000000-0000-4000-8000-000000000001');

create policy "Usuarios leem as proprias tags"
  on public.tag_options for select
  using (user_id = '00000000-0000-4000-8000-000000000001');

create policy "Usuarios criam as proprias tags"
  on public.tag_options for insert
  with check (user_id = '00000000-0000-4000-8000-000000000001');

create policy "Usuarios atualizam as proprias tags"
  on public.tag_options for update
  using (user_id = '00000000-0000-4000-8000-000000000001')
  with check (user_id = '00000000-0000-4000-8000-000000000001');

create policy "Usuarios removem as proprias tags"
  on public.tag_options for delete
  using (user_id = '00000000-0000-4000-8000-000000000001');

create policy "Usuarios leem as proprias sprints"
  on public.sprints for select
  using (user_id = '00000000-0000-4000-8000-000000000001');

create policy "Usuarios criam as proprias sprints"
  on public.sprints for insert
  with check (user_id = '00000000-0000-4000-8000-000000000001');

create policy "Usuarios atualizam as proprias sprints"
  on public.sprints for update
  using (user_id = '00000000-0000-4000-8000-000000000001')
  with check (user_id = '00000000-0000-4000-8000-000000000001');

create policy "Usuarios removem as proprias sprints"
  on public.sprints for delete
  using (user_id = '00000000-0000-4000-8000-000000000001');

create policy "Usuarios leem as proprias tarefas"
  on public.task_statuses for select
  using (user_id = '00000000-0000-4000-8000-000000000001');

create policy "Usuarios criam as proprias tarefas"
  on public.task_statuses for insert
  with check (user_id = '00000000-0000-4000-8000-000000000001');

create policy "Usuarios atualizam as proprias tarefas"
  on public.task_statuses for update
  using (user_id = '00000000-0000-4000-8000-000000000001')
  with check (user_id = '00000000-0000-4000-8000-000000000001');

create policy "Usuarios removem as proprias tarefas"
  on public.task_statuses for delete
  using (user_id = '00000000-0000-4000-8000-000000000001');
