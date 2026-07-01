# JSON Reload — Clarify, Don't Reconstruct

**Date:** 2026-07-01
**Status:** Approved for planning

## Context

Status backlog listed "Loading exported JSON file" as not working. Investigation found this is a schema mismatch between two unrelated JSON formats, not a bug in either:

- **Save/Open** (`.boxology` files, `App.tsx:271` `handleFileOperation`) round-trip the raw GoJS model shape (`nodeDataArray`/`linkDataArray` with full geometry — position, size, color, shape) — this already works correctly today.
- **Export → JSON** (`App.tsx:503`, `case 'json'`) produces an unrelated KG-interchange shape: `{metadata, boxologies: [{id, label, DesignPattern, annotations, annotationLinks}]}`. `DesignPattern` only stores semantic references (id/name/label per input/output/process) — no geometry at all. "Open" doesn't understand this shape and was never meant to.

Considered building reconstruction (synthesizing a diagram, including auto-generated positions, from the `DesignPattern`-shaped export) but decided against it — it would require a real auto-layout algorithm as a prerequisite (overlapping with the separate, lower-priority "auto-arrangement" backlog item) for a format that was never designed to be reloaded. Simpler to make the existing correct mechanism (Save/Open) discoverable instead.

## Decision

No reconstruction code. Clarify the UI so users reach for the right export for the right purpose.

## Changes

1. **Export menu labels** (wherever the export dropdown is rendered, e.g. `Toolbar.tsx`) — rename the `'json'` export option from generic "JSON" to something explicit about its purpose, e.g. **"Export KG JSON"**, distinct from **"Save"** (`.boxology`). Add a short tooltip/title attribute: "For backend KG ingestion — to reload a diagram for editing, use Save/Open instead."
2. **`App.tsx`'s `'json'` export case** — no logic changes.
3. Optional: on the "Open" file picker, if the selected `.json` file is detected to have a `boxologies` key (the export shape) instead of `nodeDataArray`, show a clear error instead of a generic parse failure: "This looks like an exported KG JSON file, not a saved diagram. Use a `.boxology` file (or JSON saved via Save) to reopen a diagram."

## Non-goals

- No diagram reconstruction from the `Export → JSON` / `DesignPattern` shape.
- No changes to `Save`/`Open`'s existing `.boxology` round-trip — already correct.
- Auto-arrangement (#17) stays a separate, independent, not-yet-designed backlog item.

## Testing

- Manual: confirm the export dropdown clearly distinguishes "Save" (reloadable) from "Export KG JSON" (not reloadable), and that opening an "Export KG JSON" file via "Open" now shows the clarified error message instead of a silent/confusing failure.
