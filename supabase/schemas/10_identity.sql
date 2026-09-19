CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "user_id" "uuid" NOT NULL,
    "nome" "text" DEFAULT ''::"text" NOT NULL,
    "cargo" "text" DEFAULT ''::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."user_settings" OWNER TO "postgres";

ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id");

ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE NOT VALID;

CREATE POLICY "Usuarios atualizam o proprio perfil" ON "public"."user_settings" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios leem o proprio perfil" ON "public"."user_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios salvam o proprio perfil" ON "public"."user_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";
