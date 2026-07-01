# Automatic Link-Type Inference (Modify/Add Link Types from UI)

**Date:** 2026-07-01
**Status:** Approved for planning

## Context

Status backlog listed "Modify/add different types of links (edge) from UI" as not working. Investigation found:

- GoJS registers exactly two link templates in `GoDiagram.tsx`: the default (solid arrow) and `'annotation'` (dotted, `~line 517-529`).
- Nothing in the frontend ever sets a link's `category` at draw time or relink time — `category: 'annotation'` only appears in hardcoded example data (`graphragExample.ts`) and in export code. A user drawing a link by hand always gets the default solid template, even when connecting to a Risk/Note/System card.
- This is not cosmetic: `exportHelpers.ts:239-240` splits `linkDataArray` into workflow links vs. `annotationLinks` purely by `l.category === 'annotation'`, and that split feeds directly into `beam_annotation_triples.py`'s KG export. Wrong category ⇒ wrong/missing export triples.
- The correct category is **fully determined by endpoint type** in every existing example: a link is `'annotation'` iff at least one endpoint node has `category === 'beamCard'` (System, Context, Note, Risk, RiskSource, Consequence, Impact, RiskControl). No example needs manual override.

This item blocks "Draw Onlim use case in UI" (a user can't hand-build that diagram without annotation-style links working), which in turn blocks "Export to valid BEAM ontology + Risk" being exercised against a hand-drawn (not hardcoded) diagram.

## Decision

Fully automatic inference, no new menu/UI. Confirmed with user: the deterministic endpoint-type rule is trusted; no manual override control is being added.

## Design

**New helper** (e.g. in `GoDiagram.tsx` or a small `utils/linkCategory.ts`):
```ts
function inferLinkCategory(fromData: any, toData: any): string | undefined {
  const isCard = (d: any) => d?.category === 'beamCard';
  return (isCard(fromData) || isCard(toData)) ? 'annotation' : undefined;
}
```

**Wiring** — two `go.Diagram` listeners added alongside the existing `'ExternalObjectsDropped'` listener (`GoDiagram.tsx:749`):
- `diagram.addDiagramListener('LinkDrawn', (e) => { ... })` — fires when the linking tool completes a new link. Look up the link's `from`/`to` node data, compute category via `inferLinkCategory`, apply via `diagram.model.setCategoryForLinkData(linkData, category)`.
- `diagram.addDiagramListener('LinkRelinked', (e) => { ... })` — fires when an existing link is dragged to a new endpoint via the relinking tool (already enabled, `GoDiagram.tsx:273-282`). Recompute and reapply category the same way, since the endpoints changed.

**Why `setCategoryForLinkData` and not `model.set`:** category selects which `linkTemplateMap` entry renders the link. A plain data-property mutation updates the model but does not swap the already-instantiated GoJS `Link` part to the new template; `setCategoryForLinkData` handles the swap correctly.

## Non-goals

- No manual "change link type" context-menu control (rejected — the rule is deterministic and every case is covered).
- No new link templates/types beyond the existing default and `'annotation'`.
- No backend/export changes — `exportHelpers.ts` and `beam_annotation_triples.py` already handle `category === 'annotation'` correctly.

## Testing

- New/extend `tests/e2e/beam-annotation.spec.ts`: draw a link from a workflow node to a Risk card via the UI (not loaded from example JSON) → assert the link renders dotted (annotation template) and that exported JSON has `category: 'annotation'` for that link.
- Draw a link between two plain workflow nodes → assert it stays solid/default.
- Drag an existing default link's endpoint onto a beamCard node → assert it switches to the annotation template.
- Manual: reconstruct the Onlim/GraphRAG diagram by hand in the UI (not via the "GraphRAG (BEAM)" load button) as acceptance testing for this fix and the existing shape library — this is the deferred "Draw Onlim use case in UI" backlog item, folded in here rather than given its own spec.
