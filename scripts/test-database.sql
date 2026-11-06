-- Disposable database only. Emulates the minimal Auth contract and broad table
-- defaults found in Supabase, not the full Supabase platform.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
CREATE SCHEMA IF NOT EXISTS :"postgis_schema";
CREATE EXTENSION postgis WITH SCHEMA :"postgis_schema";
GRANT USAGE ON SCHEMA :"postgis_schema" TO anon, authenticated;
SET search_path TO public, :"postgis_schema";
INSERT INTO auth.users VALUES ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
\i /tmp/preflight.sql
\i /tmp/apply-migrations.sql
\i /tmp/preflight.sql

-- Privilege checks are necessary: TRUNCATE is not subject to row-level security.
DO $$
DECLARE role_name text; table_name text; privilege_name text;
BEGIN
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
  FOREACH table_name IN ARRAY ARRAY['data_sources','geo_layers','reference_objects','scenarios','scenario_changes'] LOOP
   FOREACH privilege_name IN ARRAY ARRAY['TRUNCATE','TRIGGER','REFERENCES'] LOOP
    IF has_table_privilege(role_name, 'public.' || table_name, privilege_name) THEN
     RAISE EXCEPTION 'Unexpected % privilege for % on %', privilege_name, role_name, table_name;
    END IF;
   END LOOP;
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['data_sources','geo_layers','reference_objects'] LOOP
   IF NOT has_table_privilege(role_name, 'public.' || table_name, 'SELECT') THEN
    RAISE EXCEPTION 'Missing public reference read on %', table_name;
   END IF;
   FOREACH privilege_name IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    IF has_table_privilege(role_name, 'public.' || table_name, privilege_name) THEN
     RAISE EXCEPTION 'Reference write allowed for % on %', role_name, table_name;
    END IF;
   END LOOP;
  END LOOP;
 END LOOP;
END $$;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
INSERT INTO public.scenarios(id,name) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Test owner');
INSERT INTO public.scenario_changes(scenario_id,operation,geom) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','create',ST_SetSRID(ST_Point(6.1294,45.8992),4326));
DO $$ BEGIN
 IF (SELECT count(*) FROM public.scenario_changes) <> 1 THEN RAISE EXCEPTION 'Owner cannot read own change'; END IF;
 BEGIN
  UPDATE public.scenarios SET owner_id='22222222-2222-2222-2222-222222222222' WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  RAISE EXCEPTION 'Owner transferred scenario without authorization';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.scenarios) <> 0 THEN RAISE EXCEPTION 'Scenario leaked'; END IF;
 IF (SELECT count(*) FROM public.scenario_changes) <> 0 THEN RAISE EXCEPTION 'Change leaked'; END IF;
 BEGIN
  INSERT INTO public.scenario_changes(scenario_id,operation,geom) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','create',ST_SetSRID(ST_Point(6,45),4326));
  RAISE EXCEPTION 'Unauthorized write accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 UPDATE public.scenarios SET name='Stolen' WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 IF FOUND THEN RAISE EXCEPTION 'Unauthorized update accepted'; END IF;
 DELETE FROM public.scenario_changes WHERE scenario_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 IF FOUND THEN RAISE EXCEPTION 'Unauthorized delete accepted'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
UPDATE public.scenarios SET name='Owner edit' WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DELETE FROM public.scenarios WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.scenario_changes) THEN RAISE EXCEPTION 'Scenario deletion did not cascade'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT count(*) FROM public.reference_objects;
DO $$ BEGIN
 BEGIN
  PERFORM * FROM public.scenarios;
  RAISE EXCEPTION 'Anonymous scenario access accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM * FROM public.scenario_changes;
  RAISE EXCEPTION 'Anonymous change access accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
ROLLBACK;
SELECT 'Migration, privileges and RLS isolation checks passed' AS result;
