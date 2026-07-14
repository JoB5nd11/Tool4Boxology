# Risk-Class Subtype Selector — Design Spec

**Date:** 2026-07-14
**Status:** Approved (brainstorming, corrected concept)
**Branch:** `feature/risk-subtype-selector` (worktree off `main`)

## Problem

The five BEAM risk elements (Risk, Risk Source, Consequence, Impact, Risk Control) are separate
draggable cards. Users want to reclassify a risk card in place via a small subtype badge on top of
it — the same cascading dropdown a regular component's type badge uses (e.g. Model ▸ NeuralModel ▸
LLM) — **and this badge must appear only on risk elements, not on every component.**

> Supersedes the earlier "inline risk tags on every component" approach, which put a `+ risk`
> badge on all elements. That was the wrong concept and has been reverted.

## Decisions (from brainstorming)

- The badge appears on **all five** risk-class cards (not other beamCard nodes: System/Context/Note,
  and not regular components).
- The dropdown picks among the **BEAM risk classes** themselves — Risk / Risk Source / Consequence
  (▸ Impact) / Risk Control — following the ontology hierarchy. It *reclassifies* the card.

## Implementation (`src/GoDiagram.tsx` only)

### A. Risk-class metadata (module scope)
`RISK_CLASSES` (value, label, colour, stroke — colours mirror `data/shape.ts`), derived
`RISK_CLASS_SET` / `RISK_CLASS_LABEL` / `RISK_CLASS_STYLE`, and a cascading `riskClassTree`:
```
RiskSource, Risk, Consequence: { Impact }, RiskControl
```

### B. Badge in the `beamCard` template
An `Auto` panel `RISK_CLASS_BADGE`, aligned above the card (`Spot.Top` / focus `Spot.Bottom`),
`visible` bound to `name ∈ RISK_CLASS_SET` so only risk elements show it. Contents: a class-coloured
dot, the friendly class label (bound to `name`), and a dropdown triangle. Click → `showRiskClassSelector`.

### C. Cascading selector (`showRiskClassSelector` + `buildRiskMenu`)
Mirrors the existing `showTypeSelector` / `buildTypeMenu` (DOM dropdown, hover submenus, close on
outside-click/Escape) but uses friendly labels and, on selection, **reclassifies** the node inside a
transaction: sets `name` + `type` to the chosen class and restyles `color` + `stroke`. The card's
header band (`color`) and border (`stroke`) update immediately; the user's `label`/`subtext` text is
left untouched.

### D. KG export
No change. The export already keys a beamCard's class off `name`
(`exportHelpers.ts` → `beam_annotation_triples.py` `_TYPE_MAP[name]`), so reclassifying via the badge
flows through to the correct `beamr:` class automatically.

## Scope / edge cases
- System / Context / Note beamCards and all regular components are unaffected (badge hidden).
- BEAM view re-skin is unchanged; reclassify sets colours directly like a normal style edit.
- No new persisted fields; `name` already persists in node data.

## Verification (no test suite in repo)
Drive the app (Playwright against the exposed `window.__gojs_diagram`): confirm the badge renders on
a risk card and NOT on a regular component or a Note card; switching class updates the badge label,
dot, header colour and border; and a KG export of the reclassified card yields the new `beamr:` type.
