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

ALTER TABLE ONLY "public"."task_statuses"
    ADD CONSTRAINT "task_statuses_id_user_id_key" UNIQUE ("id", "user_id");

ALTER TABLE ONLY "public"."task_statuses"
    ADD CONSTRAINT "task_statuses_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."sprints"
    ADD CONSTRAINT "sprints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE NOT VALID;

ALTER TABLE ONLY "public"."tag_options"
    ADD CONSTRAINT "tag_options_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE NOT VALID;

ALTER TABLE ONLY "public"."task_statuses"
    ADD CONSTRAINT "task_statuses_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."task_statuses"
    ADD CONSTRAINT "task_statuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE NOT VALID;

CREATE POLICY "Usuarios atualizam as proprias sprints" ON "public"."sprints" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios criam as proprias sprints" ON "public"."sprints" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios leem as proprias sprints" ON "public"."sprints" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios removem as proprias sprints" ON "public"."sprints" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios atualizam as proprias tags" ON "public"."tag_options" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios criam as proprias tags" ON "public"."tag_options" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios leem as proprias tags" ON "public"."tag_options" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios removem as proprias tags" ON "public"."tag_options" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios atualizam as proprias tarefas" ON "public"."task_statuses" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios criam as proprias tarefas" ON "public"."task_statuses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios leem as proprias tarefas" ON "public"."task_statuses" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios removem as proprias tarefas" ON "public"."task_statuses" FOR DELETE USING (("auth"."uid"() = "user_id"));

ALTER TABLE "public"."sprints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tag_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_statuses" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."sprints" TO "anon";
GRANT ALL ON TABLE "public"."sprints" TO "authenticated";
GRANT ALL ON TABLE "public"."sprints" TO "service_role";

GRANT ALL ON TABLE "public"."tag_options" TO "anon";
GRANT ALL ON TABLE "public"."tag_options" TO "authenticated";
GRANT ALL ON TABLE "public"."tag_options" TO "service_role";

GRANT ALL ON TABLE "public"."task_statuses" TO "anon";
GRANT ALL ON TABLE "public"."task_statuses" TO "authenticated";
GRANT ALL ON TABLE "public"."task_statuses" TO "service_role";
