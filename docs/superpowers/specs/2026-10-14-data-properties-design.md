# Data properties on elements — design

Date: 2026-10-14 · Branch: `feature/data-properties` (stacked on `feature/context-type-selector`,
cut from the live lineage `merge/upstream-2026-07-24`) · Stage 2 of the BEAM v0.0.2 design note
(`beam-v002-elements/beam-v002-elements.typ`).

## Intent

Users want to attach typed values to diagram elements — e.g. a metric's measured value, a model's
version — so they are recorded with the system design and can be queried across projects in the
knowledge graph. Today a node carries only `label` and `subtext`; nothing typed reaches the KG.

Decisions taken with the user (the user asked to follow the recommendation at every open point):

| Question | Decision |
|---|---|
| Where property names come from | Schema (per element type, from the ontology) **plus** free custom properties |
| Which elements | BEAM cards and Boxology components. Not clusters, not links |
| Export | Exported now, as typed literals. Context-card properties saved but not exported (Context has no node IRI until Stage 1) |
| Schema home | Draft ttl, served by a backend endpoint |
| Starter schema | The design note's four: `metricValue`, `unit`, `measuredOn` (PerformanceMetric), `threshold` (SuccessCriteria). Those cards arrive in Stage 1, so on day one custom properties are the usable path |
| Editing UI | Dialog opened by double-click (not a sidebar panel) |
| Draft IRIs | `beam:` namespace, marked draft in the ttl |

## User experience

- **Double-click** a component or BEAM card → **Data properties** dialog. Single-click text editing is
  unchanged. A click on a selected node's text starts in-place editing, so the second click of a
  double-click lands in the text editor and GoJS never reports the double-click; the dialog therefore
  listens to the DOM `dblclick` on the diagram div, cancels any in-place edit, and opens for that node.
- Dialog sections:
  1. **Schema properties** for the element's type. Rows show only once added; an **Add property ▾**
     menu lists the schema properties not yet used.
  2. **Custom properties**: **+ Add custom** adds a row with name, datatype and value.
- Each row: label, input matching its datatype, delete button. Datatypes: `xsd:string` (text),
  `xsd:integer`, `xsd:decimal` (number), `xsd:date` (date picker), `xsd:boolean` (checkbox).
- Values are validated against the datatype; invalid values or empty custom names block **Save**
  with an inline error. Save is one undoable transaction; Cancel discards.
- If the schema can't be loaded, the dialog says *Schema unavailable — custom properties only*.
- **Canvas indicator**: an element with properties shows a small `n props` pill at its bottom-right;
  hovering shows `label: value` lines.

## Data model

A `props` array on the GoJS node data (saved by `toJson`, so save/load/autosave need no change):

```js
props: [
  { iri: 'http://w3id.org/beam/core#metricValue', label: 'metricValue', datatype: 'xsd:decimal', value: '0.87' },
  { iri: null, label: 'gpu hours', datatype: 'xsd:integer', value: '12' }   // custom
]
```

`label` and `datatype` are kept on each entry so a diagram stays readable and exportable when the
schema is unavailable or has changed. Values are strings; typing happens at export. An element with
no properties has no `props` field (the dialog deletes it when the list is empty).

## Schema

- New `src/kg_creation/ontologies/beam_properties.ttl`: `owl:DatatypeProperty` with `rdfs:label`,
  `rdfs:domain`, `rdfs:range` (an `xsd:` type), each marked `# draft`.
- New `GET /api/schema/properties` (in `backend/main.py`), backed by a new
  `kg_creation/property_schema.py`. It parses the reasoning bundle used by `beam_enrichment`
  plus `beam_properties.ttl`, computes the subclass closure, and returns, for every class, the
  properties whose domain is the class or a superclass:

  ```json
  { "classes": { "PerformanceMetric": [ { "iri": "...#metricValue", "label": "metricValue", "datatype": "xsd:decimal" } ] } }
  ```

  Keys are class **local names** (beam:, beamr: and t4b: classes alike; beam:/beamr: win a clash).
  Cached per file modification time.
- Frontend: `src/utils/propertySchema.ts` fetches once and caches. An element's class key is the
  local name of `beamStyleMap[type ?? name].beamClass`, falling back to `name`. Unknown range → `xsd:string`.

## Export

- `generateMultiPageRMLExport` adds `props` to each annotation entry. Components already travel with
  all their fields in `nodeDataArray`.
- New `kg_creation/data_property_triples.py` → `generate_property_triples(source)`:
  - Subject: component → `t4b:Component/<key>`; risk/Note cards → `t4b:Annotation/<box>/<key>`;
    System card → the boxology IRI; **Context card → skipped**.
  - Predicate: the entry's `iri`, or `http://tool4boxology.org/prop/<slug>` for custom entries
    (slug: runs of characters outside `[A-Za-z0-9_-]` become `_`, trimmed).
  - Object: `xsd:string` → plain literal; other types → `"v"^^xsd:type` after validation
    (integer, decimal, `YYYY-MM-DD` date, `true`/`false` boolean). Invalid or empty values are skipped.
- Wired into `create_kg` (KG upload) and `/api/beam-export` (appended unfiltered, like annotation
  triples, so custom `t4b:prop/` triples are kept).
- Re-export cleanup in `update_kg`: annotation properties already go with the `Annotation/<box>/`
  delete. A new delete removes, from the boxology IRI and from every component key in the incoming
  export, literal-valued triples whose predicate is under `t4b:prop/` or is a schema property.

## Out of scope

Stage 1 cards (SuccessCriteria, PerformanceMetric, TaskExecution), Context as a node, properties on
links or clusters, the sidebar Properties panel from the design note mockup, competency-question
queries (Stage 3). When a component is deleted from the diagram, its old property triples stay in
the KG, the same as its other triples do today.

## Testing

- Python unittest: `test_data_property_triples.py` (subjects, datatypes, validation, custom slug,
  Context skip), `test_property_schema.py` (inheritance via subclass closure, ranges).
- Playwright: `data-properties.spec.ts` — double-click opens the dialog; add custom + save writes
  `props`; invalid decimal blocks save; Cancel discards; the `n props` pill appears; export payload
  carries card `props`; schema rows appear when the schema endpoint is mocked.
