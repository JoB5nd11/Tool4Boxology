# BEAM UI Dedup — Remove Duplicate Palette Entries

**Date:** 2026-07-01
**Status:** Approved for planning

## Context

Surfaced while resolving the BEAM↔T4B alignment-direction dispute ([`2026-07-01-beam-t4b-direction-resolution.md`](2026-07-01-beam-t4b-direction-resolution.md)): the user's underlying concern was "this is a T4B-first tool, we shouldn't add additional UI for BEAM, just use what's in T4B."

Investigation of the current (uncommitted) WIP found a real instance of this problem: `Boxology-Interface/src/data/shape.ts` has a `'BEAM Concepts'` shape group with ~8 entries (`Data`, `Symbol`, `Model`, `Actor`, `Train`, `Engineer`, `Transform`, `StatisticalModel`, `SemanticModel`, `Infer`) that duplicate existing T4B-grouped entries — same `name` field (so identical underlying semantics/export mapping), just a different default color. `LeftSidebar.tsx` renders this as a second, separate palette section.

## Investigation: is the BEAM View toggle also a duplicate?

No. `GoDiagram.tsx:930-946` (with `beamStyles.ts`'s `beamStyleMap`) re-skins whatever nodes already exist on the canvas by looking up each node's `type`/`name`, and restores the original T4B appearance when toggled off. It doesn't create a second way to *author* a node — it's a read-only visualization toggle over the single T4B-authored diagram. This is not duplicative and is kept as-is.

Also not duplicative: the `'BEAM Annotation'` (System, Context, Note) and `'BEAM Risk'` (Risk, RiskSource, Consequence, Impact, RiskControl) palette groups — these have no T4B equivalent at all, so they're genuine additions, not copies.

## Decision

Remove only the duplicate `'BEAM Concepts'` palette entries and group. Keep the BEAM View toggle and the BEAM Annotation/Risk groups.

## Changes

1. **`Boxology-Interface/src/data/shape.ts`** — delete the `'BEAM Concepts'` block of shape entries (the ones duplicating `name`s already present under `'Data & Information'`, `'Actors & Entities'`, `'AI & Models'`, `'Processes & Actions'`).
2. **`Boxology-Interface/src/components/LeftSidebar.tsx`** — remove `'BEAM Concepts'` from the `categoryOrder` array (currently line 28).
3. No changes needed to `GoDiagram.tsx`, `beamStyles.ts`, `Toolbar.tsx`, or the KG export path — the BEAM View toggle keys off `type`/`name`, which is unaffected by removing the duplicate palette entries (those types still exist via their original T4B palette group).

## Testing

- Manual: confirm the left sidebar no longer shows a `'BEAM Concepts'` section, and that dragging a plain T4B shape (e.g. `Model`) then toggling BEAM View still recolors it correctly per `beamStyleMap`.
- If `tests/e2e/beam-annotation.spec.ts` or other new specs reference the removed palette group/shape names directly, update them to use the remaining T4B-grouped equivalents.

## Non-goals

- Not touching BEAM Annotation/Risk palette groups (not duplicates).
- Not touching the BEAM View toggle mechanism itself.
- Not a rename/relabel exercise — straightforward deletion.
