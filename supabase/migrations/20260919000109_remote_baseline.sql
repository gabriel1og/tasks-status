SET local check_function_bodies = off;

CREATE TABLE "public"."query_folders" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "nome"       text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "query_folders_id_user_id_key" UNIQUE (id, user_id),
  CONSTRAINT "query_folders_nome_check" CHECK (((char_length(btrim(nome)) >= 1) AND (char_length(btrim(nome)) <= 120))),
  CONSTRAINT "query_folders_pkey" PRIMARY KEY (id),
  CONSTRAINT "query_folders_user_id_nome_key" UNIQUE (user_id, nome)
);

ALTER TABLE "public"."query_folders"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."saved_queries" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"     uuid                     NOT NULL,
  "nome"        text                     NOT NULL,
  "descricao"   text                     NOT NULL DEFAULT ''::text,
  "folder_id"   uuid,
  "is_favorite" boolean                  NOT NULL DEFAULT false,
  "definition"  jsonb                    NOT NULL DEFAULT '{"match": "all", "conditions": []}'::jsonb,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "saved_queries_definition_shape"
    CHECK (COALESCE(((jsonb_typeof(definition) = 'object'::text) AND ((definition ->> 'match'::text) = ANY (ARRAY['all'::text, 'any'::text])) AND
CASE
    WHEN (jsonb_typeof((definition -> 'conditions'::text)) = 'array'::text) THEN (jsonb_array_length((definition -> 'conditions'::text)) <= 50)
    ELSE false
END), false)),
  CONSTRAINT "saved_queries_descricao_check" CHECK ((char_length(descricao) <= 2000)),
  CONSTRAINT "saved_queries_nome_check" CHECK (((char_length(btrim(nome)) >= 1) AND (char_length(btrim(nome)) <= 120))),
  CONSTRAINT "saved_queries_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."saved_queries"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."sprints" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"           uuid                     NOT NULL,
  "nome"              text                     NOT NULL,
  "data_inicio"       date                     NOT NULL,
  "data_fim"          date                     NOT NULL,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "objetivo"          text                     NOT NULL DEFAULT ''::text,
  "criterios_sucesso" text                     NOT NULL DEFAULT ''::text,
  "observacoes"       text                     NOT NULL DEFAULT ''::text,
  "links"             jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "sprints_check" CHECK ((data_fim >= data_inicio)),
  CONSTRAINT "sprints_links_array_check" CHECK ((jsonb_typeof(links) = 'array'::text)),
  CONSTRAINT "sprints_pkey" PRIMARY KEY (id),
  CONSTRAINT "sprints_user_id_nome_key" UNIQUE (user_id, nome)
);

ALTER TABLE "public"."sprints"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."tag_options" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "tipo"       text                     NOT NULL,
  "nome"       text                     NOT NULL,
  "cor"        text                     NOT NULL DEFAULT '#2563eb'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "tag_options_id_user_id_key" UNIQUE (id, user_id),
  CONSTRAINT "tag_options_pkey" PRIMARY KEY (id),
  CONSTRAINT "tag_options_tipo_check" CHECK ((tipo = ANY (ARRAY['status'::text, 'ambiente'::text]))),
  CONSTRAINT "tag_options_user_id_tipo_nome_key" UNIQUE (user_id, tipo, nome)
);

ALTER TABLE "public"."tag_options"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."task_environment_area_statuses" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"            uuid                     NOT NULL,
  "task_id"            uuid                     NOT NULL,
  "environment_tag_id" uuid                     NOT NULL,
  "area"               text                     NOT NULL,
  "status"             text                     NOT NULL,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "task_environment_area_statuse_task_id_environment_tag_id_ar_key" UNIQUE (task_id, environment_tag_id, area),
  CONSTRAINT "task_environment_area_statuses_area_check" CHECK ((area = ANY (ARRAY['frontend'::text, 'backend'::text]))),
  CONSTRAINT "task_environment_area_statuses_pkey" PRIMARY KEY (id),
  CONSTRAINT "task_environment_area_statuses_status_check" CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'available'::text, 'blocked'::text])))
);

ALTER TABLE "public"."task_environment_area_statuses"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."task_environment_statuses" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"            uuid                     NOT NULL,
  "task_id"            uuid                     NOT NULL,
  "environment_tag_id" uuid                     NOT NULL,
  "available"          boolean                  NOT NULL DEFAULT false,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "task_environment_statuses_pkey" PRIMARY KEY (id),
  CONSTRAINT "task_environment_statuses_task_id_environment_tag_id_key" UNIQUE (task_id, environment_tag_id)
);

ALTER TABLE "public"."task_environment_statuses"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."task_statuses" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"           uuid                     NOT NULL,
  "nome"              text                     NOT NULL,
  "azure"             text                     NOT NULL DEFAULT ''::text,
  "sprint"            text                     NOT NULL DEFAULT ''::text,
  "status"            text                     NOT NULL,
  "ambiente"          text                     NOT NULL,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "azure_url"         text                     NOT NULL DEFAULT ''::text,
  "liveops_url"       text                     NOT NULL DEFAULT ''::text,
  "sprint_id"         uuid,
  "is_future"         boolean                  NOT NULL DEFAULT false,
  "github_references" jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "areas"             text[]                   NOT NULL DEFAULT '{}'::text[],
  CONSTRAINT "task_statuses_areas_check" CHECK ((areas <@ ARRAY['frontend'::text, 'backend'::text])),
  CONSTRAINT "task_statuses_id_user_id_key" UNIQUE (id, user_id),
  CONSTRAINT "task_statuses_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."task_statuses"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."user_settings" (
  "user_id"    uuid                     NOT NULL,
  "nome"       text                     NOT NULL DEFAULT ''::text,
  "cargo"      text                     NOT NULL DEFAULT ''::text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "user_settings_pkey" PRIMARY KEY (user_id)
);

ALTER TABLE "public"."user_settings"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.move_queries_to_root_before_folder_delete()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  update public.saved_queries
    set folder_id = null
    where folder_id = old.id and user_id = old.user_id;
  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION public.touch_saved_query_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.touch_sprint_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.touch_task_environment_status_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

ALTER TABLE "public"."query_folders"
  ADD CONSTRAINT "query_folders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."saved_queries"
  ADD CONSTRAINT "saved_queries_folder_owner_fkey" FOREIGN KEY (folder_id, user_id) REFERENCES public.query_folders(id, user_id);

ALTER TABLE "public"."saved_queries"
  ADD CONSTRAINT "saved_queries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."sprints"
  ADD CONSTRAINT "sprints_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."tag_options"
  ADD CONSTRAINT "tag_options_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."task_environment_area_statuses"
  ADD CONSTRAINT "task_environment_area_statuses_environment_owner_fkey" FOREIGN KEY (environment_tag_id, user_id) REFERENCES public.tag_options(id, user_id) ON DELETE CASCADE;

ALTER TABLE "public"."task_environment_area_statuses"
  ADD CONSTRAINT "task_environment_area_statuses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."task_environment_statuses"
  ADD CONSTRAINT "task_environment_statuses_environment_owner_fkey" FOREIGN KEY (environment_tag_id, user_id) REFERENCES public.tag_options(id, user_id) ON DELETE CASCADE;

ALTER TABLE "public"."task_environment_statuses"
  ADD CONSTRAINT "task_environment_statuses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."task_environment_area_statuses"
  ADD CONSTRAINT "task_environment_area_statuses_task_owner_fkey" FOREIGN KEY (task_id, user_id) REFERENCES public.task_statuses(id, user_id) ON DELETE CASCADE;

ALTER TABLE "public"."task_environment_statuses"
  ADD CONSTRAINT "task_environment_statuses_task_owner_fkey" FOREIGN KEY (task_id, user_id) REFERENCES public.task_statuses(id, user_id) ON DELETE CASCADE;

ALTER TABLE "public"."task_statuses"
  ADD CONSTRAINT "task_statuses_sprint_id_fkey" FOREIGN KEY (sprint_id) REFERENCES public.sprints(id) ON DELETE SET NULL;

ALTER TABLE "public"."task_statuses"
  ADD CONSTRAINT "task_statuses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."user_settings"
  ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

CREATE INDEX saved_queries_user_folder_idx ON public.saved_queries USING btree (user_id, folder_id);

CREATE INDEX saved_queries_user_updated_idx ON public.saved_queries USING btree (user_id, updated_at DESC);

CREATE TRIGGER query_folders_move_queries_to_root
  BEFORE DELETE ON public.query_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.move_queries_to_root_before_folder_delete();

CREATE TRIGGER saved_queries_touch_updated_at
  BEFORE UPDATE ON public.saved_queries
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_saved_query_updated_at();

CREATE TRIGGER sprints_touch_updated_at
  BEFORE UPDATE ON public.sprints
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_sprint_updated_at();

CREATE TRIGGER task_environment_area_statuses_touch_updated_at
  BEFORE UPDATE ON public.task_environment_area_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_task_environment_status_updated_at();

CREATE TRIGGER task_environment_statuses_touch_updated_at
  BEFORE UPDATE ON public.task_environment_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_task_environment_status_updated_at();

CREATE POLICY "Usuarios atualizam as proprias pastas de queries" ON "public"."query_folders"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuarios criam as proprias pastas de queries" ON "public"."query_folders"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuarios leem as proprias pastas de queries" ON "public"."query_folders"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Usuarios removem as proprias pastas de queries" ON "public"."query_folders"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Usuarios atualizam as proprias queries" ON "public"."saved_queries"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuarios criam as proprias queries" ON "public"."saved_queries"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuarios leem as proprias queries" ON "public"."saved_queries"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Usuarios removem as proprias queries" ON "public"."saved_queries"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Usuarios atualizam as proprias sprints" ON "public"."sprints"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuarios criam as proprias sprints" ON "public"."sprints"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuarios leem as proprias sprints" ON "public"."sprints"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Usuarios removem as proprias sprints" ON "public"."sprints"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Usuarios atualizam as proprias tags" ON "public"."tag_options"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuarios criam as proprias tags" ON "public"."tag_options"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuarios leem as proprias tags" ON "public"."tag_options"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Usuarios removem as proprias tags" ON "public"."tag_options"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Usuarios atualizam as proprias areas por ambiente" ON "public"."task_environment_area_statuses"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuarios criam as proprias areas por ambiente" ON "public"."task_environment_area_statuses"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuarios leem as proprias areas por ambiente" ON "public"."task_environment_area_statuses"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Usuarios removem as proprias areas por ambiente" ON "public"."task_environment_area_statuses"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Usuarios atualizam os proprios ambientes das tarefas" ON "public"."task_environment_statuses"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuarios criam os proprios ambientes das tarefas" ON "public"."task_environment_statuses"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuarios leem os proprios ambientes das tarefas" ON "public"."task_environment_statuses"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Usuarios removem os proprios ambientes das tarefas" ON "public"."task_environment_statuses"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Usuarios atualizam as proprias tarefas" ON "public"."task_statuses"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuarios criam as proprias tarefas" ON "public"."task_statuses"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuarios leem as proprias tarefas" ON "public"."task_statuses"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Usuarios removem as proprias tarefas" ON "public"."task_statuses"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Usuarios atualizam o proprio perfil" ON "public"."user_settings"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuarios leem o proprio perfil" ON "public"."user_settings"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));

CREATE POLICY "Usuarios salvam o proprio perfil" ON "public"."user_settings"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = user_id));

GRANT EXECUTE ON FUNCTION "public"."move_queries_to_root_before_folder_delete"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."touch_saved_query_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."touch_sprint_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."touch_task_environment_status_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."query_folders" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."saved_queries" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sprints" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tag_options" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."task_environment_area_statuses"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_environment_statuses" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_statuses" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_settings" TO "anon", "authenticated", "postgres", "service_role";

