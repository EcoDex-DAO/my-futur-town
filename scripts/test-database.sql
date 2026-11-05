-- Local disposable database ONLY: minimal Supabase Auth contract for RLS tests.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
INSERT INTO auth.users VALUES ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
\i /tmp/migration.sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
INSERT INTO public.scenarios(id,name) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Test owner');
INSERT INTO public.scenario_changes(scenario_id,operation,geom) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','create',public.ST_SetSRID(public.ST_Point(6.1294,45.8992),4326));
DO $$ BEGIN
 IF (SELECT count(*) FROM public.scenario_changes) <> 1 THEN RAISE EXCEPTION 'Owner cannot read own change'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.scenarios) <> 0 THEN RAISE EXCEPTION 'Scenario leaked'; END IF;
 IF (SELECT count(*) FROM public.scenario_changes) <> 0 THEN RAISE EXCEPTION 'Change leaked'; END IF;
 BEGIN
  INSERT INTO public.scenario_changes(scenario_id,operation,geom) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','create',public.ST_SetSRID(public.ST_Point(6,45),4326));
  RAISE EXCEPTION 'Unauthorized write accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  UPDATE public.scenarios SET owner_id='22222222-2222-2222-2222-222222222222' WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  IF FOUND THEN RAISE EXCEPTION 'Unauthorized ownership change'; END IF;
 END;
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
END $$;
ROLLBACK;
SELECT 'Migration and RLS isolation checks passed' AS result;
