-- RLS does not cover TRUNCATE, REFERENCES or TRIGGER privileges. Supabase can
-- grant broad privileges to new public tables through default privileges.
-- Reset only this application's tables; preserve server/importer grants.
BEGIN;
REVOKE ALL PRIVILEGES ON TABLE
  public.data_sources,
  public.geo_layers,
  public.reference_objects,
  public.scenarios,
  public.scenario_changes
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.data_sources, public.geo_layers, public.reference_objects
TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.scenarios, public.scenario_changes
TO authenticated;
COMMIT;
