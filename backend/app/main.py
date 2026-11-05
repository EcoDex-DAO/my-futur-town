"""Read-only bootstrap API. Reference data stays separate from future scenarios."""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="My Futur Town", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[s.strip() for s in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if s.strip()],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["Accept", "Content-Type"],
)

@app.get("/health")
def health():
    return {"status": "ok", "database": "not_connected"}

@app.get("/api/layers")
def layers():
    return {"layers": [
        {"id": "buildings", "name": "Bâtiments", "kind": "reference", "source": "OpenFreeMap / OpenStreetMap"},
        {"id": "roads", "name": "Réseau viaire", "kind": "reference", "source": "OpenFreeMap / OpenStreetMap"},
        {"id": "water", "name": "Lac et cours d’eau", "kind": "reference", "source": "OpenFreeMap / OpenStreetMap"},
    ], "note": "Catalogue uniquement ; les tuiles sont chargées directement par le navigateur."}
