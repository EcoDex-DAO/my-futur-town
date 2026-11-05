-- New database connection: saved profile must survive and reference stay intact.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
DO $$ BEGIN
 IF NOT (SELECT forward_allowed AND NOT reverse_allowed FROM public.yft_road_graph('88888888-8888-8888-8888-888888888888')) THEN RAISE EXCEPTION 'Scenario did not persist across connections'; END IF;
 IF (SELECT properties->'road_profile'->>'direction' FROM public.reference_objects WHERE id='77777777-7777-7777-7777-777777777777')<>'both' THEN RAISE EXCEPTION 'Reference mutated'; END IF;
END $$;
DELETE FROM public.scenario_changes WHERE scenario_id='88888888-8888-8888-8888-888888888888';
DO $$ BEGIN
 IF NOT (SELECT forward_allowed AND reverse_allowed FROM public.yft_road_graph('88888888-8888-8888-8888-888888888888')) THEN RAISE EXCEPTION 'Reference graph not restored'; END IF;
END $$;
ROLLBACK;
SELECT 'Road scenario persistence, graph and restoration passed' AS result;
