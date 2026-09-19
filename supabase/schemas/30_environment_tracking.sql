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

ALTER TABLE ONLY "public"."task_environment_area_statuses"
    ADD CONSTRAINT "task_environment_area_statuse_task_id_environment_tag_id_ar_key" UNIQUE ("task_id", "environment_tag_id", "area");

ALTER TABLE ONLY "public"."task_environment_area_statuses"
    ADD CONSTRAINT "task_environment_area_statuses_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."task_environment_statuses"
    ADD CONSTRAINT "task_environment_statuses_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."task_environment_statuses"
    ADD CONSTRAINT "task_environment_statuses_task_id_environment_tag_id_key" UNIQUE ("task_id", "environment_tag_id");

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

CREATE POLICY "Usuarios atualizam as proprias areas por ambiente" ON "public"."task_environment_area_statuses" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios criam as proprias areas por ambiente" ON "public"."task_environment_area_statuses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios leem as proprias areas por ambiente" ON "public"."task_environment_area_statuses" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios removem as proprias areas por ambiente" ON "public"."task_environment_area_statuses" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios atualizam os proprios ambientes das tarefas" ON "public"."task_environment_statuses" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios criam os proprios ambientes das tarefas" ON "public"."task_environment_statuses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios leem os proprios ambientes das tarefas" ON "public"."task_environment_statuses" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios removem os proprios ambientes das tarefas" ON "public"."task_environment_statuses" FOR DELETE USING (("auth"."uid"() = "user_id"));

ALTER TABLE "public"."task_environment_area_statuses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_environment_statuses" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."task_environment_area_statuses" TO "anon";
GRANT ALL ON TABLE "public"."task_environment_area_statuses" TO "authenticated";
GRANT ALL ON TABLE "public"."task_environment_area_statuses" TO "service_role";

GRANT ALL ON TABLE "public"."task_environment_statuses" TO "anon";
GRANT ALL ON TABLE "public"."task_environment_statuses" TO "authenticated";
GRANT ALL ON TABLE "public"."task_environment_statuses" TO "service_role";
