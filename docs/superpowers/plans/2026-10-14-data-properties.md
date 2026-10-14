# Data Properties Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Double-clicking a component or BEAM card opens a dialog to add typed data properties (schema-defined or custom), stored on the node and exported to the KG as typed literals.

**Architecture:** A draft ttl declares datatype properties; a backend endpoint turns the ontology bundle into a per-class property list (with subclass inheritance). The frontend stores `props` on GoJS node data, edits them in an MUI dialog, shows a count pill on the canvas, and passes card props in the export payload. A new Python module turns `props` into triples for both the KG upload and the BEAM file export.

**Tech Stack:** React 19 + MUI 7 + GoJS 3.1 (frontend), FastAPI + rdflib (backend), Playwright e2e, Python unittest.

**Spec:** `docs/superpowers/specs/2026-10-14-data-properties-design.md`

## Global Constraints

- Branch `feature/data-properties`, worktree `wt-context-type`; never touch `main` or the live lineage.
- Datatypes: exactly `xsd:string`, `xsd:integer`, `xsd:decimal`, `xsd:date`, `xsd:boolean`; anything else → `xsd:string`.
- Custom predicate IRI: `http://tool4boxology.org/prop/<slug>`, slug = runs of characters outside `[A-Za-z0-9_-]` replaced by `_`, then `_` trimmed from both ends.
- Context cards: props saved, never exported. System card: subject is the boxology IRI.
- `beam:description` and `beam:context` are filled from card fields already; they never appear in the schema list.
- e2e runs need a free port: use a temporary `playwright.ctx.config.ts` (port 3124), never commit it.
- Python tests run from `src/kg_creation`: `python -m unittest <module>`.

## Review Focus

1. Comma decimals (`0,87`) or padded values (` 12 `) — UI shows an error for the comma; whitespace is trimmed; Python never emits an invalid typed literal. Pinned in Task 2 and Task 4 tests.
2. Custom names that slug to nothing (`!!!`) or duplicate another row's slug — UI blocks Save; Python skips empty slugs. Pinned in Task 2 and Task 4.
3. Values containing quotes / newlines — escaped string literal, valid Turtle. Pinned in Task 2.
4. Backend down — dialog still opens, says schema unavailable, custom rows work. Pinned in Task 4.
5. A stored schema prop whose IRI the current schema no longer lists — still shown and exported by its stored IRI. Pinned in Task 2 (export) and Task 4 (display).

---

### Task 1: Property schema module, draft ttl, endpoint

**Files:**
- Create: `src/kg_creation/ontologies/beam_properties.ttl`
- Create: `src/kg_creation/property_schema.py`
- Create: `src/kg_creation/test_property_schema.py`
- Modify: `backend/main.py` (new route next to `/api/health`)

**Interfaces:**
- Produces: `build_property_schema(graph: rdflib.Graph) -> dict[str, list[dict]]`, `load_property_schema() -> dict[str, list[dict]]`, `all_schema_property_iris() -> set[str]`; entries are `{"iri", "label", "datatype"}`. Route `GET /api/schema/properties` → `{"classes": {...}}`.

- [ ] **Step 1: Write the failing test** — `test_property_schema.py`:

```python
import unittest
from rdflib import Graph
from property_schema import build_property_schema, load_property_schema

TTL = """
@prefix beam: <http://w3id.org/beam/core#> .
@prefix t4b:  <http://tool4boxology.org/> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
beam:StatisticalModel rdfs:subClassOf beam:Model .
t4b:StatisticalModel rdfs:subClassOf beam:StatisticalModel .
beam:version a owl:DatatypeProperty ; rdfs:label "version" ; rdfs:domain beam:Model ; rdfs:range xsd:String .
beam:homepage a owl:DatatypeProperty ; rdfs:domain beam:Model ; rdfs:range xsd:anyURI .
beam:description a owl:DatatypeProperty ; rdfs:domain beam:Model ; rdfs:range xsd:string .
"""

def _schema():
    g = Graph()
    g.parse(data=TTL, format="turtle")
    return build_property_schema(g)

class PropertySchemaTest(unittest.TestCase):
    def test_inherited_through_subclass_closure(self):
        labels = [p["label"] for p in _schema()["StatisticalModel"]]
        self.assertIn("version", labels)

    def test_range_mapping_and_label_fallback(self):
        by_label = {p["label"]: p for p in _schema()["Model"]}
        self.assertEqual(by_label["version"]["datatype"], "xsd:string")
        self.assertEqual(by_label["homepage"]["datatype"], "xsd:string")

    def test_tool_filled_properties_excluded(self):
        labels = [p["label"] for p in _schema()["Model"]]
        self.assertNotIn("description", labels)

    def test_real_bundle_has_draft_metric_properties(self):
        by_label = {p["label"]: p for p in load_property_schema()["PerformanceMetric"]}
        self.assertEqual(by_label["metricValue"]["datatype"], "xsd:decimal")
        self.assertEqual(by_label["measuredOn"]["datatype"], "xsd:date")
        self.assertEqual(by_label["metricValue"]["iri"], "http://w3id.org/beam/core#metricValue")

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run, expect FAIL** — `cd src/kg_creation && python -m unittest test_property_schema` → `ModuleNotFoundError: property_schema`.

- [ ] **Step 3: Implement** — `beam_properties.ttl` declares `beam:metricValue` (decimal), `beam:unit` (string), `beam:measuredOn` (date) on `beam:PerformanceMetric` and `beam:threshold` (decimal) on `beam:SuccessCriteria`, each `# draft`. `property_schema.py`: subclass closure (subClassOf + equivalentClass both ways, reusing `_transitive_closure` from `beam_enrichment`), datatype properties grouped by domain, per-class union over the class and its superclasses, keyed by local name with beam:/beamr: preferred over other namespaces on a clash, `beam:description`/`beam:context` excluded, cached per file mtime. Route:

```python
@app.get("/api/schema/properties")
def api_schema_properties():
    from kg_creation.property_schema import load_property_schema
    return {"classes": load_property_schema()}
```

- [ ] **Step 4: Run, expect PASS**, plus the existing `test_beam_annotation_triples`.
- [ ] **Step 5: Commit** `feat(props): ontology-driven data property schema endpoint`.

### Task 2: Property triples and export wiring

**Files:**
- Create: `src/kg_creation/data_property_triples.py`
- Create: `src/kg_creation/test_data_property_triples.py`
- Modify: `src/kg_creation/kg_creation.py` (`create_kg`, `update_kg`)
- Modify: `backend/main.py` (`api_beam_export`)

**Interfaces:**
- Consumes: `all_schema_property_iris()` from Task 1.
- Produces: `generate_property_triples(source: dict) -> str` (N-Triples-style lines, `""` when none), `typed_literal(value, datatype) -> str | None`, `custom_property_iri(label) -> str | None`, `stale_property_delete_query(box_iri: str, component_keys: list[str], schema_iris: set[str]) -> str`.

- [ ] **Step 1: Write the failing test** — `test_data_property_triples.py`:

```python
import unittest
from data_property_triples import (
    generate_property_triples, typed_literal, custom_property_iri, stale_property_delete_query,
)

T4B = "http://tool4boxology.org/"
XSD = "http://www.w3.org/2001/XMLSchema#"
MV = "http://w3id.org/beam/core#metricValue"

def _src(annotations=(), nodes=()):
    return {"boxologies": [{"id": "b1", "annotations": list(annotations), "nodeDataArray": list(nodes)}]}

def _p(label, datatype, value, iri=None):
    return {"iri": iri, "label": label, "datatype": datatype, "value": value}

class TypedLiteralTest(unittest.TestCase):
    def test_types(self):
        self.assertEqual(typed_literal("0.87", "xsd:decimal"), f'"0.87"^^<{XSD}decimal>')
        self.assertEqual(typed_literal(" 12 ", "xsd:integer"), f'"12"^^<{XSD}integer>')
        self.assertEqual(typed_literal("2026-10-05", "xsd:date"), f'"2026-10-05"^^<{XSD}date>')
        self.assertEqual(typed_literal("TRUE", "xsd:boolean"), f'"true"^^<{XSD}boolean>')
        self.assertEqual(typed_literal('say "hi"\nok', "xsd:string"), '"say \\"hi\\"\\nok"')
        self.assertEqual(typed_literal("x", "xsd:anyURI"), '"x"')

    def test_invalid_values_skipped(self):
        for v, dt in [("0,87", "xsd:decimal"), ("1.5", "xsd:integer"), ("2026-13-01", "xsd:date"),
                      ("yes", "xsd:boolean"), ("", "xsd:string"), (None, "xsd:string")]:
            self.assertIsNone(typed_literal(v, dt), (v, dt))

class CustomIriTest(unittest.TestCase):
    def test_slug(self):
        self.assertEqual(custom_property_iri(" gpu hours! "), T4B + "prop/gpu_hours")
        self.assertIsNone(custom_property_iri("!!!"))

class GenerateTest(unittest.TestCase):
    def test_component_schema_and_custom(self):
        out = generate_property_triples(_src(nodes=[{"key": "n1", "props": [
            _p("metricValue", "xsd:decimal", "0.87", MV), _p("gpu hours", "xsd:integer", "12")]}]))
        self.assertIn(f'<{T4B}Component/n1> <{MV}> "0.87"^^<{XSD}decimal> .', out)
        self.assertIn(f'<{T4B}Component/n1> <{T4B}prop/gpu_hours> "12"^^<{XSD}integer> .', out)

    def test_card_subjects(self):
        out = generate_property_triples(_src(annotations=[
            {"key": "r", "name": "Risk", "props": [_p("odds", "xsd:string", "low")]},
            {"key": "s", "name": "System", "props": [_p("owner", "xsd:string", "lab")]},
            {"key": "c", "name": "Context", "props": [_p("why", "xsd:string", "x")]},
        ]))
        self.assertIn(f'<{T4B}Annotation/b1/r> <{T4B}prop/odds> "low" .', out)
        self.assertIn(f'<{T4B}Boxology/b1> <{T4B}prop/owner> "lab" .', out)
        self.assertNotIn("why", out)

    def test_groups_cards_and_bad_entries_skipped(self):
        out = generate_property_triples(_src(nodes=[
            {"key": "g", "isGroup": True, "props": [_p("a", "xsd:string", "v")]},
            {"key": "k", "category": "beamCard", "props": [_p("a", "xsd:string", "v")]},
            {"key": "n", "props": [_p("!!!", "xsd:string", "v"), _p("a", "xsd:decimal", "abc")]},
        ]))
        self.assertEqual(out, "")

    def test_unknown_schema_iri_still_exported(self):
        out = generate_property_triples(_src(nodes=[{"key": "n", "props": [
            _p("old", "xsd:string", "v", "http://example.org/dropped")]}]))
        self.assertIn("<http://example.org/dropped>", out)

class StaleQueryTest(unittest.TestCase):
    def test_query_shape(self):
        q = stale_property_delete_query(T4B + "Boxology/b1", ["n1"], {MV})
        self.assertIn(f"<{T4B}Boxology/b1> <{T4B}Component/n1>", q)
        self.assertIn(f"STRSTARTS(STR(?p), \"{T4B}prop/\")", q)
        self.assertIn(f"?p IN (<{MV}>)", q)
        self.assertIn("isLiteral(?o)", q)

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run, expect FAIL** (`ModuleNotFoundError`).
- [ ] **Step 3: Implement** `data_property_triples.py` per the interfaces (escape strings like `beam_annotation_triples._lit`; validate integer `^[+-]?\d+$`, decimal `^[+-]?(\d+(\.\d*)?|\.\d+)$`, date `YYYY-MM-DD` via `date.fromisoformat`, boolean `true|false` case-insensitive). Wire it:
  - `create_kg`: append `generate_property_triples(source)` after the annotation triples.
  - `update_kg`: before the main DELETE, run `stale_property_delete_query(box_iri, [n["key"] for n in boxology["nodeDataArray"]], all_schema_property_iris())` (schema load failure → empty set).
  - `api_beam_export`: append property triple lines next to the annotation lines (unfiltered).
- [ ] **Step 4: Run all three Python test modules, expect PASS.**
- [ ] **Step 5: Commit** `feat(props): export data properties as typed literals`.

### Task 3: Frontend schema client, validation, export payload

**Files:**
- Create: `src/utils/propertySchema.ts`
- Modify: `src/utils/exportHelpers.ts` (annotation mapping)
- Modify: `tests/e2e/context-type-badge.spec.ts` (unchanged expectations — confirms props are only added when present)

**Interfaces:**
- Produces:
  ```ts
  export type XsdType = 'xsd:string' | 'xsd:integer' | 'xsd:decimal' | 'xsd:date' | 'xsd:boolean';
  export const XSD_TYPES: { value: XsdType; label: string }[];
  export interface SchemaProperty { iri: string; label: string; datatype: XsdType }
  export interface DataProperty { iri: string | null; label: string; datatype: XsdType; value: string }
  export type PropertySchema = Record<string, SchemaProperty[]>;
  export function loadPropertySchema(): Promise<PropertySchema | null>;   // null = unavailable
  export function schemaPropertiesFor(schema: PropertySchema, node: any): SchemaProperty[];
  export function valueError(datatype: XsdType, value: string): string | null;
  export function customSlug(label: string): string;
  ```
- `schemaPropertiesFor` tries, in order, `node.contextType` (Context cards), the local name of `beamStyleMap[type ?? name].beamClass`, then `name` with spaces removed; first key with entries wins.

- [ ] **Step 1:** Write `propertySchema.ts` as above; `valueError` mirrors Task 2's Python rules after trimming (`'Enter a value'`, `'Whole number expected'`, `'Number expected, e.g. 0.87'`, `'Date expected (YYYY-MM-DD)'`); `customSlug` mirrors `custom_property_iri`'s slug.
- [ ] **Step 2:** In `generateMultiPageRMLExport`'s annotation mapping add `...(Array.isArray(n.props) && n.props.length ? { props: n.props } : {})`.
- [ ] **Step 3:** `npx tsc --noEmit -p tsconfig.app.json` → 0 errors. (Behaviour is exercised by Task 4's e2e.)
- [ ] **Step 4: Commit** `feat(props): schema client, value validation, props in export payload`.

### Task 4: Dialog, double-click, canvas pill

**Files:**
- Create: `src/components/dialogs/DataPropertiesDialog.tsx`
- Modify: `src/GoDiagram.tsx` (state, `ObjectDoubleClicked`, `makePropsPill()` added to the component template and the `beamCard` template, render dialog next to the diagram div)
- Test: `tests/e2e/data-properties.spec.ts`

**Interfaces:**
- Consumes: everything from Task 3.
- Produces: `DataPropertiesDialog` props `{ open: boolean; title: string; schema: SchemaProperty[] | null; initial: DataProperty[]; onSave(props: DataProperty[]): void; onCancel(): void }`. DOM hooks for tests: `data-testid="data-properties-dialog"`, rows `data-testid="prop-row"`, buttons named **Add custom**, **Save**, **Cancel**; GoJS object `PROPS_PILL` with text object `PROPS_PILL_TEXT`.

- [ ] **Step 1: Write the failing e2e test** — `data-properties.spec.ts` (double-click via `page.mouse.dblclick` at the node centre computed with `diagram.maybeUpdate()` + `transformDocToView`):
  1. double-click a Model component → dialog visible; schema request mocked with `page.route('**/api/schema/properties', …)` returning `{classes:{Model:[{iri:'http://w3id.org/beam/core#version',label:'version',datatype:'xsd:string'}]}}`; *Add property* lists `version`.
  2. Add custom `gpu hours` / integer / `12`, Save → `node.data.props` equals `[{iri:null,label:'gpu hours',datatype:'xsd:integer',value:'12'}]`; `PROPS_PILL` visible with text `1 prop`.
  3. Decimal `0,87` → Save disabled and the error text shown; Cancel → `props` unchanged.
  4. Duplicate custom names (`a`, `A!`) → Save disabled.
  5. Schema route aborted → dialog shows *Schema unavailable — custom properties only*, custom row still works.
  6. A Context card with `props` → `generateMultiPageRMLExport` annotation entry carries `props`.
  7. A node whose `props` hold an IRI the schema doesn't list → row shown with its stored label.
- [ ] **Step 2: Run, expect FAIL** (no dialog).
- [ ] **Step 3: Implement** the dialog (MUI `Dialog`, `TextField`, `MenuItem`, `Checkbox`, `IconButton`), the double-click wiring (`ObjectDoubleClicked` → for a non-group `go.Node`: open dialog, `loadPropertySchema()` → state), Save → one transaction `edit data properties` setting `props` (or `undefined` when empty), and `makePropsPill()` (bottom-right, whole-data bindings for `visible`/`text`, tooltip listing `label: value`).
- [ ] **Step 4: Run the new spec plus `context-type-badge` and `risk-class-badge`, expect PASS; then the full suite (rerun once if cold-start timeouts appear).**
- [ ] **Step 5: Commit** `feat(props): data properties dialog on double-click`.
