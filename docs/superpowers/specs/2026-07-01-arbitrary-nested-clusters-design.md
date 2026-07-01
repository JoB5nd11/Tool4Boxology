# Arbitrary / Nested Cluster Drawing

**Date:** 2026-07-01
**Status:** Approved for planning

## Context

TODO priority #4 (lower priority): "support drawing arbitrary clusters/containers, as shown in the Onlim UC and the BEAM paper." Explicitly out of scope for the topology-based pattern extraction fix ([`2026-07-01-topology-based-pattern-extraction-design.md`](2026-07-01-topology-based-pattern-extraction-design.md)), which only removes clustering as an *export requirement* — it doesn't change what the cluster-creation UI itself permits.

## Investigation

`handleClusterSelectedNodes` (`App.tsx:991`) has two restrictions preventing arbitrary clusters:

1. **Single-process-per-cluster check** (`App.tsx:1010`, `hasMultipleProcessNodes`) — hard error if the selection contains more than one process-type node. This existed because the *old* cluster-based `DesignPattern` extraction needed exactly one process per cluster to build a pattern from (`processNodes[0]`). The topology-based fix makes pattern extraction process-centric (one pattern per process node, found globally, independent of cluster membership) — so this restriction no longer protects anything and can be removed.
2. **No nesting** — the node-selection filter (`App.tsx:1001`, `part instanceof go.Node && !part.data.isGroup`) explicitly excludes `go.Group` parts from being clustered, so an existing cluster can never be grouped inside a new outer cluster.

## Decision

Remove both restrictions. Depends on the topology-based pattern extraction fix landing first (or alongside), since removing the process-count check without it would silently reintroduce the old data-loss bug for multi-process clusters.

## Changes

**`App.tsx` — `handleClusterSelectedNodes`:**
1. Delete the `hasMultipleProcessNodes(selectedNodes)` check and its alert (`~lines 1009-1013`). The `hasMultipleProcessNodes` helper itself can be deleted if unused elsewhere.
2. Change the selection filter (`~line 1001`) from `part instanceof go.Node && !part.data.isGroup` to also accept `go.Group` parts (i.e. `part instanceof go.Part && (part instanceof go.Node || part instanceof go.Group)`, excluding only the diagram's own background). When assigning `group` to selected parts (`~line 1030`), this naturally includes Group data too — GoJS supports a Group's own data having a `group` field pointing to an outer group (standard nested-group support), which the existing `ClusterGroup` template (`handlesDragDropForMembers`, `computesBoundsIncludingLinks`) is already configured to work with.

**`handleUnclusterGroup`** (`App.tsx:1040`) — verify it still behaves correctly one level at a time when un-clustering a group that itself contains a nested cluster (should only release direct members, leaving inner clusters intact) — likely already correct since it only iterates `selectedPart.memberParts`, but call out as a test case.

## Non-goals

- Not changing `buildDesignPatternsFromModelData` further — already topology-based per the prerequisite fix; nesting/multi-process clusters have zero effect on it since it no longer reads cluster membership for pattern discovery.
- Not adding new visual styling for nested clusters beyond what the existing `ClusterGroup` template already renders (it's a generic `go.Group` with `isSubGraphExpanded: true`, which already supports visually containing other groups).

## Testing

- Select two process-type nodes (e.g. two different `Train` boxes) → cluster → assert no error, both become members of one group.
- Select an existing cluster plus a loose node → cluster → assert the existing cluster becomes a nested member of the new outer cluster (check `group` field on the inner group's own data points to the outer group's key).
- Uncluster the outer group → assert only its direct members (the loose node + the inner cluster as a whole) are released, and the inner cluster's own members remain grouped under it.
- Regression: re-run the topology-based pattern extraction tests to confirm multi-process clusters now export correctly (one `DesignPattern` per process, unaffected by shared cluster membership).
