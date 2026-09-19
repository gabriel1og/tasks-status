CREATE OR REPLACE FUNCTION public.set_time_tracking_timestamps() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $$
begin
  if tg_op = 'INSERT' then
    new.created_at = now();
  else
    new.created_at = old.created_at;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

DROP TRIGGER IF EXISTS time_tracking_settings_touch_updated_at ON public.time_tracking_settings;
DROP TRIGGER IF EXISTS time_categories_touch_updated_at ON public.time_categories;
DROP TRIGGER IF EXISTS time_entries_touch_updated_at ON public.time_entries;

CREATE TRIGGER time_tracking_settings_set_timestamps
  BEFORE INSERT OR UPDATE ON public.time_tracking_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_time_tracking_timestamps();

CREATE TRIGGER time_categories_set_timestamps
  BEFORE INSERT OR UPDATE ON public.time_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_time_tracking_timestamps();

CREATE TRIGGER time_entries_set_timestamps
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_time_tracking_timestamps();

DROP FUNCTION IF EXISTS public.touch_time_tracking_updated_at();

ALTER TABLE public.time_entries
  DROP CONSTRAINT time_entries_category_owner_fkey;

ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_category_owner_fkey
  FOREIGN KEY (category_id, user_id)
  REFERENCES public.time_categories(id, user_id)
  ON UPDATE RESTRICT
  ON DELETE RESTRICT;

GRANT ALL ON FUNCTION public.set_time_tracking_timestamps() TO anon, authenticated, service_role;
