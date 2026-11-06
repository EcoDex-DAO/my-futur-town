"""Reproducible OSM road snapshots; no fabricated geometries or silent defaults.

Fetch and SQL generation are separate from application. SQL output is reviewed
and applied with an authorized server identity, never by a frontend client.
"""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
import urllib.parse
import urllib.request
from uuid import UUID, uuid5

NAMESPACE = UUID('bf2b876d-e268-4d99-9e2c-a8e3336bcd64')
BBOX = (45.897, 6.124, 45.903, 6.132)  # S,W,N,E: small central Annecy pilot, not a boundary
HIGHWAYS = {'residential','unclassified','tertiary','secondary','primary','living_street','service'}

def uid(value):
    return str(uuid5(NAMESPACE, value))

def number(value):
    try:
        result = float(value)
        return result if math.isfinite(result) and result >= 0 else None
    except (ValueError, TypeError):
        return None

def sql_text(value):
    return "'" + str(value).replace("'", "''") + "'"

def json_sql(value):
    return sql_text(json.dumps(value, ensure_ascii=False, allow_nan=False)) + '::jsonb'

def road_profile(tags):
    one = tags.get('oneway', '').lower()
    direction = 'forward' if one in {'yes','1','true'} else 'reverse' if one == '-1' else 'both' if one in {'no','0','false'} else 'forward' if tags.get('junction') == 'roundabout' else None
    lanes = number(tags.get('lanes'))
    if lanes is not None and not lanes.is_integer():
        lanes = None
    # Missing/ambiguous values stay null. The editor labels proposed values as assumptions.
    return {'direction': direction, 'lanes': lanes, 'width_m': number(tags.get('width')),
            'lane_width_m': None, 'cycle_width_m': None, 'sidewalk_width_m': None,
            'speed_kph': number(tags.get('maxspeed'))}

def generate_sql(data):
    if data.get('remark'):
        raise ValueError('Overpass returned a warning/error; reject possibly incomplete response')
    timestamp = data.get('osm3s', {}).get('timestamp_osm_base')
    if not timestamp or not isinstance(data.get('elements'), list):
        raise ValueError('Missing OSM snapshot timestamp or elements')
    ways = sorted([w for w in data['elements'] if w.get('type') == 'way' and w.get('tags', {}).get('highway') in HIGHWAYS], key=lambda w:w['id'])
    if not ways:
        raise ValueError('No supported real roads returned; refusing an empty import')
    digest = hashlib.sha256(json.dumps(ways,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    version = timestamp.replace(':','').replace('-','') + '-' + digest[:8]
    source_id = uid('source:osm-roads')
    layer_id = uid('snapshot:annecy-roads:' + version)
    nodes, segments = {}, {}
    for way in ways:
        ids, geometry = way.get('nodes', []), way.get('geometry', [])
        if len(ids) != len(geometry) or len(ids) < 2:
            raise ValueError(f"Incomplete geometry for OSM way {way['id']}")
        if not any(point and BBOX[1]<=point.get('lon',999)<=BBOX[3] and BBOX[0]<=point.get('lat',999)<=BBOX[2] for point in geometry):
            raise ValueError('Way has no node in the declared Annecy pilot; refuse a mismatched input')
        for node_id, point in zip(ids,geometry):
            if not point or not all(k in point for k in ['lon','lat']):
                raise ValueError('Missing node coordinates')
            coord = [point['lon'],point['lat']]
            if not all(isinstance(c,(int,float)) and math.isfinite(c) for c in coord) or not (-180<=coord[0]<=180 and -90<=coord[1]<=90):
                raise ValueError('Invalid WGS84 coordinates')
            if node_id in nodes and nodes[node_id] != coord:
                raise ValueError('Conflicting coordinates for a shared OSM node')
            nodes[node_id] = coord
        for index in range(len(ids)-1):
            a,b = ids[index:index+2]
            if a == b or nodes[a] == nodes[b]:
                continue
            key = f"osm:way:{way['id']}:segment:{a}:{b}"
            segments[key] = {'a':a,'b':b,'tags':way['tags'],'way_id':way['id']}
    if not segments or len(segments)>5000:
        raise ValueError('Import must contain 1..5000 segments; reduce the pilot perimeter')
    used_nodes = {s[x] for s in segments.values() for x in ['a','b']}
    statements = ['BEGIN;', 'SET LOCAL search_path = public, extensions;',
                  "SET LOCAL lock_timeout='5s';", "SET LOCAL statement_timeout='60s';"]
    statements += [f"INSERT INTO public.data_sources(id,name,url,license,attribution,retrieved_at,metadata) VALUES ({sql_text(source_id)},'OpenStreetMap — voirie','https://www.openstreetmap.org/copyright','ODbL-1.0','© OpenStreetMap contributors',NULL,{json_sql({'provider':'OpenStreetMap / Overpass','object_type':'road'})}) ON CONFLICT(id) DO NOTHING;"]
    metadata = {'city':'Annecy','version':version,'osm_timestamp':timestamp,'bbox':BBOX,'sha256':digest,'segments':len(segments),'crs':'EPSG:4326','length_crs':'EPSG:2154','immutable':True}
    statements += [f"INSERT INTO public.geo_layers(id,source_id,slug,name,metadata) VALUES ({sql_text(layer_id)},{sql_text(source_id)},{sql_text('annecy-roads-'+version)},'Voirie pilote — centre d’Annecy',{json_sql(metadata)}) ON CONFLICT(id) DO NOTHING;"]
    for node in sorted(used_nodes):
        point = nodes[node]
        statements += [f"INSERT INTO public.road_nodes(id,layer_id,source_key,geom) VALUES ({sql_text(uid(layer_id+':node:'+str(node)))},{sql_text(layer_id)},{sql_text('osm:node:'+str(node))},ST_SetSRID(ST_MakePoint({point[0]},{point[1]}),4326)) ON CONFLICT(id) DO NOTHING;"]
    for key,segment in sorted(segments.items()):
        a,b = segment['a'],segment['b']
        geometry = {'type':'LineString','coordinates':[nodes[a],nodes[b]]}
        geom_sql = f'ST_SetSRID(ST_GeomFromGeoJSON({sql_text(json.dumps(geometry))}),4326)'
        props = {'category':'road','osm_way_id':str(segment['way_id']),'osm_tags':segment['tags'],'road_profile':road_profile(segment['tags']),'snapshot_version':version,'provenance':'OpenStreetMap','data_quality':'observed source tags; missing values are unknown'}
        object_id = uid(layer_id+':'+key)
        name = segment['tags'].get('name')
        statements += [f"INSERT INTO public.reference_objects(id,layer_id,source_key,kind,name,geom,properties) VALUES ({sql_text(object_id)},{sql_text(layer_id)},{sql_text(key)},'infrastructure',{'NULL' if name is None else sql_text(name)},{geom_sql},{json_sql(props)}) ON CONFLICT(id) DO NOTHING;"]
        statements += [f"INSERT INTO public.road_segments(id,from_node_id,to_node_id,length_m) VALUES ({sql_text(object_id)},{sql_text(uid(layer_id+':node:'+str(a)))},{sql_text(uid(layer_id+':node:'+str(b)))},ST_Length(ST_Transform({geom_sql},2154))) ON CONFLICT(id) DO NOTHING;"]
    statements += ['COMMIT;']
    return '\n'.join(statements)+'\n',metadata

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fetch',type=Path,help='Download one bounded Overpass response to this file')
    parser.add_argument('--input',type=Path,help='Previously downloaded OSM JSON')
    parser.add_argument('--output',type=Path,help='SQL output; never automatically executed')
    args=parser.parse_args()
    if args.fetch:
        bbox=','.join(map(str,BBOX))
        query=f'[out:json][timeout:45];way["highway"~"^(residential|unclassified|tertiary|secondary|primary|living_street|service)$"]({bbox});out body geom;'
        request=urllib.request.Request('https://overpass-api.de/api/interpreter',data=urllib.parse.urlencode({'data':query}).encode(),headers={'User-Agent':'YourFuturTown/0.2 (open-source Annecy pilot; EcoDex-DAO/my-futur-town)'})
        with urllib.request.urlopen(request,timeout=70) as response:data=json.load(response)
        generate_sql(data) # Reject incomplete responses before retaining them.
        args.fetch.write_text(json.dumps(data,ensure_ascii=False))
    if args.input:
        if not args.output:parser.error('--input requires --output')
        if args.input.suffix=='.gz':
            with gzip.open(args.input,'rt') as source:data=json.load(source)
        else:data=json.loads(args.input.read_text())
        sql,metadata=generate_sql(data)
        args.output.write_text(sql)
        print(json.dumps(metadata,ensure_ascii=False))
    elif not args.fetch:parser.error('Use --fetch or --input with --output')

if __name__=='__main__':main()
