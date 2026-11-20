"""Functional checks for the running local Compose application; no external dependencies."""
import json
import os
from urllib.request import urlopen

base_url = f"http://127.0.0.1:{os.environ.get('MFT_HOST_PORT', '3000')}"

with urlopen(f'{base_url}/health', timeout=10) as response:
    assert json.load(response)['status'] == 'ok'
with urlopen(f'{base_url}/api/layers', timeout=10) as response:
    assert {layer['id'] for layer in json.load(response)['layers']} == {'buildings', 'roads', 'water'}
with urlopen(f'{base_url}', timeout=10) as response:
    assert 'Your Futur Town' in response.read().decode()
print('OK: API health, reference catalog, application HTML')
