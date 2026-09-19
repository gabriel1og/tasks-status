CREATE TABLE public.time_non_working_days (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  non_working_date date NOT NULL,
  reason text NOT NULL,
  note text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT time_non_working_days_pkey PRIMARY KEY (id),
  CONSTRAINT time_non_working_days_user_date_key UNIQUE (user_id, non_working_date),
  CONSTRAINT time_non_working_days_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT time_non_working_days_reason_check CHECK (reason = ANY (ARRAY['holiday', 'vacation', 'other'])),
  CONSTRAINT time_non_working_days_note_check CHECK (note IS NULL OR char_length(btrim(note)) BETWEEN 1 AND 120)
);

ALTER TABLE public.time_non_working_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios atualizam os proprios dias sem apontamento"
  ON public.time_non_working_days FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios criam os proprios dias sem apontamento"
  ON public.time_non_working_days FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios leem os proprios dias sem apontamento"
  ON public.time_non_working_days FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Usuarios removem os proprios dias sem apontamento"
  ON public.time_non_working_days FOR DELETE
  USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.time_non_working_days TO anon, authenticated, service_role;

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

  if extract(isodow from new.entry_date) in (6, 7) then
    raise exception using
      errcode = '23514',
      message = 'Nao e permitido apontar horas em finais de semana.';
  end if;

  if exists (
    select 1 from public.time_non_working_days
    where user_id = new.user_id and non_working_date = new.entry_date
  ) then
    raise exception using
      errcode = '23514',
      message = 'Nao e permitido apontar horas em um dia sem expediente.';
  end if;

  if tg_op = 'INSERT' then
    category_changed := true;
  else
    category_changed := new.category_id is distinct from old.category_id
      or new.user_id is distinct from old.user_id;
  end if;

  if category_changed and exists (
    select 1 from public.time_categories
    where id = new.category_id
      and user_id = new.user_id
      and archived_at is not null
  ) then
    raise exception using
      errcode = '23514',
      message = 'Uma categoria arquivada nao pode receber novos apontamentos.';
  end if;

  return new;
end;
$$;

CREATE FUNCTION public.validate_time_non_working_day() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $$
begin
  if extract(isodow from new.non_working_date) in (6, 7) then
    raise exception using
      errcode = '23514',
      message = 'Finais de semana ja sao ignorados automaticamente.';
  end if;

  if exists (
    select 1 from public.time_entries
    where user_id = new.user_id and entry_date = new.non_working_date
  ) then
    raise exception using
      errcode = '23514',
      message = 'Remova os apontamentos existentes antes de marcar o dia como sem expediente.';
  end if;

  return new;
end;
$$;

CREATE TRIGGER time_non_working_days_set_timestamps
  BEFORE INSERT OR UPDATE ON public.time_non_working_days
  FOR EACH ROW EXECUTE FUNCTION public.set_time_tracking_timestamps();
CREATE TRIGGER time_non_working_days_validate
  BEFORE INSERT OR UPDATE ON public.time_non_working_days
  FOR EACH ROW EXECUTE FUNCTION public.validate_time_non_working_day();

GRANT ALL ON FUNCTION public.validate_time_non_working_day() TO anon, authenticated, service_role;
