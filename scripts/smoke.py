"""Functional checks for the running local Compose application; no external dependencies."""
import json
from urllib.request import urlopen

with urlopen('http://127.0.0.1:5173/health', timeout=10) as response:
    assert json.load(response)['status'] == 'ok'
with urlopen('http://127.0.0.1:5173/api/layers', timeout=10) as response:
    assert {layer['id'] for layer in json.load(response)['layers']} == {'buildings', 'roads', 'water'}
with urlopen('http://127.0.0.1:5173', timeout=10) as response:
    assert 'Your Futur Town' in response.read().decode()
print('OK: API health, reference catalog, application HTML')
