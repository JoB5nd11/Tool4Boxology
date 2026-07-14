# Diagram Session Persistence

**Date:** 2026-07-14
**Status:** Approved

## Problem

Refreshing the browser destroys every diagram in the editor. `App.tsx` holds all
diagram state in memory — `pages` (nodes and links per page), `containers`,
`customContainerShapes`, and `customGroups` — and none of it is persisted. The
only values that survive a reload today are UI preferences (`leftCollapsed`,
`rightCollapsed`, `hasSeenInstructions`) and `userId`.

There is no Save concept in the app, so an accidental `F5` or a tab close is
unrecoverable data loss.

A second, latent problem makes this worse: `pages` does not track the canvas.
`updateCurrentPage()` is only called on page switch, page add, export, and KG
creation. Between those moments the live GoJS model in `diagramRef.current` is
the sole source of truth, and `pages` is stale.

## Goals

1. Warn before an accidental refresh or tab close discards unsaved work.
2. Recover the work anyway if the user confirms the dialog, the tab crashes, or
   the browser is killed.

## Non-goals

- Version history / rewind to an arbitrary earlier snapshot.
- Cross-tab coordination (see Known limitations).
- Server-side persistence of drafts.
- Replacing the existing export/save flows.

## Design

### Storage layer — `src/utils/sessionStorage.ts`

The only module that knows `localStorage` exists. Keeping the storage API behind
this boundary means a later move to IndexedDB (if diagrams outgrow the ~5MB
quota) is a one-file change.

```ts
export const SESSION_KEY = 't4b:session:v1';
export const SCHEMA_VERSION = 1;

export type SessionSnapshot = {
  schemaVersion: number;
  savedAt: number;
  pages: PageData[];
  currentPageId: string;
  containers: string[];
  customContainerShapes: Record<string, any[]>;
  customGroups: Record<string, any[]>;
};

export function loadSession(): SessionSnapshot | null;
export function saveSession(s: SessionSnapshot): { ok: true } | { ok: false; reason: 'quota' | 'error' };
export function clearSession(): void;
```

`loadSession()` returns `null` on a missing key, a JSON parse failure, or an
unrecognized `schemaVersion`. A corrupt or future-versioned snapshot degrades to
a blank canvas; it never throws.

`saveSession()` never throws either. A `QuotaExceededError` is reported as
`{ ok: false, reason: 'quota' }` so the UI can tell the user autosave is off.

### Persistence hook — `src/hooks/useSessionPersistence.ts`

Owns the debounce, the dirty flag, and the unload guard.

```ts
useSessionPersistence(snapshotSource: () => Omit<SessionSnapshot, 'schemaVersion' | 'savedAt'>, deps)
  => { isDirty, markDirty, markSaved, autosaveFailed }
```

- **Debounce:** writes 800ms after the last change, so a drag produces one write,
  not fifty.
- **Flush on exit:** a `pagehide` handler writes any pending debounced snapshot
  synchronously, so the last <800ms of edits survive even when the user confirms
  the leave dialog. (`pagehide` is used rather than `unload`, which is
  unreliable and deprecated in modern browsers.)
- **Unload guard:** a `beforeunload` handler calls `preventDefault()` only while
  `isDirty` is true.

The autosave and the unload guard live in one hook deliberately: they share the
dirty flag and the flush-on-exit path, and splitting them would mean threading
that state through two hooks for no gain.

### Model change listener — `GoDiagram.tsx`

`GoDiagram` gains one optional prop:

```ts
onModelChange?: (nodeDataArray: any[], linkDataArray: any[]) => void;
```

Registered inside the existing setup effect via
`diagram.addModelChangedListener(e => { if (e.isTransactionFinished) ... })`.

This is the load-bearing change. It makes `pages` track the canvas continuously
instead of lagging it, which is what lets autosave, the dirty flag, and the
existing export paths all read from one trustworthy source. The existing
`updateCurrentPage()` calls become redundant but harmless and are left in place
to keep the diff narrow.

### Dirty tracking

The app has no Save, so the export actions are the save points. `markSaved()` is
called on **success only** from:

- `handleExport()` — any kind (`png` / `jpg` / `json` / `dot` / `beam`)
- `handleFileOperation('save')`
- `handleCreateKG()`

A failed export leaves the session dirty, which is correct.

Autosave keeps running after a save point. The dirty flag only controls whether
the leave-warning fires.

### Restore flow

On mount, `loadSession()` runs inside lazy `useState` initializers, so state is
hydrated before the first render commits and there is no blank-canvas flash. The
existing `useEffect` at `App.tsx:127` already rebuilds the GoJS model from
`currentPage`, so the canvas repaints with no change needed there.

If a snapshot exists and has at least one non-empty page, a MUI `<Snackbar>`
appears:

> Restored your last session · **Start fresh**

**Start fresh** calls `clearSession()` and resets to a single empty page. The
snapshot is *not* deleted on restore, so reloading twice in a row still works.

MUI 7 is already a dependency; `<Snackbar>` is used rather than adding a toast
library. (The app currently uses raw `alert()` — this introduces the first
non-blocking notification, but does not attempt to convert the existing alerts.)

## Data flow

**Edit → save.** GoJS transaction finishes → listener fires → `App` merges nodes
and links into the current page in `pages`, marks dirty → debounced writer fires
800ms later → `saveSession()` serializes the whole snapshot.

Changes to `containers`, `customContainerShapes`, and `customGroups` also mark
dirty and trigger the same writer — losing the custom palette on refresh is the
same bug.

**Refresh → restore.** Mount → `loadSession()` → hydrate `pages`,
`currentPageId`, `containers`, `customContainerShapes`, `customGroups` → canvas
repaints → Snackbar.

**Save point → clean.** Successful export / save / KG create → `markSaved()` →
`isDirty = false` → no leave-warning until the next edit.

## Edge cases

| Case | Behavior |
|---|---|
| Quota exceeded | Write fails, `autosaveFailed` set, persistent warning Snackbar tells the user autosave is off and to export. Leave-guard stays armed. Data is never lost silently. |
| Corrupt / future snapshot | `loadSession()` returns `null`, app opens blank. No crash. |
| Import / open file | Replaces `pages` wholesale and marks dirty, so the imported diagram is autosaved immediately. |
| Empty session | No snapshot written when every page is empty; no Snackbar on load. |
| Two tabs | Last writer wins. See Known limitations. |

## Known limitations

- **Multi-tab:** a single storage key means the last tab to write wins. Real, but
  not the scenario being solved, and locking would be disproportionate. Documented
  rather than fixed.
- **`beforeunload` text is not customizable.** Browsers show their own generic
  "Leave site?" copy; we cannot say "you have 3 unsaved diagrams". Chrome also
  suppresses the dialog entirely without prior page interaction, which in
  practice always exists here.

## Two things implementation turned up

Both were caught by the e2e tests, and both are worth knowing before touching
this code again.

**1. The `go.Diagram` instance is not stable.** `GoDiagram`'s setup effect
rebuilds the diagram whenever `containers` or `customGroups` change — and twice
on mount under React StrictMode. Each rebuild starts with an empty model. A
"have I already loaded this page?" guard keyed on the page id alone therefore
skips the reload and leaves a blank canvas. The load effect must track *which
diagram instance* holds *which page* (`loadedRef`), and `GoDiagram` must announce
each rebuild via `onDiagramInit` so the effect re-runs at all.

**2. A committed GoJS transaction does not imply a model edit.** Two startup
transactions fire before the user touches anything:

- `model.commit()` closes a transaction even when its body changed nothing — the
  BEAM-view effect does exactly this on mount.
- GoJS's own setup property assignments (`padding`, `nodeTemplate`, `grid`,
  `initialContentAlignment`, `linkTemplate`) land inside the first committed
  transaction.

Both would mark a freshly loaded session dirty and pop the leave-warning on every
refresh. Filtering on `changes.count === 0` does *not* help — the setup
transaction reports five changes. The reliable discriminator is
`ChangedEvent.model`: model-data changes carry `.model`, diagram-property changes
carry `.diagram`. The listener only treats a transaction as an edit when at least
one of its changes has `c.model !== null`.

## Testing

Playwright 1.61 and `playwright.config.ts` are already present, with e2e specs
under `Boxology-Interface/tests/e2e/`. (Note: `npm test` is still an `exit 0`
stub and `CLAUDE.md` incorrectly claims no test suite is configured; specs run
via `npx playwright test`.)

New spec: `tests/e2e/session-persistence.spec.ts` — 7 tests:

1. A node drawn on the canvas survives a reload.
2. The restore notice appears after a reload.
3. "Start fresh" clears the session, empties the canvas, and stays gone across a
   further reload.
4. A corrupt `localStorage` value loads a blank canvas instead of crashing.
5. A snapshot with an unknown `schemaVersion` is ignored.
6. `beforeunload` is cancelled only once there are unsaved edits.
7. The autosaved snapshot carries pages, `currentPageId`, and palette state, and
   its `currentPageId` names a page that exists.

The native "Leave site?" dialog cannot be observed in Playwright, so test 6
asserts the guard's actual contract instead: dispatching a cancelable
`beforeunload` and checking `defaultPrevented`.

Not covered: the quota-exceeded path (hard to provoke deterministically) and
multi-tab behavior (a known limitation, not a supported case).
