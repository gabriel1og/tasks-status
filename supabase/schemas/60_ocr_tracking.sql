CREATE TABLE public.ocr_tracking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_key text NOT NULL, supplier text NOT NULL CHECK (length(trim(supplier)) > 0),
  filename text NOT NULL CHECK (length(trim(filename)) > 0), layout_id text NOT NULL DEFAULT '', sub_layout_id text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '', category_description text NOT NULL DEFAULT '', category_id text NOT NULL DEFAULT '',
  subcategory text NOT NULL DEFAULT '', environment text NOT NULL DEFAULT '', tenant text NOT NULL DEFAULT '',
  assignee text NOT NULL DEFAULT '', next_action text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '',
  international text NOT NULL DEFAULT 'unknown' CHECK (international IN ('unknown','yes','no')),
  boleto text NOT NULL DEFAULT 'unknown' CHECK (boleto IN ('unknown','yes','no')),
  source_notes text NOT NULL DEFAULT '', source_record jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(source_record) = 'object'),
  source_match text NOT NULL DEFAULT '', archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id,user_id), UNIQUE (user_id,source_key)
);

CREATE TABLE public.ocr_tracking_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL, key text NOT NULL, stage integer NOT NULL CHECK (stage BETWEEN 1 AND 4), label text NOT NULL,
  conditional boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown','pending','in_progress','blocked','done','not_applicable')),
  evidence text NOT NULL DEFAULT '', confirmed_by text NOT NULL DEFAULT '', confirmed_on date,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (item_id,user_id) REFERENCES public.ocr_tracking_items(id,user_id) ON DELETE CASCADE,
  UNIQUE (item_id,key),
  CHECK (status <> 'not_applicable' OR (conditional AND length(trim(evidence)) > 0)),
  CHECK (status <> 'done' OR (length(trim(evidence)) > 0 AND length(trim(confirmed_by)) > 0 AND confirmed_on IS NOT NULL))
);

CREATE TABLE public.ocr_tracking_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL, key text NOT NULL, label text NOT NULL CHECK (length(trim(label)) > 0), required boolean NOT NULL DEFAULT false,
  applicability text NOT NULL DEFAULT 'unknown' CHECK (applicability IN ('unknown','yes','no')),
  availability text NOT NULL DEFAULT 'unknown' CHECK (availability IN ('unknown','present','absent','incomplete')),
  regex text NOT NULL DEFAULT '', expected_value text NOT NULL DEFAULT '',
  configuration text NOT NULL DEFAULT 'unknown' CHECK (configuration IN ('unknown','pending','configured')),
  magnifier_status text NOT NULL DEFAULT 'unknown' CHECK (magnifier_status IN ('unknown','pending','approved','rejected')),
  triage_status text NOT NULL DEFAULT 'unknown' CHECK (triage_status IN ('unknown','pending','approved','rejected')),
  magnifier_value text NOT NULL DEFAULT '', triage_value text NOT NULL DEFAULT '', evidence text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '',
  waiver_reason text NOT NULL DEFAULT '', waiver_by text NOT NULL DEFAULT '', waiver_on date,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (item_id,user_id) REFERENCES public.ocr_tracking_items(id,user_id) ON DELETE CASCADE,
  UNIQUE (item_id,key), UNIQUE (id,item_id,user_id),
  CHECK (NOT required OR applicability = 'yes'),
  CHECK (applicability <> 'no' OR length(trim(notes)) > 0),
  CHECK ((waiver_reason = '' AND waiver_by = '' AND waiver_on IS NULL) OR (length(trim(waiver_reason)) > 0 AND length(trim(waiver_by)) > 0 AND waiver_on IS NOT NULL)),
  CHECK ((magnifier_status <> 'approved' AND triage_status <> 'approved') OR length(trim(evidence)) > 0)
);

CREATE TABLE public.ocr_tracking_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL, field_id uuid, stage integer NOT NULL CHECK (stage BETWEEN 1 AND 4),
  kind text NOT NULL CHECK (kind IN ('missing_field','regex','configuration','category','partner','purchase_order','tax_values','payment_line','system','review')),
  description text NOT NULL CHECK (length(trim(description)) > 0), assignee text NOT NULL DEFAULT '', next_action text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','blocked','resolved','waived')),
  resolution text NOT NULL DEFAULT '', authorized_by text NOT NULL DEFAULT '', authorized_on date,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (item_id,user_id) REFERENCES public.ocr_tracking_items(id,user_id) ON DELETE CASCADE,
  FOREIGN KEY (field_id,item_id,user_id) REFERENCES public.ocr_tracking_fields(id,item_id,user_id),
  CHECK (status NOT IN ('resolved','waived') OR length(trim(resolution)) > 0),
  CHECK (status <> 'waived' OR (length(trim(authorized_by)) > 0 AND authorized_on IS NOT NULL))
);

CREATE TABLE public.ocr_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL, entity text NOT NULL, operation text NOT NULL,
  old_record jsonb, new_record jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (item_id,user_id) REFERENCES public.ocr_tracking_items(id,user_id) ON DELETE CASCADE
);

CREATE INDEX ocr_items_owner_idx ON public.ocr_tracking_items(user_id,archived_at,updated_at DESC);
CREATE INDEX ocr_checklist_owner_idx ON public.ocr_tracking_checklist(user_id,item_id);
CREATE INDEX ocr_fields_owner_idx ON public.ocr_tracking_fields(user_id,item_id);
CREATE INDEX ocr_issues_owner_idx ON public.ocr_tracking_issues(user_id,item_id,status);
CREATE INDEX ocr_events_owner_idx ON public.ocr_tracking_events(user_id,item_id,created_at DESC,id);

CREATE OR REPLACE FUNCTION public.ocr_before_write() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'OCR identity is immutable';
    END IF;
    IF TG_TABLE_NAME = 'ocr_tracking_items' THEN
      IF NEW.source_key IS DISTINCT FROM OLD.source_key OR NEW.source_notes IS DISTINCT FROM OLD.source_notes OR NEW.source_record IS DISTINCT FROM OLD.source_record THEN
        RAISE EXCEPTION 'OCR source snapshot is immutable';
      END IF;
    ELSE
      IF NEW.item_id IS DISTINCT FROM OLD.item_id THEN RAISE EXCEPTION 'OCR parent is immutable'; END IF;
    END IF;
    IF TG_TABLE_NAME = 'ocr_tracking_fields' THEN
      IF NEW.key IS DISTINCT FROM OLD.key OR NEW.required IS DISTINCT FROM OLD.required THEN RAISE EXCEPTION 'OCR field identity is immutable'; END IF;
      IF NEW.regex IS DISTINCT FROM OLD.regex THEN
        NEW.magnifier_status := 'pending'; NEW.triage_status := 'pending';
        NEW.magnifier_value := ''; NEW.triage_value := '';
      END IF;
    END IF;
    NEW.created_at := OLD.created_at;
  ELSE
    NEW.created_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.ocr_record_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE parent_id uuid; before_row jsonb; after_row jsonb;
BEGIN
  after_row := to_jsonb(NEW);
  IF TG_OP = 'UPDATE' THEN
    before_row := to_jsonb(OLD);
    IF (before_row - 'updated_at') = (after_row - 'updated_at') THEN RETURN NEW; END IF;
  END IF;
  parent_id := CASE WHEN TG_TABLE_NAME = 'ocr_tracking_items' THEN NEW.id ELSE (after_row->>'item_id')::uuid END;
  INSERT INTO public.ocr_tracking_events(user_id,item_id,entity,operation,old_record,new_record)
    VALUES (NEW.user_id,parent_id,TG_TABLE_NAME,TG_OP,before_row,after_row);
  IF TG_TABLE_NAME <> 'ocr_tracking_items' THEN
    UPDATE public.ocr_tracking_items SET updated_at = now() WHERE id = parent_id AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.ocr_record_event() FROM PUBLIC;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['ocr_tracking_items','ocr_tracking_checklist','ocr_tracking_fields','ocr_tracking_issues','ocr_tracking_events'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',table_name);
    EXECUTE format('DROP POLICY IF EXISTS ocr_owner_select ON public.%I',table_name);
    EXECUTE format('CREATE POLICY ocr_owner_select ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)',table_name);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated',table_name);
    IF table_name <> 'ocr_tracking_events' THEN
      EXECUTE format('DROP POLICY IF EXISTS ocr_owner_insert ON public.%I',table_name);
      EXECUTE format('CREATE POLICY ocr_owner_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)',table_name);
      EXECUTE format('DROP POLICY IF EXISTS ocr_owner_update ON public.%I',table_name);
      EXECUTE format('CREATE POLICY ocr_owner_update ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',table_name);
      EXECUTE format('GRANT INSERT,UPDATE ON public.%I TO authenticated',table_name);
      EXECUTE format('CREATE TRIGGER ocr_before_write BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ocr_before_write()',table_name);
      EXECUTE format('CREATE TRIGGER ocr_record_event AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ocr_record_event()',table_name);
    END IF;
  END LOOP;
END $$;

-- Invoker rights keep RLS active. Each source document is inserted once; existing progress is untouched.
CREATE OR REPLACE FUNCTION public.import_ocr_tracking(p_user_id uuid,p_documents jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE document jsonb; parent_record public.ocr_tracking_items; child jsonb; imported integer := 0; parent_id uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'OCR owner mismatch'; END IF;
  IF jsonb_typeof(p_documents) <> 'array' THEN RAISE EXCEPTION 'Expected OCR document array'; END IF;
  FOR document IN SELECT value FROM jsonb_array_elements(p_documents) LOOP
    parent_id := gen_random_uuid();
    parent_record := jsonb_populate_record(NULL::public.ocr_tracking_items, (document->'item') || jsonb_build_object('id',parent_id,'user_id',p_user_id));
    INSERT INTO public.ocr_tracking_items SELECT (parent_record).* ON CONFLICT (user_id,source_key) DO NOTHING;
    IF NOT FOUND THEN CONTINUE; END IF;
    FOR child IN SELECT value FROM jsonb_array_elements(document->'checklist') LOOP
      INSERT INTO public.ocr_tracking_checklist SELECT (jsonb_populate_record(NULL::public.ocr_tracking_checklist,
        child || jsonb_build_object('id',gen_random_uuid(),'user_id',p_user_id,'item_id',parent_id))).*;
    END LOOP;
    FOR child IN SELECT value FROM jsonb_array_elements(document->'fields') LOOP
      INSERT INTO public.ocr_tracking_fields SELECT (jsonb_populate_record(NULL::public.ocr_tracking_fields,
        child || jsonb_build_object('id',gen_random_uuid(),'user_id',p_user_id,'item_id',parent_id))).*;
    END LOOP;
    FOR child IN SELECT value FROM jsonb_array_elements(document->'issues') LOOP
      INSERT INTO public.ocr_tracking_issues SELECT (jsonb_populate_record(NULL::public.ocr_tracking_issues,
        child || jsonb_build_object('id',gen_random_uuid(),'user_id',p_user_id,'item_id',parent_id))).*;
    END LOOP;
    imported := imported + 1;
  END LOOP;
  RETURN imported;
END $$;
REVOKE ALL ON FUNCTION public.import_ocr_tracking(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_ocr_tracking(uuid,jsonb) TO authenticated;
