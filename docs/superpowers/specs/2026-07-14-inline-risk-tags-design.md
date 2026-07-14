# Inline Risk Tags — Design Spec

**Date:** 2026-07-14
**Status:** Approved (brainstorming)
**Branch:** `feature/inline-risk-tags` (worktree off `main`)

## Problem

Risk classes (`Risk`, `RiskSource`, `RiskControl`, `Consequence`, `Impact`) exist today only
as standalone `beamCard` nodes: drag a whole card onto the canvas and draw an annotation link
to the component it concerns. For the common case — "this component carries this risk" — that is
heavyweight. Users want to mark a component directly with a small badge on top of the box.

## Decisions (from brainstorming)

- **Intent:** lightweight inline tagging that carries the **same KG semantics** as a linked risk card.
- **Multiplicity:** a component can carry **multiple** risk tags (array on the node).
- **Detail per tag:** **class + short editable name** (enough to emit a named risk node). No inline description.
- **Classes offered:** only the three with a *direct* element relationship —
  `Risk` (`element beamr:hasRisk risk`), `RiskControl` (`control beamr:associatedTo element`),
  `RiskSource` (`source beamr:originatedFrom element`). `Consequence`/`Impact` stay as standalone
  cards chained off a `Risk`.
- **Add interaction:** a `+ risk` affordance on the node opens a picker (choose class); each tag
  stacks as its own badge with an inline-editable name.
- **Scope:** only regular workflow components (default node template) are taggable — **not** clusters
  and **not** existing `beamCard` risk/annotation nodes.

## Approach (chosen: ① desugar at export)

Store tags on the node; render badges from that array; at export time **unfold** each tag into the
existing `annotations` + `annotationLinks` structures so the current backend
(`beam_annotation_triples.py`) produces the correct triples. **No backend changes.**

Rejected: ② materialize real risk cards (canvas clutter, layout coupling); ③ new `riskTags` field
carried end-to-end with new backend rules (duplicates existing predicate logic).

## Implementation

### A. Data model (`src/types.ts`)
```ts
export interface RiskTag {
  id: string;                                    // stable key, e.g. `risktag_<ts>_<rand>`
  riskClass: 'Risk' | 'RiskSource' | 'RiskControl';
  name: string;                                  // short, editable; may be ''
}
```
Node data carries an optional `riskTags?: RiskTag[]`. `DiagramData` is an untyped bag, so no
breaking change.

### B. Rendering (`src/GoDiagram.tsx`, default `nodeTemplate`)
- Add a `Vertical` panel bound via `itemArray: riskTags`, placed **above** `TYPE_BADGE`
  (off the node, top→bottom: risk badges → type badge → box).
- `itemTemplate`: small rounded pill filled per class
  (`Risk` `#fb8c00`, `RiskSource` `#f9a825`, `RiskControl` `#388e3c`), text `"<class>: <name>"`,
  and a `✕` remove target.
- A `+ risk` affordance on the node (shown on hover, like ports) opens the class picker.

### C. Add / edit / remove (all via `diagram.model` transactions → undo/redo + autosave)
- **Add:** picker (DOM dropdown, mirroring `showTypeSelector`) → append a `RiskTag` to `riskTags`
  (create the array if absent) with the chosen class and empty name.
- **Rename:** badge name is an inline-editable `TextBlock`; two-way bound into the item, committed
  through a model transaction.
- **Remove:** `✕` deletes that tag from the array.

### D. KG export desugaring (`src/utils/exportHelpers.ts`)
After building `annotations`/`annotationLinks`, for each node with `riskTags`, per tag append:
- annotation: `{ key: tag.id, name: tag.riskClass, label: tag.name, subtext: '' }`
- annotation link: `{ from: tag.id, to: node.key, fromType: tag.riskClass, toType: node.name,
  fromIsAnnotation: true, toIsAnnotation: false }`

Existing `_resolve_link_property` then yields:
`Risk` → reversed `component hasRisk risk`; `RiskSource` → `originatedFrom`; `RiskControl` → `associatedTo`.

### E. Edge cases
- **BEAM view** (`beamViewActive`) re-skins by type; risk badges are independent and stay visible.
- **Session persistence / JSON:** `riskTags` rides along in node data automatically.
- **DOT import/export:** ignores unknown fields (DOT is a lossy view) — acceptable.
- **Validation:** unaffected (tags are not links).

### F. Verification (no test suite in repo)
Drive the app (`npm run dev`): add/rename/remove tags, undo/redo, reload (persistence), then run a
KG export and confirm the N-Triples contain `hasRisk` / `originatedFrom` / `associatedTo` for the
tagged components.
