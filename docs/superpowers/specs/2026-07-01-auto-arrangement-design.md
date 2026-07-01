# Auto-Arrangement of Node Locations

**Date:** 2026-07-01
**Status:** Approved for planning
**Priority:** Lowest in the backlog (per user's stated TODO order)

## Context

TODO, lowest priority: "Algorithms for auto-arrangement of the location." No existing implementation or partial work found for this item (unlike most other backlog items, which had substantial uncommitted WIP to investigate).

## Decision

- Trigger: a new on-demand **"Auto-arrange"** toolbar action. Never runs automatically — it must not silently disturb a diagram the user has manually positioned.
- Scope: rearranges the **entire current diagram** (not just a selection).
- Workflow nodes and annotation/Risk (`beamCard`) nodes are laid out **separately**, matching how the BEAM paper and the hand-built GraphRAG example visually separate the annotation band from the main flow.

## Design

Use GoJS's built-in `go.LayeredDigraphLayout` rather than a hand-rolled algorithm — it's designed for exactly this shape of problem (arranging a directed graph into flow layers, minimizing crossings) and is already part of the GoJS dependency the project uses.

**Two independent layout passes, run in one "Auto-arrange" transaction:**

1. **Main workflow pass** — collect all non-`beamCard`, non-`ClusterGroup` nodes and the default-category (solid) links between them. Run `LayeredDigraphLayout` with left-to-right direction (`layout.direction = 0`), matching the existing hand-built examples' flow orientation.
   - Clusters (from #19's arbitrary/nested cluster design) are treated as atomic units at this level — GoJS's layout can operate on top-level Groups as single boxes, while each `ClusterGroup` gets its own nested `LayeredDigraphLayout` (or simple layout) applied to its members independently, consistent with GoJS's standard nested-group layout support.
2. **Annotation/Risk pass** — collect all `beamCard` nodes and the `'annotation'`-category links between them (the same risk-chain edges `beam_annotation_triples.py` already reasons over: RiskSource→Risk→Consequence→Impact, RiskControl→modifies). Run a second, separate `LayeredDigraphLayout` (direction chosen to produce a compact band, e.g. top-down) over just this subgraph.
3. **Compose**: after both passes compute their own local bounds, translate the annotation pass's layout to sit as a band above (or beside) the main workflow pass's bounds, non-overlapping — mirroring the vertical band structure already visible in `graphragExample.ts` (annotations at low y-values, workflow at high y-values).

Links between a `beamCard` node and a workflow node (the annotation connectors themselves) are not part of either layout pass's edge set — they're purely visual connectors drawn wherever GoJS's link routing places them between the two independently-positioned bands, same as today.

## Non-goals

- Not attempting a single unified layout algorithm across workflow + annotations — explicitly rejected in favor of two separate passes.
- Not changing anything about manual dragging/positioning — auto-arrange is purely an opt-in, on-demand action.
- Not building a custom graph-layout algorithm from scratch — relies entirely on GoJS's shipped `LayeredDigraphLayout`.

## Testing

- Manual: load the GraphRAG/Onlim example (positions already hand-tuned), click Auto-arrange, confirm the result is a reasonable left-to-right flow with the annotation band placed above and non-overlapping.
- Manual: load a clustered example (Pain Classification or MRI Segmentation), click Auto-arrange, confirm clusters remain visually intact as grouped boxes rather than having their members scattered across the whole canvas.
- e2e: assert clicking "Auto-arrange" doesn't throw and that node `loc` values change (i.e. the layout actually ran) without altering node/link data (`key`, `type`, `category`, etc.) — only `loc` should change.
