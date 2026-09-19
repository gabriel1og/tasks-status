CREATE TABLE IF NOT EXISTS "public"."time_tracking_settings" (
    "user_id" "uuid" NOT NULL,
    "daily_goal_minutes" integer DEFAULT 360 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "time_tracking_settings_daily_goal_check" CHECK (("daily_goal_minutes" > 0))
);

ALTER TABLE "public"."time_tracking_settings" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."time_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#2563eb'::"text" NOT NULL,
    "archived_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "time_categories_color_check" CHECK (("color" ~ '^#[0-9A-Fa-f]{6}$'::"text")),
    CONSTRAINT "time_categories_name_check" CHECK (("char_length"("btrim"("name")) BETWEEN 1 AND 80))
);

ALTER TABLE "public"."time_categories" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."time_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "entry_date" "date" NOT NULL,
    "duration_minutes" integer NOT NULL,
    "task" "text" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "time_entries_duration_check" CHECK (("duration_minutes" > 0)),
    CONSTRAINT "time_entries_task_check" CHECK (("char_length"("btrim"("task")) BETWEEN 1 AND 200))
);

ALTER TABLE "public"."time_entries" OWNER TO "postgres";

ALTER TABLE ONLY "public"."time_tracking_settings"
    ADD CONSTRAINT "time_tracking_settings_pkey" PRIMARY KEY ("user_id");

ALTER TABLE ONLY "public"."time_categories"
    ADD CONSTRAINT "time_categories_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."time_categories"
    ADD CONSTRAINT "time_categories_id_user_id_key" UNIQUE ("id", "user_id");

ALTER TABLE ONLY "public"."time_categories"
    ADD CONSTRAINT "time_categories_user_id_name_key" UNIQUE ("user_id", "name");

ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id");

CREATE INDEX "time_categories_user_archived_idx" ON "public"."time_categories" USING "btree" ("user_id", "archived_at", "name");

CREATE INDEX "time_entries_user_category_date_idx" ON "public"."time_entries" USING "btree" ("user_id", "category_id", "entry_date" DESC);

CREATE INDEX "time_entries_user_date_idx" ON "public"."time_entries" USING "btree" ("user_id", "entry_date" DESC);

ALTER TABLE ONLY "public"."time_tracking_settings"
    ADD CONSTRAINT "time_tracking_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."time_categories"
    ADD CONSTRAINT "time_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_category_owner_fkey" FOREIGN KEY ("category_id", "user_id") REFERENCES "public"."time_categories"("id", "user_id") ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

DROP POLICY IF EXISTS "Usuarios atualizam as proprias categorias de horas" ON "public"."time_categories";
CREATE POLICY "Usuarios atualizam as proprias categorias de horas" ON "public"."time_categories" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Usuarios criam as proprias categorias de horas" ON "public"."time_categories";
CREATE POLICY "Usuarios criam as proprias categorias de horas" ON "public"."time_categories" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Usuarios leem as proprias categorias de horas" ON "public"."time_categories";
CREATE POLICY "Usuarios leem as proprias categorias de horas" ON "public"."time_categories" FOR SELECT USING (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Usuarios removem as proprias categorias de horas" ON "public"."time_categories";
CREATE POLICY "Usuarios removem as proprias categorias de horas" ON "public"."time_categories" FOR DELETE USING (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Usuarios atualizam os proprios apontamentos" ON "public"."time_entries";
CREATE POLICY "Usuarios atualizam os proprios apontamentos" ON "public"."time_entries" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Usuarios criam os proprios apontamentos" ON "public"."time_entries";
CREATE POLICY "Usuarios criam os proprios apontamentos" ON "public"."time_entries" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Usuarios leem os proprios apontamentos" ON "public"."time_entries";
CREATE POLICY "Usuarios leem os proprios apontamentos" ON "public"."time_entries" FOR SELECT USING (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Usuarios removem os proprios apontamentos" ON "public"."time_entries";
CREATE POLICY "Usuarios removem os proprios apontamentos" ON "public"."time_entries" FOR DELETE USING (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Usuarios atualizam a propria configuracao de horas" ON "public"."time_tracking_settings";
CREATE POLICY "Usuarios atualizam a propria configuracao de horas" ON "public"."time_tracking_settings" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Usuarios criam a propria configuracao de horas" ON "public"."time_tracking_settings";
CREATE POLICY "Usuarios criam a propria configuracao de horas" ON "public"."time_tracking_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Usuarios leem a propria configuracao de horas" ON "public"."time_tracking_settings";
CREATE POLICY "Usuarios leem a propria configuracao de horas" ON "public"."time_tracking_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));

ALTER TABLE "public"."time_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."time_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."time_tracking_settings" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."time_categories" TO "anon";
GRANT ALL ON TABLE "public"."time_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."time_categories" TO "service_role";

GRANT ALL ON TABLE "public"."time_entries" TO "anon";
GRANT ALL ON TABLE "public"."time_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."time_entries" TO "service_role";

GRANT ALL ON TABLE "public"."time_tracking_settings" TO "anon";
GRANT ALL ON TABLE "public"."time_tracking_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."time_tracking_settings" TO "service_role";
