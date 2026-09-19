


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



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

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."query_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "query_folders_nome_check" CHECK ((("char_length"("btrim"("nome")) >= 1) AND ("char_length"("btrim"("nome")) <= 120)))
);


ALTER TABLE "public"."query_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_queries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text" DEFAULT ''::"text" NOT NULL,
    "folder_id" "uuid",
    "is_favorite" boolean DEFAULT false NOT NULL,
    "definition" "jsonb" DEFAULT '{"match": "all", "conditions": []}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "saved_queries_definition_shape" CHECK (COALESCE((("jsonb_typeof"("definition") = 'object'::"text") AND (("definition" ->> 'match'::"text") = ANY (ARRAY['all'::"text", 'any'::"text"])) AND
CASE
    WHEN ("jsonb_typeof"(("definition" -> 'conditions'::"text")) = 'array'::"text") THEN ("jsonb_array_length"(("definition" -> 'conditions'::"text")) <= 50)
    ELSE false
END), false)),
    CONSTRAINT "saved_queries_descricao_check" CHECK (("char_length"("descricao") <= 2000)),
    CONSTRAINT "saved_queries_nome_check" CHECK ((("char_length"("btrim"("nome")) >= 1) AND ("char_length"("btrim"("nome")) <= 120)))
);


ALTER TABLE "public"."saved_queries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sprints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "objetivo" "text" DEFAULT ''::"text" NOT NULL,
    "criterios_sucesso" "text" DEFAULT ''::"text" NOT NULL,
    "observacoes" "text" DEFAULT ''::"text" NOT NULL,
    "links" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sprints_check" CHECK (("data_fim" >= "data_inicio")),
    CONSTRAINT "sprints_links_array_check" CHECK (("jsonb_typeof"("links") = 'array'::"text"))
);


ALTER TABLE "public"."sprints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tag_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "nome" "text" NOT NULL,
    "cor" "text" DEFAULT '#2563eb'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tag_options_tipo_check" CHECK (("tipo" = ANY (ARRAY['status'::"text", 'ambiente'::"text"])))
);


ALTER TABLE "public"."tag_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_environment_area_statuses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "task_id" "uuid" NOT NULL,
    "environment_tag_id" "uuid" NOT NULL,
    "area" "text" NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "task_environment_area_statuses_area_check" CHECK (("area" = ANY (ARRAY['frontend'::"text", 'backend'::"text"]))),
    CONSTRAINT "task_environment_area_statuses_status_check" CHECK (("status" = ANY (ARRAY['not_started'::"text", 'in_progress'::"text", 'available'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."task_environment_area_statuses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_environment_statuses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "task_id" "uuid" NOT NULL,
    "environment_tag_id" "uuid" NOT NULL,
    "available" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_environment_statuses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_statuses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "azure" "text" DEFAULT ''::"text" NOT NULL,
    "sprint" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" NOT NULL,
    "ambiente" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "azure_url" "text" DEFAULT ''::"text" NOT NULL,
    "liveops_url" "text" DEFAULT ''::"text" NOT NULL,
    "sprint_id" "uuid",
    "is_future" boolean DEFAULT false NOT NULL,
    "github_references" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "areas" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    CONSTRAINT "task_statuses_areas_check" CHECK (("areas" <@ ARRAY['frontend'::"text", 'backend'::"text"]))
);


ALTER TABLE "public"."task_statuses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "user_id" "uuid" NOT NULL,
    "nome" "text" DEFAULT ''::"text" NOT NULL,
    "cargo" "text" DEFAULT ''::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."query_folders"
    ADD CONSTRAINT "query_folders_id_user_id_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."query_folders"
    ADD CONSTRAINT "query_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."query_folders"
    ADD CONSTRAINT "query_folders_user_id_nome_key" UNIQUE ("user_id", "nome");



ALTER TABLE ONLY "public"."saved_queries"
    ADD CONSTRAINT "saved_queries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sprints"
    ADD CONSTRAINT "sprints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sprints"
    ADD CONSTRAINT "sprints_user_id_nome_key" UNIQUE ("user_id", "nome");



ALTER TABLE ONLY "public"."tag_options"
    ADD CONSTRAINT "tag_options_id_user_id_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."tag_options"
    ADD CONSTRAINT "tag_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tag_options"
    ADD CONSTRAINT "tag_options_user_id_tipo_nome_key" UNIQUE ("user_id", "tipo", "nome");



ALTER TABLE ONLY "public"."task_environment_area_statuses"
    ADD CONSTRAINT "task_environment_area_statuse_task_id_environment_tag_id_ar_key" UNIQUE ("task_id", "environment_tag_id", "area");



ALTER TABLE ONLY "public"."task_environment_area_statuses"
    ADD CONSTRAINT "task_environment_area_statuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_environment_statuses"
    ADD CONSTRAINT "task_environment_statuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_environment_statuses"
    ADD CONSTRAINT "task_environment_statuses_task_id_environment_tag_id_key" UNIQUE ("task_id", "environment_tag_id");



ALTER TABLE ONLY "public"."task_statuses"
    ADD CONSTRAINT "task_statuses_id_user_id_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."task_statuses"
    ADD CONSTRAINT "task_statuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "saved_queries_user_folder_idx" ON "public"."saved_queries" USING "btree" ("user_id", "folder_id");



CREATE INDEX "saved_queries_user_updated_idx" ON "public"."saved_queries" USING "btree" ("user_id", "updated_at" DESC);



CREATE OR REPLACE TRIGGER "query_folders_move_queries_to_root" BEFORE DELETE ON "public"."query_folders" FOR EACH ROW EXECUTE FUNCTION "public"."move_queries_to_root_before_folder_delete"();



CREATE OR REPLACE TRIGGER "saved_queries_touch_updated_at" BEFORE UPDATE ON "public"."saved_queries" FOR EACH ROW EXECUTE FUNCTION "public"."touch_saved_query_updated_at"();



CREATE OR REPLACE TRIGGER "sprints_touch_updated_at" BEFORE UPDATE ON "public"."sprints" FOR EACH ROW EXECUTE FUNCTION "public"."touch_sprint_updated_at"();



CREATE OR REPLACE TRIGGER "task_environment_area_statuses_touch_updated_at" BEFORE UPDATE ON "public"."task_environment_area_statuses" FOR EACH ROW EXECUTE FUNCTION "public"."touch_task_environment_status_updated_at"();



CREATE OR REPLACE TRIGGER "task_environment_statuses_touch_updated_at" BEFORE UPDATE ON "public"."task_environment_statuses" FOR EACH ROW EXECUTE FUNCTION "public"."touch_task_environment_status_updated_at"();



ALTER TABLE ONLY "public"."query_folders"
    ADD CONSTRAINT "query_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_queries"
    ADD CONSTRAINT "saved_queries_folder_owner_fkey" FOREIGN KEY ("folder_id", "user_id") REFERENCES "public"."query_folders"("id", "user_id");



ALTER TABLE ONLY "public"."saved_queries"
    ADD CONSTRAINT "saved_queries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sprints"
    ADD CONSTRAINT "sprints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."tag_options"
    ADD CONSTRAINT "tag_options_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."task_environment_area_statuses"
    ADD CONSTRAINT "task_environment_area_statuses_environment_owner_fkey" FOREIGN KEY ("environment_tag_id", "user_id") REFERENCES "public"."tag_options"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_environment_area_statuses"
    ADD CONSTRAINT "task_environment_area_statuses_task_owner_fkey" FOREIGN KEY ("task_id", "user_id") REFERENCES "public"."task_statuses"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_environment_area_statuses"
    ADD CONSTRAINT "task_environment_area_statuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."task_environment_statuses"
    ADD CONSTRAINT "task_environment_statuses_environment_owner_fkey" FOREIGN KEY ("environment_tag_id", "user_id") REFERENCES "public"."tag_options"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_environment_statuses"
    ADD CONSTRAINT "task_environment_statuses_task_owner_fkey" FOREIGN KEY ("task_id", "user_id") REFERENCES "public"."task_statuses"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_environment_statuses"
    ADD CONSTRAINT "task_environment_statuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."task_statuses"
    ADD CONSTRAINT "task_statuses_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task_statuses"
    ADD CONSTRAINT "task_statuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE NOT VALID;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE NOT VALID;



CREATE POLICY "Usuarios atualizam as proprias areas por ambiente" ON "public"."task_environment_area_statuses" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios atualizam as proprias pastas de queries" ON "public"."query_folders" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios atualizam as proprias queries" ON "public"."saved_queries" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios atualizam as proprias sprints" ON "public"."sprints" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios atualizam as proprias tags" ON "public"."tag_options" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios atualizam as proprias tarefas" ON "public"."task_statuses" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios atualizam o proprio perfil" ON "public"."user_settings" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios atualizam os proprios ambientes das tarefas" ON "public"."task_environment_statuses" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios criam as proprias areas por ambiente" ON "public"."task_environment_area_statuses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios criam as proprias pastas de queries" ON "public"."query_folders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios criam as proprias queries" ON "public"."saved_queries" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios criam as proprias sprints" ON "public"."sprints" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios criam as proprias tags" ON "public"."tag_options" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios criam as proprias tarefas" ON "public"."task_statuses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios criam os proprios ambientes das tarefas" ON "public"."task_environment_statuses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios leem as proprias areas por ambiente" ON "public"."task_environment_area_statuses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios leem as proprias pastas de queries" ON "public"."query_folders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios leem as proprias queries" ON "public"."saved_queries" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios leem as proprias sprints" ON "public"."sprints" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios leem as proprias tags" ON "public"."tag_options" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios leem as proprias tarefas" ON "public"."task_statuses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios leem o proprio perfil" ON "public"."user_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios leem os proprios ambientes das tarefas" ON "public"."task_environment_statuses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios removem as proprias areas por ambiente" ON "public"."task_environment_area_statuses" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios removem as proprias pastas de queries" ON "public"."query_folders" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios removem as proprias queries" ON "public"."saved_queries" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios removem as proprias sprints" ON "public"."sprints" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios removem as proprias tags" ON "public"."tag_options" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios removem as proprias tarefas" ON "public"."task_statuses" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios removem os proprios ambientes das tarefas" ON "public"."task_environment_statuses" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios salvam o proprio perfil" ON "public"."user_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."query_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_queries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sprints" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tag_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_environment_area_statuses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_environment_statuses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_statuses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



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



GRANT ALL ON TABLE "public"."query_folders" TO "anon";
GRANT ALL ON TABLE "public"."query_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."query_folders" TO "service_role";



GRANT ALL ON TABLE "public"."saved_queries" TO "anon";
GRANT ALL ON TABLE "public"."saved_queries" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_queries" TO "service_role";



GRANT ALL ON TABLE "public"."sprints" TO "anon";
GRANT ALL ON TABLE "public"."sprints" TO "authenticated";
GRANT ALL ON TABLE "public"."sprints" TO "service_role";



GRANT ALL ON TABLE "public"."tag_options" TO "anon";
GRANT ALL ON TABLE "public"."tag_options" TO "authenticated";
GRANT ALL ON TABLE "public"."tag_options" TO "service_role";



GRANT ALL ON TABLE "public"."task_environment_area_statuses" TO "anon";
GRANT ALL ON TABLE "public"."task_environment_area_statuses" TO "authenticated";
GRANT ALL ON TABLE "public"."task_environment_area_statuses" TO "service_role";



GRANT ALL ON TABLE "public"."task_environment_statuses" TO "anon";
GRANT ALL ON TABLE "public"."task_environment_statuses" TO "authenticated";
GRANT ALL ON TABLE "public"."task_environment_statuses" TO "service_role";



GRANT ALL ON TABLE "public"."task_statuses" TO "anon";
GRANT ALL ON TABLE "public"."task_statuses" TO "authenticated";
GRANT ALL ON TABLE "public"."task_statuses" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







