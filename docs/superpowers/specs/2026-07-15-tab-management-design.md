# Tab Management: Add Tab + Active-Tab Semantics — Design Spec

**Date:** 2026-07-15
**Status:** Approved (brainstorming)
**Branch:** `feature/example-append-tab` (worktree at `.claude/worktrees/example-append-tab`)

## Problem

Two gaps in the tab bar (tabs are `PageData` objects in `App.tsx`; the active one is `currentPageId`):

1. **You cannot add a tab.** `handleAddNewPage` (`App.tsx:103`) is complete and working, but nothing
   calls it. `App.tsx:1370` carries the comment *"Replace the Add Page button with a Home Page
   button"* — the `+` was deliberately swapped out for a Home Page button, orphaning the handler.
2. **Active-tab semantics are unclear or broken** in three distinct ways: the active tab is nearly
   invisible, export scope is inconsistent and unstated, and undo history dies on every tab switch.

## Base branch

`feature/example-append-tab`, not `main`. On `main` and `worktree-tool4boxology-backlog`,
`RightSidebar.tsx:143` does `setPages([newPage])` — loading an example **replaces** every tab. Only
this branch appends. Multi-tab work belongs on the branch where multiple tabs can coexist. It is
1 commit ahead of `main` and merges back cleanly (verified: zero conflicts).

## Current action scope (as built)

| Action | Scope | Mechanism |
|---|---|---|
| Save (`.boxology`) | active tab | `pages.find(p => p.id === currentPageId)` |
| Export PNG / JPG | active tab | renders the live canvas |
| Export DOT | active tab | reads `diagram.model` |
| Export JSON | **all tabs** | `generateMultiPageRMLExport(pages)` |
| Export BEAM | **all tabs** | `generateMultiPageRMLExport(pages)` |
| Create KG | **all tabs** | `generateMultiPageRMLExport(pages)` |
| Undo / Redo / Validate | active tab | `diagramRef.current` |

The split is intentional, not a bug: a Boxology KG spans multiple diagrams. The defect is that the
scope is **invisible**, not that it is wrong.

## Decisions (from brainstorming)

- **Keep** JSON / BEAM / KG spanning all tabs. Narrowing them to the active tab would break
  multi-page KG semantics and cross-diagram links. Make the scope explicit in the label instead.
- **Keep** the Home Page button. It is pinned right via `marginLeft: 'auto'`; `+` sits next to the
  tabs. Both fit — the original swap was unnecessary.
- **Fix** undo history per tab (see §4). This is the only lifecycle-touching change.

## Implementation

### 1. `+` button (`App.tsx`, tab bar ~line 1305–1370)

Render a `+` button directly after the `pages.map(...)` list, before the Home Page button. `onClick`
→ the existing `handleAddNewPage`. No changes to the handler itself; it already saves the current
canvas, appends the page, and sets `currentPageId` to the new page (making it active — the desired
behavior). `aria-label="Add tab"`, `title="Add a new diagram tab"`, `data-testid="add-tab"`.

**Naming collision fix.** `handleAddNewPage` names pages `` `Diagram ${pages.length + 1}` ``. With
tabs `Diagram 1/2/3`, closing `Diagram 2` leaves length 2, so the next add produces a **second**
`Diagram 3`. Replace with a max-suffix scan: parse existing names matching `/^Diagram (\d+)$/`, take
the highest, add 1. Names are cosmetic (`page.id` is a uuid), so this is a clarity fix, not a
correctness one.

### 2. Active-tab styling (`App.tsx`, tab button styles)

Active is `#E3E3E3`, inactive `#e0e0e0` — a 3-value difference, effectively invisible; only the blue
bold text distinguishes them. Change to:

- **Active** — background `#ffffff`, 3px top border `#110969` (the existing active text blue),
  existing blue bold text, retain the current shadow.
- **Inactive** — background `#cfd3d8`, 3px transparent top border (so text doesn't shift by 3px on
  activation), normal weight, existing `#000` text.

Requirement: which tab is active must be readable at a glance, since actions follow it.

### 3. Export scope labels (`components/Toolbar.tsx`)

The three all-tabs actions state their scope in the label, with a live count:

- `Export JSON (all N tabs)`
- `Export BEAM (all N tabs)`
- `Create KG (all N tabs)`

When `N === 1`, drop the suffix — "all 1 tabs" is noise. Save / PNG / DOT get **no** label; the
canvas already shows their scope. This is label-only; no behavior changes.

### 4. Per-tab undo history (`App.tsx`, load effect ~line 188–202)

**The bug.** `handlePageSwitch` → load effect → `diagram.model = new go.GraphLinksModel(...)`. Per
GoJS's own typings (`go.d.ts:4387`): *"Replacing a Diagram.model copies certain properties from the
old UndoManager to the new one, including isEnabled and maxHistoryLength."* It copies **properties,
not history**. Every tab switch hands the diagram a fresh, empty UndoManager. Edit tab A, visit tab
B, return to A → Ctrl+Z does nothing. Content is safe (saved into `pages` before the switch); the
edit history is gone.

**The fix.** Cache one live model per page:

```ts
const modelsRef = useRef<Map<string, go.GraphLinksModel>>(new Map());
```

- **Switch to a page** — reuse `modelsRef.current.get(pageId)` if present; otherwise construct from
  the page's `nodeDataArray`/`linkDataArray` and cache it. Undo history lives on the model, so it
  survives the round trip.
- **Close a tab** (`handleClosePage`) — `modelsRef.current.delete(pageId)`.
- **Open a file / Start Fresh** (`handleStartFresh`, `handleFileOperation('open')`,
  `buildPagesFromModel`) — `modelsRef.current.clear()`. These rebuild `pages` wholesale; a surviving
  cached model would resurrect deleted content. **This is the sharp edge of this change.**

`pages` state remains the source of truth for save/export; only model lifecycle changes.

**Why this is safe with the existing listener:** `GoDiagram.tsx:1099` registers via
`diagram.addModelChangedListener` — diagram-level, not model-level. GoJS transfers it across model
replacement, so reusing cached models needs no listener re-wiring.

**Preserve existing invariants:** `isLoadingPageRef` must still gate `handleModelChange` so a load
isn't recorded as an edit; `loadedRef` still guards redundant reloads. The effect's existing comment
warns that reloading mid-edit blows away selection and scroll position — reusing a cached model
should *improve* this, but it must be verified, not assumed.

## Testing

Playwright is configured (`playwright.config.ts`, `tests/e2e/`, run via `npx playwright test`).

> **Note:** `CLAUDE.md` claims *"No test suite is configured"*. That is false and should be corrected
> — `npm test` is an `exit 0` stub, but Playwright 1.61 and real specs exist.

New spec `tests/e2e/tab-management.spec.ts`:

1. `+` appends a tab and makes it active (active styling asserted on the new tab).
2. Add 3 tabs → close the middle → add again → no duplicate name.
3. **Undo survives a tab switch**: edit tab A → switch to B → switch back to A → Ctrl+Z reverts the
   edit. *This fails on the current code* — it is the regression test for §4.
4. A closed tab leaves no residue: edit tab B → close it → add a new tab → the new tab's canvas is
   empty and Ctrl+Z on it does not replay the closed tab's edit.
5. Export labels show the correct count and drop the suffix at `N === 1`.

Existing `example-append-tab.spec.ts` and `beam-export.spec.ts` must stay green — the latter covers
the all-tabs BEAM path this spec deliberately preserves.

## Risk

§§1–3 are low-risk, self-contained UI work and could land alone. **§4 carries most of the risk** — it
is the only change touching diagram-model lifecycle, which is where this codebase's subtle state
bugs live (see the load effect's existing warnings about selection/scroll loss). The staged
fallback, if §4 destabilizes: ship §§1–3, spec §4 separately.

## Out of scope

**Branch consolidation.** Merging the unmerged branches back to `main` is a separate spec —
planning only, no execution, nothing touching `main` (per the user's standing isolation
preference). Summary of what that spec must resolve:

- `feature/example-append-tab` (1 commit) merges to `main` **cleanly**.
- `worktree-tool4boxology-backlog` (13 commits) has **16 conflicts**, of which:
  - **6 are noise** — `__pycache__/*.pyc` is tracked in git; the backlog branch deletes it and adds
    a `.gitignore` while `main` keeps modifying it.
  - **The rest are substantive** — `main` and the backlog branch hold *rival independent
    implementations of overlapping risk features* (`main`: inline risk-class tags + subtype badge;
    backlog: Risk/Risk Control marker badge + context-menu wiring + `riskMarker` rdf:type export).
    `beam_annotation_triples.py` and three BEAM e2e specs conflict **add/add**. A human must decide
    which risk model wins.
- `main`'s working tree is currently **dirty** (uncommitted edits to `App.tsx`, `ContextMenu.tsx`,
  `GoDiagram.tsx`, `GoJSBoxologyValidation.ts`), unattributed to any branch. Triage before merging.
- Four branches (`beam-export-wip`, `feature/inline-risk-tags`, `feature/risk-subtype-selector`,
  `feature/session-persistence`) are **already merged** into `main`; their worktrees are stale and
  can be pruned.
