from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import sys
import traceback

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

@app.post("/api/kg")
async def api_create_kg(source: dict):
    try:
        # Expected shape matches output of generateMultiPageRMLExport()
        create_kg(source)
        return {"status": "ok"}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))