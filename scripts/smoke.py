"""Functional checks for running local Compose services; no external dependencies."""
import json
from urllib.request import urlopen

with urlopen('http://127.0.0.1:8000/health', timeout=10) as r:
    assert json.load(r)['status'] == 'ok'
with urlopen('http://127.0.0.1:8000/api/layers', timeout=10) as r:
    assert {layer['id'] for layer in json.load(r)['layers']} == {'buildings', 'roads', 'water'}
with urlopen('http://127.0.0.1:5173', timeout=10) as r:
    assert 'My Futur Town' in r.read().decode()
print('OK: API health, reference catalog, frontend HTML')
