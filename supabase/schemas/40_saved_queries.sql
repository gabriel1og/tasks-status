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

ALTER TABLE ONLY "public"."query_folders"
    ADD CONSTRAINT "query_folders_id_user_id_key" UNIQUE ("id", "user_id");

ALTER TABLE ONLY "public"."query_folders"
    ADD CONSTRAINT "query_folders_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."query_folders"
    ADD CONSTRAINT "query_folders_user_id_nome_key" UNIQUE ("user_id", "nome");

ALTER TABLE ONLY "public"."saved_queries"
    ADD CONSTRAINT "saved_queries_pkey" PRIMARY KEY ("id");

CREATE INDEX "saved_queries_user_folder_idx" ON "public"."saved_queries" USING "btree" ("user_id", "folder_id");

CREATE INDEX "saved_queries_user_updated_idx" ON "public"."saved_queries" USING "btree" ("user_id", "updated_at" DESC);

ALTER TABLE ONLY "public"."query_folders"
    ADD CONSTRAINT "query_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."saved_queries"
    ADD CONSTRAINT "saved_queries_folder_owner_fkey" FOREIGN KEY ("folder_id", "user_id") REFERENCES "public"."query_folders"("id", "user_id");

ALTER TABLE ONLY "public"."saved_queries"
    ADD CONSTRAINT "saved_queries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

CREATE POLICY "Usuarios atualizam as proprias pastas de queries" ON "public"."query_folders" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios criam as proprias pastas de queries" ON "public"."query_folders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios leem as proprias pastas de queries" ON "public"."query_folders" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios removem as proprias pastas de queries" ON "public"."query_folders" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios atualizam as proprias queries" ON "public"."saved_queries" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios criam as proprias queries" ON "public"."saved_queries" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios leem as proprias queries" ON "public"."saved_queries" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Usuarios removem as proprias queries" ON "public"."saved_queries" FOR DELETE USING (("auth"."uid"() = "user_id"));

ALTER TABLE "public"."query_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."saved_queries" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."query_folders" TO "anon";
GRANT ALL ON TABLE "public"."query_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."query_folders" TO "service_role";

GRANT ALL ON TABLE "public"."saved_queries" TO "anon";
GRANT ALL ON TABLE "public"."saved_queries" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_queries" TO "service_role";
