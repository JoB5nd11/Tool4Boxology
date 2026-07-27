from urllib.error import URLError

from fastapi import FastAPI, HTTPException
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from SPARQLWrapper import SPARQLWrapper, JSON
import sys, os, socket, importlib, traceback

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
for p in (str(SRC), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

def _detect_host(service_name: str = "boxology_kg") -> str:
    env_host = os.getenv("SPARQL_HOST")
    if env_host:
        return env_host
    try:
        socket.gethostbyname(service_name)
        return service_name
    except OSError:
        return "localhost"

_kg_host = _detect_host()
SPARQL_ENDPOINT = f"http://{_kg_host}:8890/sparql"
SPARQL_UPDATE_ENDPOINT = f"http://{_kg_host}:8890/sparql-auth"
print(f"[BOOT] Virtuoso host={_kg_host}")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

def _fresh_kg_module():
    # Drop any cached kg_creation modules
    for name in list(sys.modules.keys()):
        if name.startswith("kg_creation"):
            del sys.modules[name]
    import kg_creation.kg_creation as kg_module
    importlib.reload(kg_module)  # ensure fresh code + globals
    return kg_module

@app.post("/api/kg")
async def api_create_kg(source: dict):
    try:
        ids = [b.get("id") for b in source.get("boxologies", [])]
        print(f"[API] incoming boxologies={ids}")
        kg_module = _fresh_kg_module()
        result = kg_module.create_kg(source)  # create_kg returns dict (after you implement)
        if not isinstance(result, dict):
            result = {"mode": "unknown"}
        return {
            "status": "ok",
            "mode": result.get("mode"),
            "triples_len": result.get("triples_len"),
            "rdf": result.get("rdf"),
            "rdf_format": result.get("rdf_format"),
        }
    except (URLError, TimeoutError) as e:
        traceback.print_exc()
        raise HTTPException(status_code=503, detail=f"Virtuoso connection error: {str(e)}")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/beam-export")
async def api_beam_export(source: dict):
    """Return a Turtle file containing the BEAM view of the diagram (no Virtuoso needed)."""
    try:
        for name in list(sys.modules.keys()):
            if name.startswith("kg_creation"):
                del sys.modules[name]
        from kg_creation.in_memory_rdfizer.generator import kg_generation
        from kg_creation.beam_enrichment import enrich_with_beam
        from kg_creation.beam_annotation_triples import (
            generate_annotation_triples,
            generate_component_triples,
        )

        # The RML step only covers components inside design patterns;
        # generate_component_triples fills in every remaining node/link so the
        # enrichment can type ALL elements in the BEAM vocabulary.
        t4b_triples = kg_generation(source)
        component_triples = generate_component_triples(source)
        if t4b_triples and not t4b_triples.endswith("\n"):
            t4b_triples += "\n"
        combined = t4b_triples + component_triples
        enriched = enrich_with_beam(combined)
        annotation_triples = generate_annotation_triples(source)

        # BEAM-only export: keep the beam:/beamr: facts derived by the
        # enrichment plus rdfs:label lines (so the graph stays readable), and
        # DROP the raw T4B typing/property triples — emitting both vocabularies
        # made every element appear twice (once t4b:, once beam:).
        beam_lines = []
        for line in enriched.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            if "w3id.org/beam/" in stripped or "rdf-schema#label" in stripped:
                beam_lines.append(stripped)

        if annotation_triples:
            for line in annotation_triples.splitlines():
                stripped = line.strip()
                if stripped:
                    beam_lines.append(stripped)

        # The generators use slightly different spacing before the final '.'
        # — dedupe on a normalised key.
        seen = set()
        all_lines = []
        for line in beam_lines:
            stripped = line.strip()
            if not stripped:
                continue
            key = " ".join(stripped.rstrip(".").split())
            if key in seen:
                continue
            seen.add(key)
            all_lines.append(stripped)

        prefixes = (
            "@prefix rdf:   <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n"
            "@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .\n"
            "@prefix owl:   <http://www.w3.org/2002/07/owl#> .\n"
            "@prefix xsd:   <http://www.w3.org/2001/XMLSchema#> .\n"
            "@prefix t4b:   <http://tool4boxology.org/> .\n"
            "@prefix beam:  <http://w3id.org/beam/core#> .\n"
            "@prefix beamr: <http://w3id.org/beam/risk#> .\n"
            "\n"
        )
        body = "\n".join(l for l in all_lines if l.strip()) + "\n"

        return PlainTextResponse(
            content=prefixes + body,
            media_type="text/turtle",
            headers={"Content-Disposition": "attachment; filename=beam_export.ttl"},
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/t4b/sparql")
async def api_t4b_sparql(payload: dict):
    query = (payload.get("query") or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="Missing SPARQL query")
    try:
        sparql = SPARQLWrapper(SPARQL_ENDPOINT)
        sparql.setReturnFormat(JSON)
        sparql.setQuery(query)
        return sparql.query().convert()
    except (URLError, TimeoutError) as e:
        traceback.print_exc()
        raise HTTPException(status_code=503, detail=f"Virtuoso connection error: {str(e)}")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/")
async def root():
    return {"status": "running", "sparql_query": SPARQL_ENDPOINT, "sparql_update": SPARQL_UPDATE_ENDPOINT}

@app.get("/api/health")
async def api_health():
    return {
        "status": "ok",
        "service": "boxology-backend",
        "sparql_query": SPARQL_ENDPOINT,
        "sparql_update": SPARQL_UPDATE_ENDPOINT,

    }