-- YFT phase 2: immutable road snapshots and owner-scoped scenario profiles.
BEGIN;
SET LOCAL search_path = public, extensions;
CREATE TABLE public.road_nodes (
 id uuid PRIMARY KEY,
 layer_id uuid NOT NULL REFERENCES public.geo_layers(id),
 source_key text NOT NULL,
 geom geometry(Point,4326) NOT NULL,
 UNIQUE(layer_id,source_key)
);
CREATE INDEX road_nodes_geom_idx ON public.road_nodes USING gist(geom);
CREATE TABLE public.road_segments (
 id uuid PRIMARY KEY REFERENCES public.reference_objects(id),
 from_node_id uuid NOT NULL REFERENCES public.road_nodes(id),
 to_node_id uuid NOT NULL REFERENCES public.road_nodes(id),
 length_m double precision NOT NULL CHECK(length_m > 0),
 CHECK(from_node_id <> to_node_id)
);
CREATE INDEX road_segments_from_idx ON public.road_segments(from_node_id);
CREATE INDEX road_segments_to_idx ON public.road_segments(to_node_id);
ALTER TABLE public.road_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.road_segments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.road_nodes,public.road_segments FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.road_nodes,public.road_segments TO anon,authenticated;
CREATE POLICY road_nodes_read ON public.road_nodes FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY road_segments_read ON public.road_segments FOR SELECT TO anon,authenticated USING(true);
ALTER TABLE public.scenarios
 ADD COLUMN reference_layer_id uuid REFERENCES public.geo_layers(id),
 ADD COLUMN reference_version text,
 ADD COLUMN assumptions jsonb NOT NULL DEFAULT '{}',
 ADD COLUMN results jsonb NOT NULL DEFAULT '{}',
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE FUNCTION public.yft_valid_road_profile(p jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = public, extensions AS $$
DECLARE lanes numeric; total numeric; car numeric; cycle numeric; sidewalk numeric;
BEGIN
 IF p IS NULL OR jsonb_typeof(p)<>'object' THEN RETURN false; END IF;
 IF NOT (p ?& ARRAY['direction','lanes','width_m','lane_width_m','cycle_width_m','sidewalk_width_m']) THEN RETURN false; END IF;
 IF coalesce(p->>'direction','') NOT IN ('both','forward','reverse','closed') THEN RETURN false; END IF;
 IF jsonb_typeof(p->'lanes')<>'number' OR jsonb_typeof(p->'width_m')<>'number'
 OR jsonb_typeof(p->'lane_width_m')<>'number' OR jsonb_typeof(p->'cycle_width_m')<>'number'
 OR jsonb_typeof(p->'sidewalk_width_m')<>'number' THEN RETURN false; END IF;
 lanes:=(p->>'lanes')::numeric; total:=(p->>'width_m')::numeric;
 car:=(p->>'lane_width_m')::numeric; cycle:=(p->>'cycle_width_m')::numeric;
 sidewalk:=(p->>'sidewalk_width_m')::numeric;
 IF lanes<0 OR lanes>20 OR trunc(lanes)<>lanes OR total<=0 OR total>1000
 OR car<0 OR cycle<0 OR sidewalk<0 THEN RETURN false; END IF;
 IF p->>'direction'<>'closed' AND (lanes<1 OR car<=0) THEN RETURN false; END IF;
 IF lanes*car+cycle+sidewalk>total+0.001 THEN RETURN false; END IF;
 IF p ? 'speed_kph' AND p->'speed_kph'<>'null'::jsonb THEN
  IF jsonb_typeof(p->'speed_kph')<>'number' OR (p->>'speed_kph')::numeric<=0
  OR (p->>'speed_kph')::numeric>300 THEN RETURN false; END IF;
 END IF;
 RETURN true;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
END $$;

CREATE FUNCTION public.yft_check_road_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, extensions AS $$
DECLARE layer uuid; baseline uuid;
BEGIN
 IF NEW.reference_object_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.road_segments WHERE id=NEW.reference_object_id) THEN
  SELECT layer_id INTO baseline FROM public.reference_objects WHERE id=NEW.reference_object_id;
  SELECT reference_layer_id INTO layer FROM public.scenarios WHERE id=NEW.scenario_id;
  IF layer IS NULL OR layer<>baseline THEN RAISE EXCEPTION 'Road and scenario snapshots differ' USING ERRCODE='23514'; END IF;
  IF NEW.operation<>'update' OR NEW.geom IS NOT NULL THEN
   RAISE EXCEPTION 'This editor changes road profiles only' USING ERRCODE='23514';
  END IF;
  IF NOT public.yft_valid_road_profile(NEW.properties->'road_profile') THEN
   RAISE EXCEPTION 'Invalid road profile or allocated widths exceed total' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER yft_check_road_change BEFORE INSERT OR UPDATE ON public.scenario_changes
 FOR EACH ROW EXECUTE FUNCTION public.yft_check_road_change();

CREATE FUNCTION public.yft_check_scenario_snapshot() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.reference_layer_id IS DISTINCT FROM OLD.reference_layer_id
 OR NEW.reference_version IS DISTINCT FROM OLD.reference_version) THEN
  RAISE EXCEPTION 'A saved scenario snapshot is immutable' USING ERRCODE='23514';
 END IF;
 IF NEW.reference_layer_id IS NOT NULL AND (NEW.reference_version IS NULL OR NEW.reference_version IS DISTINCT FROM (SELECT metadata->>'version' FROM public.geo_layers WHERE id=NEW.reference_layer_id)) THEN
  RAISE EXCEPTION 'Scenario version does not match reference snapshot' USING ERRCODE='23514';
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER yft_check_scenario_snapshot BEFORE INSERT OR UPDATE ON public.scenarios
 FOR EACH ROW EXECUTE FUNCTION public.yft_check_scenario_snapshot();
CREATE FUNCTION public.yft_touch_scenario() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
 UPDATE public.scenarios SET updated_at=now() WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.scenario_id ELSE NEW.scenario_id END;
 RETURN NULL;
END $$;
CREATE TRIGGER yft_touch_scenario AFTER INSERT OR UPDATE OR DELETE ON public.scenario_changes
 FOR EACH ROW EXECUTE FUNCTION public.yft_touch_scenario();

CREATE FUNCTION public.yft_road_features(p_layer_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions AS $$
 SELECT jsonb_build_object('type','FeatureCollection','features',coalesce(jsonb_agg(
  jsonb_build_object('type','Feature','id',o.id,'geometry',ST_AsGeoJSON(o.geom)::jsonb,
  'properties',o.properties || jsonb_build_object('id',o.id,'name',o.name,'source_key',o.source_key,
   'layer_id',o.layer_id,'length_m',s.length_m,'from_node',s.from_node_id,'to_node',s.to_node_id))), '[]'::jsonb))
 FROM (SELECT * FROM public.reference_objects WHERE layer_id=p_layer_id ORDER BY id LIMIT 5000) o
 JOIN public.road_segments s ON s.id=o.id;
$$;

-- Directed graph for future routing. No travel time is fabricated for unknown speeds.
CREATE FUNCTION public.yft_road_graph(p_scenario_id uuid) RETURNS TABLE(
 segment_id uuid, from_node_id uuid,to_node_id uuid,length_m double precision,
 forward_allowed boolean,reverse_allowed boolean,profile jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public, extensions AS $$
DECLARE target_layer uuid;
BEGIN
 SELECT reference_layer_id INTO target_layer FROM public.scenarios WHERE id=p_scenario_id;
 IF target_layer IS NULL THEN RAISE EXCEPTION 'Scenario unavailable' USING ERRCODE='42501'; END IF;
 RETURN QUERY
 SELECT s.id,s.from_node_id,s.to_node_id,s.length_m,
 (coalesce(c.properties->'road_profile',o.properties->'road_profile')->>'direction') IN ('both','forward'),
 (coalesce(c.properties->'road_profile',o.properties->'road_profile')->>'direction') IN ('both','reverse'),
 coalesce(c.properties->'road_profile',o.properties->'road_profile')
 FROM public.road_segments s JOIN public.reference_objects o ON o.id=s.id
 LEFT JOIN public.scenario_changes c ON c.reference_object_id=o.id AND c.scenario_id=p_scenario_id
 WHERE o.layer_id=target_layer;
END $$;
REVOKE ALL ON FUNCTION public.yft_valid_road_profile(jsonb),public.yft_check_road_change(),
 public.yft_check_scenario_snapshot(),public.yft_touch_scenario(),public.yft_road_features(uuid),public.yft_road_graph(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.yft_road_features(uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.yft_valid_road_profile(jsonb),public.yft_road_graph(uuid) TO authenticated;
COMMIT;
