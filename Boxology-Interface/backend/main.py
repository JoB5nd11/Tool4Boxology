from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import sys
import traceback
import os
import socket

# Add the project root and src to Python path
ROOT = Path(__file__).resolve().parents[1]  # Go up from backend/ to project root
SRC = ROOT / "src"

# Add both to sys.path
for path in [str(ROOT), str(SRC)]:
    if path not in sys.path:
        sys.path.insert(0, path)

print(f"Python path: {sys.path}")  # Debug: see what paths are available
print(f"ROOT: {ROOT}")
print(f"SRC: {SRC}")
print(f"SRC exists: {SRC.exists()}")

try:
    from kg_creation.kg_creation import create_kg
    print("✓ Successfully imported create_kg")
except ImportError as e:
    print(f"✗ Failed to import create_kg: {e}")
    # Create a dummy function so the app can start
    def create_kg(data):
        raise ImportError(f"kg_creation module not found. Error: {e}")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def _detect_host(service_name: str = "boxology_kg") -> str:
    # 1. Explicit override via env var SPARQL_HOST
    env_host = os.getenv("SPARQL_HOST")
    if env_host:
        return env_host
    # 2. Docker detection (file /.dockerenv) – prefer service name if resolvable
    try:
        socket.gethostbyname(service_name)
        return service_name
    except OSError:
        pass
    # 3. Fallback
    return "localhost"

_kg_host = _detect_host()

SPARQL_ENDPOINT = f"http://{_kg_host}:8890/sparql"
SPARQL_UPDATE_ENDPOINT = f"http://{_kg_host}:8890/sparql-auth"
print(f"Resolved Virtuoso host='{_kg_host}' query='{SPARQL_ENDPOINT}' update='{SPARQL_UPDATE_ENDPOINT}'")

@app.post("/api/kg")
async def api_create_kg(source: dict):
    try:
        print(f"📥 Received KG creation request")
        print(f"📊 Data keys: {list(source.keys())}")
        print(f"📊 Boxologies count: {len(source.get('boxologies', []))}")
        
        # Call create_kg
        create_kg(source)
        
        print(f"✅ KG created successfully")
        return {"status": "ok", "message": "KG created successfully"}
    except Exception as e:
        print(f"❌ Error creating KG: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"KG creation failed: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Backend is running", "virtuoso": SPARQL_UPDATE_ENDPOINT}