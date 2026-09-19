CREATE TABLE public.time_tracking_settings (
  user_id uuid NOT NULL,
  daily_goal_minutes integer DEFAULT 360 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT time_tracking_settings_daily_goal_check CHECK (daily_goal_minutes > 0),
  CONSTRAINT time_tracking_settings_pkey PRIMARY KEY (user_id),
  CONSTRAINT time_tracking_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.time_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#2563eb'::text NOT NULL,
  archived_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT time_categories_color_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$'::text),
  CONSTRAINT time_categories_name_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT time_categories_pkey PRIMARY KEY (id),
  CONSTRAINT time_categories_id_user_id_key UNIQUE (id, user_id),
  CONSTRAINT time_categories_user_id_name_key UNIQUE (user_id, name),
  CONSTRAINT time_categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.time_entries (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  entry_date date NOT NULL,
  duration_minutes integer NOT NULL,
  task text NOT NULL,
  category_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT time_entries_duration_check CHECK (duration_minutes > 0),
  CONSTRAINT time_entries_task_check CHECK (char_length(btrim(task)) BETWEEN 1 AND 200),
  CONSTRAINT time_entries_pkey PRIMARY KEY (id),
  CONSTRAINT time_entries_category_owner_fkey FOREIGN KEY (category_id, user_id) REFERENCES public.time_categories(id, user_id),
  CONSTRAINT time_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX time_categories_user_archived_idx ON public.time_categories USING btree (user_id, archived_at, name);
CREATE INDEX time_entries_user_category_date_idx ON public.time_entries USING btree (user_id, category_id, entry_date DESC);
CREATE INDEX time_entries_user_date_idx ON public.time_entries USING btree (user_id, entry_date DESC);

CREATE OR REPLACE FUNCTION public.touch_time_tracking_updated_at() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.validate_time_entry() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $$
declare
  category_changed boolean;
begin
  if new.entry_date > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception using
      errcode = '23514',
      message = 'A data do apontamento nao pode estar no futuro.';
  end if;

  if tg_op = 'INSERT' then
    category_changed := true;
  else
    category_changed := new.category_id is distinct from old.category_id
      or new.user_id is distinct from old.user_id;
  end if;

  if category_changed then
    if exists (
      select 1
      from public.time_categories
      where id = new.category_id
        and user_id = new.user_id
        and archived_at is not null
    ) then
      raise exception using
        errcode = '23514',
        message = 'Uma categoria arquivada nao pode receber novos apontamentos.';
    end if;
  end if;

  return new;
end;
$$;

CREATE TRIGGER time_categories_touch_updated_at
  BEFORE UPDATE ON public.time_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_time_tracking_updated_at();

CREATE TRIGGER time_entries_touch_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_time_tracking_updated_at();

CREATE TRIGGER time_entries_validate
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_time_entry();

CREATE TRIGGER time_tracking_settings_touch_updated_at
  BEFORE UPDATE ON public.time_tracking_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_time_tracking_updated_at();

ALTER TABLE public.time_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_tracking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios atualizam as proprias categorias de horas" ON public.time_categories
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios criam as proprias categorias de horas" ON public.time_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios leem as proprias categorias de horas" ON public.time_categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios removem as proprias categorias de horas" ON public.time_categories
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Usuarios atualizam os proprios apontamentos" ON public.time_entries
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios criam os proprios apontamentos" ON public.time_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios leem os proprios apontamentos" ON public.time_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios removem os proprios apontamentos" ON public.time_entries
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Usuarios atualizam a propria configuracao de horas" ON public.time_tracking_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios criam a propria configuracao de horas" ON public.time_tracking_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios leem a propria configuracao de horas" ON public.time_tracking_settings
  FOR SELECT USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.time_categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.time_entries TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.time_tracking_settings TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.touch_time_tracking_updated_at() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.validate_time_entry() TO anon, authenticated, service_role;
