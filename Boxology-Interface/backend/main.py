from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import sys
import traceback
import os

# Make "src" importable so we can import kg_creation.*
ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from kg_creation.kg_creation import create_kg  # uses SPARQLWrapper to write to Virtuoso

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use container network endpoint when running in Docker
VIRTUOSO_ENDPOINT = os.getenv("VIRTUOSO_ENDPOINT", "http://boxology_kg:8890/sparql")

@app.post("/api/kg")
async def api_create_kg(source: dict):
    create_kg(source)
    """try:
        # Pass endpoint to create_kg if it accepts it, otherwise set it globally
        return {"status": "ok"}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))"""