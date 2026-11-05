import unittest
from fastapi.testclient import TestClient
from app.main import app

class ApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_does_not_claim_database_connection(self):
        self.assertEqual(self.client.get('/health').json(), {'status':'ok', 'database':'not_connected'})

    def test_reference_catalog(self):
        response = self.client.get('/api/layers')
        self.assertEqual(response.status_code, 200)
        layers = response.json()['layers']
        self.assertEqual({x['id'] for x in layers}, {'buildings', 'roads', 'water'})
        self.assertTrue(all(x['kind'] == 'reference' for x in layers))

    def test_cors(self):
        self.assertEqual(self.client.get('/health', headers={'Origin':'http://localhost:5173'}).headers['access-control-allow-origin'], 'http://localhost:5173')
        self.assertNotIn('access-control-allow-origin', self.client.get('/health', headers={'Origin':'https://untrusted.example'}).headers)
