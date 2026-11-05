-- Additive migration for Supabase. Never run automatically at application startup.
BEGIN;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

CREATE TABLE public.data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  license text NOT NULL,
  attribution text NOT NULL,
  retrieved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE public.geo_layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.data_sources(id),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'
);
-- One stable UUID per imported object; source_key is the importer deduplication key.
CREATE TABLE public.reference_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_id uuid NOT NULL REFERENCES public.geo_layers(id),
  source_key text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('building','infrastructure','transport_stop','transport_line')),
  name text,
  geom geometry(Geometry,4326) NOT NULL,
  height_m double precision CHECK (height_m >= 0),
  properties jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(layer_id, source_key),
  CHECK (NOT ST_IsEmpty(geom) AND ST_IsValid(geom))
);
CREATE INDEX reference_objects_geom_idx ON public.reference_objects USING gist(geom);
CREATE INDEX reference_objects_layer_kind_idx ON public.reference_objects(layer_id,kind);
CREATE TABLE public.scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Virtual changes never update reference_objects. Base can be NULL only for creations.
CREATE TABLE public.scenario_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  reference_object_id uuid REFERENCES public.reference_objects(id),
  operation text NOT NULL CHECK (operation IN ('create','update','delete')),
  geom geometry(Geometry,4326),
  properties jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((operation = 'create' AND reference_object_id IS NULL AND geom IS NOT NULL)
      OR (operation IN ('update','delete') AND reference_object_id IS NOT NULL)),
  CHECK (geom IS NULL OR (NOT ST_IsEmpty(geom) AND ST_IsValid(geom))),
  UNIQUE(scenario_id, reference_object_id)
);
CREATE INDEX scenario_changes_geom_idx ON public.scenario_changes USING gist(geom);
CREATE INDEX scenario_changes_scenario_idx ON public.scenario_changes(scenario_id);
CREATE INDEX scenarios_owner_idx ON public.scenarios(owner_id);

ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_changes ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.data_sources, public.geo_layers, public.reference_objects TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.data_sources, public.geo_layers, public.reference_objects FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenarios, public.scenario_changes TO authenticated;
REVOKE ALL ON public.scenarios, public.scenario_changes FROM anon;
CREATE POLICY sources_read ON public.data_sources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY layers_read ON public.geo_layers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY reference_read ON public.reference_objects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY scenarios_owner ON public.scenarios FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = owner_id) WITH CHECK ((SELECT auth.uid()) = owner_id);
CREATE POLICY changes_owner ON public.scenario_changes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.scenarios s WHERE s.id = scenario_id AND s.owner_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.scenarios s WHERE s.id = scenario_id AND s.owner_id = (SELECT auth.uid())));
COMMIT;
