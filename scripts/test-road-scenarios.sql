-- Synthetic contract fixtures only. Executed solely in the disposable test DB.
BEGIN;
INSERT INTO public.data_sources(id,name,url,license,attribution) VALUES ('33333333-3333-3333-3333-333333333333','Technical fixture','https://example.invalid','test','test');
INSERT INTO public.geo_layers(id,source_id,slug,name,metadata) VALUES ('44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333','technical-road-test','Technical fixture','{"version":"technical-v1"}');
INSERT INTO public.road_nodes(id,layer_id,source_key,geom) VALUES
 ('55555555-5555-5555-5555-555555555555','44444444-4444-4444-4444-444444444444','node:a',ST_SetSRID(ST_Point(1,1),4326)),
 ('66666666-6666-6666-6666-666666666666','44444444-4444-4444-4444-444444444444','node:b',ST_SetSRID(ST_Point(1.01,1),4326));
INSERT INTO public.reference_objects(id,layer_id,source_key,kind,geom,properties) VALUES ('77777777-7777-7777-7777-777777777777','44444444-4444-4444-4444-444444444444','technical:segment:a:b','infrastructure',ST_SetSRID(ST_MakeLine(ST_Point(1,1),ST_Point(1.01,1)),4326),'{"road_profile":{"direction":"both","lanes":2,"width_m":9,"lane_width_m":3,"cycle_width_m":0,"sidewalk_width_m":0,"speed_kph":null}}');
INSERT INTO public.road_segments VALUES ('77777777-7777-7777-7777-777777777777','55555555-5555-5555-5555-555555555555','66666666-6666-6666-6666-666666666666',100);
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF jsonb_array_length(public.yft_road_features('44444444-4444-4444-4444-444444444444')->'features')<>1 THEN RAISE EXCEPTION 'Missing public road'; END IF;
 IF has_table_privilege('anon','public.road_nodes','INSERT') OR has_table_privilege('authenticated','public.road_segments','TRUNCATE') THEN RAISE EXCEPTION 'Unexpected road write rights'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
INSERT INTO public.scenarios(id,name,reference_layer_id,reference_version) VALUES ('88888888-8888-8888-8888-888888888888','Technical road test','44444444-4444-4444-4444-444444444444','technical-v1');
DO $$ BEGIN
 IF NOT (SELECT forward_allowed AND reverse_allowed FROM public.yft_road_graph('88888888-8888-8888-8888-888888888888')) THEN RAISE EXCEPTION 'Base graph not bidirectional'; END IF;
 IF public.yft_valid_road_profile('{"direction":null,"lanes":1,"width_m":9,"lane_width_m":3,"cycle_width_m":2,"sidewalk_width_m":0}') THEN RAISE EXCEPTION 'Null direction accepted'; END IF;
 BEGIN
  INSERT INTO public.scenario_changes(scenario_id,reference_object_id,operation,properties) VALUES ('88888888-8888-8888-8888-888888888888','77777777-7777-7777-7777-777777777777','update','{"road_profile":{"direction":"forward","lanes":1,"width_m":4,"lane_width_m":3,"cycle_width_m":2,"sidewalk_width_m":0}}');
  RAISE EXCEPTION 'Overallocated profile accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $$;
INSERT INTO public.scenario_changes(scenario_id,reference_object_id,operation,properties) VALUES ('88888888-8888-8888-8888-888888888888','77777777-7777-7777-7777-777777777777','update','{"road_profile":{"direction":"forward","lanes":1,"width_m":9,"lane_width_m":3,"cycle_width_m":2,"sidewalk_width_m":0,"speed_kph":null}}');
DO $$ BEGIN
 IF NOT (SELECT forward_allowed AND NOT reverse_allowed AND (profile->>'cycle_width_m')::numeric=2 FROM public.yft_road_graph('88888888-8888-8888-8888-888888888888')) THEN RAISE EXCEPTION 'Graph does not follow saved profile'; END IF;
 BEGIN
  UPDATE public.scenarios SET reference_version='another' WHERE id='88888888-8888-8888-8888-888888888888';
  RAISE EXCEPTION 'Snapshot version mutated';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $$;
SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
DO $$ BEGIN
 BEGIN
  PERFORM * FROM public.yft_road_graph('88888888-8888-8888-8888-888888888888');
  RAISE EXCEPTION 'Graph of another user leaked';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
COMMIT;
