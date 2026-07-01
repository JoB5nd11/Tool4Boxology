# Topology-Based Pattern Extraction (Remove Mandatory Clustering)

**Date:** 2026-07-01
**Status:** Approved for planning

## Context

Merges three backlog items that share one root cause:
- TODO priority #2: "Export the Onlim use case to valid BEAM ontology + Risk"
- TODO priority #3: "bypass the restriction/validation imposed T4B (related to clusters)"
- Not working: "Create KG (and export it to a file)"
- Partial: "clusters needs to be added manually (legacy validation)"

## Investigation

`generateMultiPageRMLExport` (used by Export→JSON, Create KG, and BEAM Turtle export alike) builds its `DesignPattern` array via `buildDesignPatternsFromModelData` (`Boxology-Interface/src/utils/exportHelpers.ts:44`). That function **only considers nodes inside a `ClusterGroup`** — it filters `nodeDataArray` for `isGroup && category === 'ClusterGroup'`, then for each group looks for a process-type member. Any node not manually boxed into a cluster is invisible to `DesignPattern`, and `DesignPattern` is the *only* thing the T4B RML pipeline (`kg_creation/mapping.ttl`'s `InputComponentMap`/`OutputComponentMap`/`ProcessComponentMap`) reads to generate Component triples.

Consequence, confirmed concretely: the GraphRAG/Onlim example (`graphragExample.ts`) has zero `ClusterGroup` nodes. Running BEAM Turtle export on it today produces a `.ttl` with Risk/Annotation triples (those come from a separate `beamCard`-filter side-channel, unaffected) but **no workflow triples at all** — the core diagram (`Data → Infer → Transform → ...`) is silently absent. The existing e2e tests (`beam-export.spec.ts`) don't catch this because they only assert on `annotations`/`annotationLinks`, never on workflow `DesignPattern` content.

`validateNodeClustering()` (`App.tsx:418`) is the hard-blocking gate that requires every non-`beamCard` node to have a `group` assignment. It's called before `'json'` export (`App.tsx:474`) and unconditionally in `handleCreateKG` (`App.tsx:1082`) — but *not* before BEAM export, which is why the existing e2e tests show BEAM export tolerating unclustered nodes while JSON export rejects them. The validation exists because the export pipeline genuinely couldn't represent an unclustered node — not because clustering is semantically required by T4B/BEAM.

**Important:** input/output detection inside `buildDesignPatternsFromModelData` was *already* topology-based, not cluster-based — it filters the full `linkDataArray` for links into/out of the process node (`links.filter(l => l.to === processKey)`), regardless of cluster membership. Clustering was only ever used to (a) find candidate process nodes in the first place, and (b) a fallback path when a cluster has no process node. This makes the fix narrow and low-risk.

## Decision

Make cluster membership optional/visual-only. Pattern extraction becomes process-centric: one `DesignPattern` per process-type node in the whole diagram, using the exact same (already topology-based) input/output detection.

## Design

**`buildDesignPatternsFromModelData`** (`exportHelpers.ts:44`) — replace the `for (const g of groups)` loop with:
```
for each node P in nodeDataArray where isProcess(P):
    inputs  = nodeDataArray connected via any link with l.to === P.key   (unchanged logic)
    outputs = nodeDataArray connected via any link with l.from === P.key (unchanged logic)

    // Preserve existing IRIs/labels for already-clustered diagrams (no regression
    // for Pain Classification / MRI Segmentation examples):
    if P.group is set AND exactly one process-type node belongs to that cluster:
        id, label = cluster.key, cluster.label
    else:
        id, label = P.key, P.label ?? 'Pattern'

    pattern = { id, label, input: mappedInputs, output: mappedOutputs, process: toComponent(P) }
```
The "exactly one process per cluster" check disambiguates the edge case where two process nodes share a cluster (today's code silently drops the second one via `processNodes[0]`; the new code must not collide two patterns onto the same `id`).

Drop the "no process node in cluster → treat sources/sinks as input/output" fallback entirely — it was a defensive branch for a cluster that isn't really a coherent DesignPattern (no process = nothing to attach `t4b:hasProcess` to), not an intentional feature. No known example relies on it.

**`App.tsx`** — remove the `validateNodeClustering()` call and its blocking `alert(...)` at the `'json'` export case (`~line 474`) and in `handleCreateKG` (`~line 1082`). Delete `validateNodeClustering` itself (`App.tsx:418`) once both call sites are gone, since nothing else references it.

## Non-goals

- Not adding new UI for drawing arbitrary/nested clusters (separate, lower-priority backlog item) — this only removes the *requirement*.
- Not changing the `beamCard`/`annotations`/`annotationLinks` side-channel — unaffected, already topology-independent.
- Not changing `mapping.ttl` or any Python KG code — the fix is entirely in how the frontend builds `DesignPattern`; the RML mapping already consumes whatever `DesignPattern` array it's given.

## Testing

- Extend `tests/e2e/beam-export.spec.ts`: load the GraphRAG example (no clusters) and assert the captured `/api/beam-export` payload's `DesignPattern` is non-empty and contains the workflow process nodes (`extraction`, `kg_query`, `llm_prompt`, etc.) — this is the regression test for the bug found here.
- Add a JSON-export test confirming unclustered diagrams no longer trigger the clustering alert.
- Add a Create-KG test confirming `handleCreateKG` no longer blocks on unclustered nodes.
- Regression: verify the two existing clustered examples (Pain Classification, MRI Segmentation) still produce identical `DesignPattern` output (same ids/labels) after the change, per the cluster-aware naming rule above.
