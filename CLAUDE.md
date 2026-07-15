# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Tool4Boxology** is a semantic web toolkit for designing, validating, and analyzing hybrid AI systems using the Boxology methodology. It provides a React/TypeScript web editor for creating Boxology diagrams, with automatic knowledge graph (RDF) generation and SPARQL integration via Virtuoso.

Live instance: https://tool4boxology.service.tib.eu/

## Repository Layout

All active development is in `Boxology-Interface/`. Other top-level dirs are supplementary:
- `Boxology-Plugin/` — standalone Draw.io plugin (separate from the main app)
- `Boxology-Docker/` — custom Draw.io Docker image
- `kg_creation/`, `Ontology/`, `ElementaryPattern/` — RDF assets and ontologies
- `NeSy-Example/` — example diagrams

## Development Commands

All commands run from `Boxology-Interface/`:

```bash
# Full stack (recommended): frontend + backend + Virtuoso
docker-compose up -d

# Frontend only (dev server on :5173)
npm install
npm run dev

# Backend only (port 8000)
cd Boxology-Interface
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# Build for production
npm run build

# Lint
npm run lint

# Format
npm run format
```

Tests are Playwright e2e specs in `Boxology-Interface/tests/e2e/`, run with
`npx playwright test` (`playwright.config.ts` auto-starts Vite on port 3000).
Note `npm test` is an `exit 0` stub and runs nothing — do not use it.

## Services & Ports

| Service | URL | Notes |
|---------|-----|-------|
| Frontend (dev) | http://localhost:5173 | Vite dev server |
| Backend | http://localhost:8001 | FastAPI via docker-compose; port 8000 if run directly |
| Virtuoso SPARQL | http://localhost:8890/sparql | Query endpoint |
| Virtuoso Conductor | http://localhost:8890/conductor | Admin UI (dba/dba) |

Frontend proxies `/api/*` to the backend via Vite config (`vite.config.ts`).

## Architecture

### Frontend (`src/`)
- **`App.tsx`** — large root component; owns diagram state, page management, export logic
- **`GoDiagram.tsx`** — GoJS canvas wrapper; initializes the diagram, handles node/link templates
- **`BoxologyValidation.js`** — client-side Boxology design pattern validation rules
- **`utils/exportHelpers.ts`** — KG generation, stable UUID assignment, RML export
- **`utils/validation.ts`** — validation rule implementations
- **`utils/dot.ts` / `dotImport.ts`** — GoJS model ↔ DOT (Graphviz) conversion
- **`config.ts`** — reads `VITE_BACKEND_URL` env var (falls back to `http://localhost:8000`)
- **`data/patterns.ts`** — elementary Boxology pattern definitions

### Backend (`backend/`)
- **`main.py`** — FastAPI app with two endpoints:
  - `GET /` — health check + SPARQL endpoint URLs
  - `POST /api/kg` — receives diagram JSON, runs KG creation, upserts triples into Virtuoso
- KG creation imports `kg_creation.kg_creation.create_kg()` fresh on each request (avoids Python module caching issues)

### KG Pipeline
Diagram JSON → `kg_creation/kg_creation.py` (RML + in-memory RDFizer) → RDF triples → Virtuoso via SPARQLWrapper

## Key Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_BACKEND_URL` | `http://localhost:8000` | Frontend → backend API base URL |
| `SPARQL_HOST` | `boxology_kg` (Docker) / `localhost` | Virtuoso hostname |
| `SPARQL_QUERY_ENDPOINT` | derived from host | Full SPARQL query URL override |
| `SPARQL_UPDATE_ENDPOINT` | derived from host | Full SPARQL update URL override |

## Tech Stack

- **Frontend:** React 19, TypeScript 5.8, Vite 7, GoJS 3.1 (evaluation watermark), Material-UI 7, `@ts-graphviz/parser` 0.6.1
- **Backend:** FastAPI, Python 3.11, uvicorn, rdflib, SPARQLWrapper
- **Store:** Virtuoso 7 (triple store)
- **CI/CD:** GitHub Actions → GitHub Pages (triggers on `Boxology-Interface/**` changes to `main`)

## Important Notes

- GoJS is running in evaluation mode — the watermark is expected and intentional.
- `@ts-graphviz/parser` is pinned to `0.6.1` for API compatibility; do not upgrade without verifying the `parse()` call in `dotImport.ts`.
- KG modules are deliberately re-imported on each API call in `backend/main.py`; this is intentional to avoid stale state.
- `tsconfig.json` has `noUnusedLocals: false` — unused variables won't fail the build.
