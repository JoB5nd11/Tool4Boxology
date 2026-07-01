# Risk / Risk Control Marker Badge

**Date:** 2026-07-01
**Status:** Approved for planning

## Context

The 2026-07-01 project status check-in flagged the BEAM Risk shape library as "working partially": Risk and Risk Control currently only exist as standalone two-section `beamCard` nodes (`Risk`, `RiskSource`, `Consequence`, `Impact`, `RiskControl`) connected to a workflow component via a dotted annotation link. The requested improvement is a small marker ("badge") rendered directly on top of an existing component (e.g. a `Model` node) tagging it *as* a Risk or Risk Control, without requiring a separate connected card.

This is scoped as a standalone increment on top of already-in-progress, uncommitted BEAM work in the working tree (`beam_annotation_triples.py`, `beamStyles.ts`, the BEAM view toggle in `App.tsx`/`GoDiagram.tsx`/`Toolbar.tsx`, and the new Playwright specs under `tests/e2e/`), which the user confirmed is otherwise close to done.

**Decision (confirmed with user):**
- The badge **supplements**, not replaces, the existing connected-card risk chain (RiskSource → Risk → Consequence/Impact, RiskControl → modifiesRiskConcept/associatedTo). Both mechanisms coexist.
- The badge is applied via **right-click context menu toggle** only (no drag-from-palette badge shape).
- The badge is anchored at **bottom-center** of the node, mirroring the existing `TYPE_BADGE` pill which occupies top-center, so the two never collide.

## Non-goals

- Not building a general-purpose "decorator" system for arbitrary marker types — this is scoped to exactly two marker values (`Risk`, `RiskControl`).
- Not fixing JSON reload (tracked separately in the backlog) — this design only ensures the new field isn't silently dropped once reload is fixed.
- Not changing the existing connected-card risk chain semantics or its export triples.

## Architecture / Data flow

```
Context menu action (App.tsx)
        │  sets/clears node.riskMarker via model.set(...)
        ▼
GoJS node data { ..., riskMarker?: 'Risk' | 'RiskControl' }
        │  binding
        ▼
RISK_BADGE panel on default node template (GoDiagram.tsx)
        │  (visual only)

Export path (unchanged trigger, additive output):
Diagram JSON → exportHelpers.ts (carries riskMarker in serialized node)
        → backend /api/kg → kg_creation pipeline
        → beam_annotation_triples.py: for each node with riskMarker set,
          emit `<Component/{id}> rdf:type beamr:{riskMarker}` using the
          SAME Component/{id} IRI the main mapping.ttl pipeline already
          assigns that node (confirmed: both use `http://tool4boxology.org/Component/{id}`).
```

## Components

### 1. Data model
Add optional field to the component node data shape (wherever node data types are declared, e.g. alongside `type`, `label`):
```ts
riskMarker?: 'Risk' | 'RiskControl';
```
Applies only to plain workflow-component nodes. Explicitly excluded for `beamCard`-category nodes (System, Context, Note, Risk, RiskSource, Consequence, Impact, RiskControl themselves — a Risk card cannot itself be marked as Risk) and `ClusterGroup` nodes.

### 2. Rendering — `GoDiagram.tsx`
Add a `RISK_BADGE` panel to the default node template (near the existing `TYPE_BADGE` panel, ~line 436):
- `go.Panel, 'Auto'`, `name: 'RISK_BADGE'`, `alignment: go.Spot.Bottom`, `alignmentFocus: go.Spot.Top`, margin mirroring `TYPE_BADGE`'s `-8` offset but on the bottom edge.
- `visible` bound to `riskMarker` (`new go.Binding('visible', 'riskMarker', v => !!v)`).
- Same visual construction as `TYPE_BADGE` (rounded-rectangle background, small horizontal panel with colored dot + text), but:
  - Fill/stroke/dot color: `#fb8c00` (orange) for `Risk`, `#388e3c` (green) for `RiskControl` — reusing the existing BEAM Risk palette already defined in `shape.ts`.
  - Text bound to `riskMarker`, displaying "Risk" or "Risk Control".
- No click handler needed on the badge itself (marking/clearing happens via context menu, not by clicking the badge).

### 3. Interaction — `ContextMenu.tsx` + `App.tsx`
- `ContextMenu.tsx`: add menu items gated on `selectedData` being a plain component node (`!selectedData?.isCluster && selectedData?.category !== 'beamCard'`):
  - If no `riskMarker` set: show "Mark as Risk" and "Mark as Risk Control".
  - If `riskMarker` set: show "Clear Risk Marker" (in place of the two mark actions).
- `App.tsx` `handleContextMenuAction`: add cases for `mark_risk`, `mark_risk_control`, `clear_risk_marker` that call `model.set(nodeData, 'riskMarker', ...)` on the selected node, following the same pattern used for other in-place node-data mutations.

### 4. Export — `beam_annotation_triples.py`
Add a small pass (new function, e.g. `generate_risk_marker_triples(source)`, or extend `generate_annotation_triples`) that:
- Iterates workflow components in the diagram (not the `annotations` list — these are plain nodes, not beamCard annotation nodes).
- For each with `riskMarker` truthy, emits: `<http://tool4boxology.org/Component/{id}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://w3id.org/beam/risk#{riskMarker}> .`
- This is a pure addition — one extra `rdf:type` triple per marked node, on the resource the main `mapping.ttl` pipeline already creates. No new resources, no changes to existing annotation/link logic.

### 5. Round-trip — `exportHelpers.ts`
Ensure `riskMarker` is included in the serialized node object in the diagram-JSON export, so the value isn't silently dropped (JSON reload itself is tracked as a separate, currently-broken backlog item — out of scope here, but the field should survive export either way).

## Error handling

- No new failure modes introduced: the badge is purely additive UI state with a two-value enum, and the export addition is a single extra triple line guarded by a truthy check (`if riskMarker:`).
- If `riskMarker` holds an unexpected value (e.g. from a manually-edited JSON import), the export step should skip emitting a triple rather than emit a malformed IRI — validate against the two known literal values before mapping to `beamr:{riskMarker}`.

## Testing

Extend `tests/e2e/beam-annotation.spec.ts` (or add a sibling spec) to cover:
1. Right-click a component → "Mark as Risk" → badge appears bottom-center, correct color/text.
2. Right-click again → "Mark as Risk Control" → badge updates.
3. "Clear Risk Marker" → badge disappears.
4. Exported KG/triples output contains the expected extra `rdf:type beamr:RiskControl` (or `beamr:Risk`) line for the marked component's `Component/{id}` IRI, and unmarked components are unaffected.
5. A `beamCard` Risk/RiskControl node itself does not offer the marker context-menu options.

## Open questions

None blocking — placement, interaction method, and supplement-vs-replace were all confirmed with the user during brainstorming.
