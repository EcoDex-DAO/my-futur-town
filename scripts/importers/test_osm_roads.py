"""Synthetic technical fixtures only; never imported as Annecy data."""
import unittest
from osm_roads import generate_sql,road_profile

class ImportTests(unittest.TestCase):
 def fixture(self):
  return {'osm3s':{'timestamp_osm_base':'2026-11-05T00:00:00Z'},'elements':[{'type':'way','id':1,'nodes':[1,2,3],'geometry':[{'lon':6.127,'lat':45.9},{'lon':6.128,'lat':45.9},{'lon':6.129,'lat':45.9}],'tags':{'highway':'residential','name':"Test's road"}}]}
 def test_missing_properties_are_not_invented(self):
  self.assertTrue(all(v is None for v in road_profile({}).values()))
  self.assertEqual(road_profile({'oneway':'-1'})['direction'],'reverse')
  self.assertIsNone(road_profile({'lanes':'2;3'})['lanes'])
 def test_snapshot_is_reproducible_and_escapes_labels(self):
  sql,meta=generate_sql(self.fixture())
  self.assertEqual(generate_sql(self.fixture()),(sql,meta))
  self.assertEqual(meta['segments'],2)
  self.assertIn("Test''s road",sql)
  self.assertIn('ST_Transform',sql)
  self.assertNotIn('DELETE',sql)
 def test_rejects_partial_data(self):
  data=self.fixture();data['remark']='timeout'
  with self.assertRaises(ValueError):generate_sql(data)
  data=self.fixture();data['elements'][0]['geometry'].pop()
  with self.assertRaises(ValueError):generate_sql(data)
 def test_conflicting_shared_nodes_are_rejected(self):
  data=self.fixture();other=dict(data['elements'][0]);other['id']=2;other['geometry']=[{'lon':2,'lat':1},{'lon':2.01,'lat':1},{'lon':2.02,'lat':1}];data['elements'].append(other)
  with self.assertRaises(ValueError):generate_sql(data)
