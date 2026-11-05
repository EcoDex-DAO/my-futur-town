#!/usr/bin/env python3
"""Opt-in real Supabase/browser test with one temporary identity and exact cleanup.

Uses the existing project, never changes Auth settings, never records private
keys, passwords or session traces. The temporary scenario contains hypotheses
on a real road; the geographic reference is checked unchanged before/after.
"""
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys
import tempfile
import urllib.request
import urllib.error
from uuid import UUID, uuid4

REF='bcvzhegvjzujlgfnbwfg'
BASE='https://'+REF+'.supabase.co'
ROOT=Path(__file__).resolve().parents[1]

def request(url,method='GET',body=None,headers=None):
    data=None if body is None else json.dumps(body).encode()
    req=urllib.request.Request(url,data=data,method=method,headers=headers or {})
    try:
        with urllib.request.urlopen(req,timeout=60) as response:
            raw=response.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raise RuntimeError(f'{method} {url.split("?")[0]} failed with HTTP {error.code}') from None

def main():
    token=os.environ.get('SUPABASE_ACCESS_TOKEN')
    if not token:raise SystemExit('SUPABASE_ACCESS_TOKEN must be injected securely, not supplied as an argument.')
    manager_headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'}
    def query(sql,readonly=True):return request('https://api.supabase.com/v1/projects/'+REF+'/database/query','POST',{'query':sql,'read_only':readonly},manager_headers)
    # Key values stay only in this process. Only the publishable key goes to Vite.
    keys=request('https://api.supabase.com/v1/projects/'+REF+'/api-keys?reveal=true',headers=manager_headers)
    public=next(k['api_key'] for k in keys if k.get('type')=='publishable')
    server=next(k['api_key'] for k in keys if k.get('name')=='service_role')
    admin_headers={'apikey':server,'Authorization':'Bearer '+server,'Content-Type':'application/json'}
    public_headers={'apikey':public,'Content-Type':'application/json'}
    layers=request(BASE+'/rest/v1/geo_layers?select=id,metadata&slug=like.annecy-roads-*&order=slug.desc&limit=1',headers=public_headers)
    if not layers:raise SystemExit('A real road snapshot must be imported before this test.')
    layer=str(UUID(layers[0]['id']))
    roads=request(BASE+'/rest/v1/rpc/yft_road_features','POST',{'p_layer_id':layer},public_headers)
    road=next((f for f in roads['features'] if f['properties']['road_profile'].get('direction')=='both'),None)
    if not road:raise SystemExit('No real explicitly bidirectional road available for the required test.')
    hash_sql=f"SELECT md5(string_agg(id::text||properties::text||extensions.ST_AsEWKB(geom)::text,'' ORDER BY id)) AS fingerprint FROM public.reference_objects WHERE layer_id='{layer}';"
    before=query(hash_sql)[0]['fingerprint']
    marker=uuid4().hex
    email='yft-e2e-'+marker+'@example.invalid'
    password=secrets.token_urlsafe(32)
    user_id=None
    code=1
    try:
        user=request(BASE+'/auth/v1/admin/users','POST',{'email':email,'password':password,'email_confirm':True,'user_metadata':{'yft_temporary_test':marker}},admin_headers)
        user_id=str(UUID(user['id']))
        with tempfile.TemporaryDirectory(prefix='yft-connected-') as folder:
            env=dict(os.environ)
            env.update({'VITE_SUPABASE_URL':BASE,'VITE_SUPABASE_PUBLISHABLE_KEY':public,'YFT_TEST_EMAIL':email,'YFT_TEST_PASSWORD':password,'YFT_TEST_ROAD_ID':road['properties']['id'],'YFT_TEST_OUTPUT_DIR':folder})
            completed=subprocess.run(['npm','exec','--','playwright','test','--config','playwright.connected.config.ts'],cwd=ROOT/'frontend',env=env,capture_output=True,text=True,timeout=240)
            output=completed.stdout+completed.stderr
            for value in [token,server,password]:output=output.replace(value,'[redacted]')
            output=re.sub(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+','[JWT redacted]',output)
            print(output)
            code=completed.returncode
    finally:
        if user_id:
            # Exact freshly created identity only; no other scenario is touched.
            query(f"DELETE FROM public.scenarios WHERE owner_id='{user_id}'::uuid;",False)
            check=request(BASE+'/auth/v1/admin/users/'+user_id,headers=admin_headers)
            if check.get('user_metadata',{}).get('yft_temporary_test')!=marker:
                raise RuntimeError('Temporary identity marker mismatch; refusing user deletion')
            request(BASE+'/auth/v1/admin/users/'+user_id,'DELETE',headers=admin_headers)
            print('Temporary identity and its scenarios removed.')
        after=query(hash_sql)[0]['fingerprint']
        if before!=after:raise RuntimeError('Reference fingerprint changed during test')
        print('Real reference fingerprint unchanged.')
    return code

if __name__=='__main__':
    try:raise SystemExit(main())
    except (RuntimeError,StopIteration,subprocess.TimeoutExpired) as error:
        raise SystemExit(str(error) or 'Required key or API response unavailable')
