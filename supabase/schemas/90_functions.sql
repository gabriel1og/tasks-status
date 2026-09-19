CREATE OR REPLACE FUNCTION "public"."move_queries_to_root_before_folder_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  update public.saved_queries
    set folder_id = null
    where folder_id = old.id and user_id = old.user_id;
  return old;
end;
$$;

ALTER FUNCTION "public"."move_queries_to_root_before_folder_delete"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."touch_saved_query_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION "public"."touch_saved_query_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."touch_sprint_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION "public"."touch_sprint_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."touch_task_environment_status_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

ALTER FUNCTION "public"."touch_task_environment_status_updated_at"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "time_tracking_settings_touch_updated_at" ON "public"."time_tracking_settings";
DROP TRIGGER IF EXISTS "time_categories_touch_updated_at" ON "public"."time_categories";
DROP TRIGGER IF EXISTS "time_entries_touch_updated_at" ON "public"."time_entries";
DROP TRIGGER IF EXISTS "time_non_working_days_touch_updated_at" ON "public"."time_non_working_days";
DROP FUNCTION IF EXISTS "public"."touch_time_tracking_updated_at"();

CREATE OR REPLACE FUNCTION "public"."set_time_tracking_timestamps"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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

ALTER FUNCTION "public"."set_time_tracking_timestamps"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."validate_time_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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
    select 1
    from public.time_non_working_days
    where user_id = new.user_id
      and non_working_date = new.entry_date
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

ALTER FUNCTION "public"."validate_time_entry"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."validate_time_non_working_day"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if extract(isodow from new.non_working_date) in (6, 7) then
    raise exception using
      errcode = '23514',
      message = 'Finais de semana ja sao ignorados automaticamente.';
  end if;

  if exists (
    select 1
    from public.time_entries
    where user_id = new.user_id
      and entry_date = new.non_working_date
  ) then
    raise exception using
      errcode = '23514',
      message = 'Remova os apontamentos existentes antes de marcar o dia como sem expediente.';
  end if;

  return new;
end;
$$;

ALTER FUNCTION "public"."validate_time_non_working_day"() OWNER TO "postgres";

CREATE OR REPLACE TRIGGER "query_folders_move_queries_to_root" BEFORE DELETE ON "public"."query_folders" FOR EACH ROW EXECUTE FUNCTION "public"."move_queries_to_root_before_folder_delete"();

CREATE OR REPLACE TRIGGER "saved_queries_touch_updated_at" BEFORE UPDATE ON "public"."saved_queries" FOR EACH ROW EXECUTE FUNCTION "public"."touch_saved_query_updated_at"();

CREATE OR REPLACE TRIGGER "sprints_touch_updated_at" BEFORE UPDATE ON "public"."sprints" FOR EACH ROW EXECUTE FUNCTION "public"."touch_sprint_updated_at"();

CREATE OR REPLACE TRIGGER "task_environment_area_statuses_touch_updated_at" BEFORE UPDATE ON "public"."task_environment_area_statuses" FOR EACH ROW EXECUTE FUNCTION "public"."touch_task_environment_status_updated_at"();

CREATE OR REPLACE TRIGGER "task_environment_statuses_touch_updated_at" BEFORE UPDATE ON "public"."task_environment_statuses" FOR EACH ROW EXECUTE FUNCTION "public"."touch_task_environment_status_updated_at"();

CREATE OR REPLACE TRIGGER "time_categories_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."time_categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_time_tracking_timestamps"();

CREATE OR REPLACE TRIGGER "time_entries_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."set_time_tracking_timestamps"();

CREATE OR REPLACE TRIGGER "time_entries_validate" BEFORE INSERT OR UPDATE ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."validate_time_entry"();

CREATE OR REPLACE TRIGGER "time_non_working_days_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."time_non_working_days" FOR EACH ROW EXECUTE FUNCTION "public"."set_time_tracking_timestamps"();

CREATE OR REPLACE TRIGGER "time_non_working_days_validate" BEFORE INSERT OR UPDATE ON "public"."time_non_working_days" FOR EACH ROW EXECUTE FUNCTION "public"."validate_time_non_working_day"();

CREATE OR REPLACE TRIGGER "time_tracking_settings_set_timestamps" BEFORE INSERT OR UPDATE ON "public"."time_tracking_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_time_tracking_timestamps"();

GRANT ALL ON FUNCTION "public"."move_queries_to_root_before_folder_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."move_queries_to_root_before_folder_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."move_queries_to_root_before_folder_delete"() TO "service_role";

GRANT ALL ON FUNCTION "public"."touch_saved_query_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_saved_query_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_saved_query_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."touch_sprint_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_sprint_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_sprint_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."touch_task_environment_status_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_task_environment_status_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_task_environment_status_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."set_time_tracking_timestamps"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_time_tracking_timestamps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_time_tracking_timestamps"() TO "service_role";

GRANT ALL ON FUNCTION "public"."validate_time_entry"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_time_entry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_time_entry"() TO "service_role";

GRANT ALL ON FUNCTION "public"."validate_time_non_working_day"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_time_non_working_day"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_time_non_working_day"() TO "service_role";
