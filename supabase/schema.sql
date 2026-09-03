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

create table if not exists public.task_statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  azure text not null default '',
  sprint text not null default '',
  status text not null,
  ambiente text not null,
  created_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
alter table public.tag_options enable row level security;
alter table public.task_statuses enable row level security;

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

create policy "Usuarios removem as proprias tags"
  on public.tag_options for delete
  using (auth.uid() = user_id);

create policy "Usuarios leem as proprias tarefas"
  on public.task_statuses for select
  using (auth.uid() = user_id);

create policy "Usuarios criam as proprias tarefas"
  on public.task_statuses for insert
  with check (auth.uid() = user_id);

create policy "Usuarios removem as proprias tarefas"
  on public.task_statuses for delete
  using (auth.uid() = user_id);
