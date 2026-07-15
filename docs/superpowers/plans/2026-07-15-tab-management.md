# Tab Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the ability to add a diagram tab, make the active tab visible, state export scope in the menu, and stop tab switches from wiping undo history.

**Architecture:** All work is in the React layer of `Boxology-Interface`. Tabs are `PageData` objects in `pages` state in `App.tsx`; `currentPageId` is the active tab. Tasks 1–3 are self-contained UI changes. Task 4 changes GoJS model lifecycle: instead of constructing a fresh `go.GraphLinksModel` on every tab switch (which hands the diagram an empty UndoManager), cache one live model per page in a ref so undo history rides along with the tab.

**Tech Stack:** React 19, TypeScript 5.8, Vite 7, GoJS 3.1, Playwright 1.61.

**Spec:** `docs/superpowers/specs/2026-07-15-tab-management-design.md`

## Global Constraints

- **Branch:** `feature/example-append-tab`, worktree `.claude/worktrees/example-append-tab`. Never commit to `main`.
- **All commands run from `Boxology-Interface/`.**
- **Tests:** `npx playwright test` (NOT `npm test` — that is an `exit 0` stub). `playwright.config.ts` auto-starts Vite on port 3000 via its `webServer` block; do not start a dev server manually.
- **Do not change** the all-tabs scope of Export JSON / Export BEAM / Create KG. They span every tab by design (multi-page KG semantics). Only their labels change.
- **Keep the Home Page button.** It is pinned right via `marginLeft: 'auto'`; the `+` goes before it.
- `pages` state stays the single source of truth for save/export. Task 4 changes model lifecycle only.
- Existing specs `tests/e2e/example-append-tab.spec.ts` and `tests/e2e/beam-export.spec.ts` must stay green.

## File Structure

- **Modify** `Boxology-Interface/src/App.tsx` — tab bar JSX, page-naming helper, model cache, passes `pageCount` to Toolbar. This file is already large (~1500 lines) and owns diagram+page state; the codebase's established pattern is to keep that state here, so this plan does not restructure it.
- **Modify** `Boxology-Interface/src/components/Toolbar.tsx` — new `pageCount` prop, export scope labels.
- **Create** `Boxology-Interface/tests/e2e/tab-management.spec.ts` — all new e2e coverage.

---

### Task 1: Add-tab button and non-colliding tab names

**Files:**
- Modify: `Boxology-Interface/src/App.tsx` (add helper near `blankPage` at :29-34; modify `handleAddNewPage` at :103-119; modify tab bar JSX at :1305-1370)
- Test: `Boxology-Interface/tests/e2e/tab-management.spec.ts` (create)

**Interfaces:**
- Consumes: existing `handleAddNewPage`, `pages`, `currentPageId`, `PageData`.
- Produces: `nextDiagramName(existing: PageData[]): string`; `data-testid="add-tab"` on the add button; `data-active={boolean}` on every `data-testid="page-tab"` button (Tasks 2 and 4 both rely on `data-active`).

**Background:** `handleAddNewPage` already exists and works — it saves the current canvas, appends a page, and sets it active. It simply has no caller: `App.tsx:1370` carries the comment *"Replace the Add Page button with a Home Page button"*. This task adds the caller. It also fixes the naming collision: names come from `` `Diagram ${pages.length + 1}` ``, so with tabs `Diagram 1/2/3`, closing `Diagram 2` leaves `length === 2` and the next add produces a **second** `Diagram 3`.

- [ ] **Step 1: Write the failing test**

Create `Boxology-Interface/tests/e2e/tab-management.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

async function dismissModal(page: any) {
  const gotItBtn = page.getByRole('button', { name: /GOT IT/i });
  if (await gotItBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await gotItBtn.click();
    await page.waitForTimeout(500);
  }
}

test.describe('Tab management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);
  });

  test('the + button adds a tab and makes it active', async ({ page }) => {
    const tabs = page.getByTestId('page-tab');
    await expect(tabs).toHaveCount(1);

    await page.getByTestId('add-tab').click();
    await page.waitForTimeout(500);

    await expect(tabs).toHaveCount(2);
    // The new tab is the active one; the old tab is not.
    await expect(tabs.nth(1)).toHaveAttribute('data-active', 'true');
    await expect(tabs.nth(0)).toHaveAttribute('data-active', 'false');
  });

  test('tab names do not collide after closing a middle tab', async ({ page }) => {
    const tabs = page.getByTestId('page-tab');

    await page.getByTestId('add-tab').click();
    await page.getByTestId('add-tab').click();
    await page.getByTestId('add-tab').click();
    await page.waitForTimeout(500);
    await expect(tabs).toHaveCount(4);

    // Close the middle tab (index 2) via its × affordance.
    await tabs.nth(2).getByText('×').click();
    await page.waitForTimeout(500);
    await expect(tabs).toHaveCount(3);

    await page.getByTestId('add-tab').click();
    await page.waitForTimeout(500);
    await expect(tabs).toHaveCount(4);

    const names = await tabs.allInnerTexts();
    const cleaned = names.map((n) => n.replace(/×/g, '').trim());
    expect(new Set(cleaned).size).toBe(cleaned.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/tab-management.spec.ts --project=chromium`
Expected: FAIL. Both tests error resolving `getByTestId('add-tab')` (timeout waiting for element) — the button does not exist yet.

- [ ] **Step 3: Add the naming helper**

In `App.tsx`, directly after the `blankPage` definition (ends at :34), add:

```ts
// Names are cosmetic (page.id is a uuid), but `Diagram ${pages.length + 1}`
// collides: with Diagram 1/2/3, closing Diagram 2 leaves length 2 and the next
// add produces a second "Diagram 3". Derive from the highest existing suffix.
const nextDiagramName = (existing: PageData[]): string => {
  const used = existing
    .map((p) => /^Diagram (\d+)$/.exec(p.name))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => parseInt(m[1], 10));
  const max = used.length ? Math.max(...used) : 0;
  return `Diagram ${max + 1}`;
};
```

- [ ] **Step 4: Use the helper in `handleAddNewPage`**

In `App.tsx:110-115`, replace the `newPage` literal's `name` line:

```ts
    const newPage: PageData = {
      id: uuidv4(),
      name: nextDiagramName(pages),
      nodeDataArray: [],
      linkDataArray: [],
    };
```

- [ ] **Step 5: Add `data-active` to the tab buttons**

In `App.tsx`, in the `pages.map(...)` tab button (the element already carrying `data-testid="page-tab"` at :1331), add one attribute directly below `data-testid`:

```tsx
            data-active={page.id === currentPageId}
```

- [ ] **Step 6: Add the `+` button**

In `App.tsx`, immediately after the `))}` closing the `pages.map(...)` block and **before** the `{/* Replace the Add Page button with a Home Page button */}` comment at :1370, insert:

```tsx
        <button
          onClick={handleAddNewPage}
          data-testid="add-tab"
          aria-label="Add tab"
          title="Add a new diagram tab"
          style={{
            backgroundColor: '#E3E3E3',
            color: '#110969',
            border: '1px solid #b6b3b3ff',
            padding: '8px 14px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: '700',
            lineHeight: 1,
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.backgroundColor = '#bedaeeff')}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.backgroundColor = '#E3E3E3')}
        >
          +
        </button>
```

Also update the stale comment on the next line — it now describes only the Home button:

```tsx
        {/* Home Page button — pinned right via marginLeft: 'auto' */}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx playwright test tests/e2e/tab-management.spec.ts --project=chromium`
Expected: PASS (2 passed).

- [ ] **Step 8: Commit**

```bash
git add tests/e2e/tab-management.spec.ts src/App.tsx
git commit -m "feat(tabs): restore the add-tab button and fix colliding tab names"
```

---

### Task 2: Make the active tab visible

**Files:**
- Modify: `Boxology-Interface/src/App.tsx` (tab button `style` object at :1320-1336)
- Test: `Boxology-Interface/tests/e2e/tab-management.spec.ts` (append)

**Interfaces:**
- Consumes: `data-active` from Task 1.
- Produces: nothing new.

**Background:** Active is `#E3E3E3`, inactive `#e0e0e0` — a 3-value difference, effectively invisible. Only the blue bold text distinguishes them. If actions follow the active tab, the active tab must be obvious.

- [ ] **Step 1: Write the failing test**

Append inside the `test.describe('Tab management', ...)` block in `tests/e2e/tab-management.spec.ts`:

```ts
  test('the active tab is visually distinct from inactive tabs', async ({ page }) => {
    await page.getByTestId('add-tab').click();
    await page.waitForTimeout(500);

    const tabs = page.getByTestId('page-tab');
    const activeBg = await tabs.nth(1).evaluate((el) => getComputedStyle(el).backgroundColor);
    const inactiveBg = await tabs.nth(0).evaluate((el) => getComputedStyle(el).backgroundColor);
    const activeBorder = await tabs.nth(1).evaluate((el) => getComputedStyle(el).borderTopColor);

    expect(activeBg).toBe('rgb(255, 255, 255)');
    expect(inactiveBg).toBe('rgb(207, 211, 216)');
    expect(activeBg).not.toBe(inactiveBg);
    expect(activeBorder).toBe('rgb(17, 9, 105)');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/tab-management.spec.ts --project=chromium -g "visually distinct"`
Expected: FAIL — `expect(activeBg).toBe('rgb(255, 255, 255)')` receives `rgb(227, 227, 227)`.

- [ ] **Step 3: Restyle the tab button**

In `App.tsx`, in the `pages.map(...)` tab button, replace the `backgroundColor`, `color`, `border`, and `boxShadow` lines of the `style` object (:1321-1324) with:

```tsx
              backgroundColor: page.id === currentPageId ? '#ffffff' : '#cfd3d8',
              color: page.id === currentPageId ? '#110969ff' : '#000',
              border: '1px solid #b6b3b3ff',
              // Transparent (not absent) when inactive, so activating a tab does
              // not shift its text down by 3px.
              borderTop: page.id === currentPageId ? '3px solid #110969' : '3px solid transparent',
              boxShadow: page.id === currentPageId ? '0 2px 6px rgba(0,0,0,0.2)' : 'none',
```

Leave the rest of the `style` object (padding, borderRadius, cursor, fontSize, fontWeight, transition, display, alignItems, gap, minWidth, maxWidth) unchanged.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test tests/e2e/tab-management.spec.ts --project=chromium`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/tab-management.spec.ts src/App.tsx
git commit -m "feat(tabs): make the active tab visually distinct"
```

---

### Task 3: State export scope in the menu

**Files:**
- Modify: `Boxology-Interface/src/components/Toolbar.tsx` (props interface :20-38; destructure :40-62; JSON label :441; BEAM label :479; Create KG label :524)
- Modify: `Boxology-Interface/src/App.tsx` (Toolbar usage — add `pageCount` prop near `onCreateKG={handleCreateKG}` at :1313)
- Test: `Boxology-Interface/tests/e2e/tab-management.spec.ts` (append)

**Interfaces:**
- Consumes: `pages` from `App.tsx`.
- Produces: `ToolbarProps.pageCount: number`.

**Background:** Export JSON, Export BEAM, and Create KG all call `generateMultiPageRMLExport(pages)` — they span **every** tab, by design. Save/PNG/DOT act on the active tab only. The split is correct; the problem is that it is invisible. Label-only change — no behavior changes.

- [ ] **Step 1: Write the failing test**

Append inside the `test.describe('Tab management', ...)` block in `tests/e2e/tab-management.spec.ts`:

```ts
  test('export menu states its scope only when multiple tabs exist', async ({ page }) => {
    // NOTE: match /BEAM Turtle/, never /BEAM/ — a "⬡ BEAM View" toggle button
    // also exists (Toolbar.tsx:570) and /BEAM/ would fail Playwright strict mode
    // with two matches.

    // One tab: no scope suffix — "all 1 tabs" would be noise.
    await page.getByRole('button', { name: /Export/i }).click();
    await expect(page.getByRole('button', { name: /JSON/i })).not.toHaveText(/all /);
    await expect(page.getByRole('button', { name: /BEAM Turtle/i })).not.toHaveText(/all /);
    await expect(page.getByRole('button', { name: /Create KG/i })).not.toHaveText(/all /);

    // Clicking + both closes the menu (the only close path is a mousedown
    // outside — Toolbar.tsx:71-86 registers no Escape handler) and adds a tab.
    await page.getByTestId('add-tab').click();
    await page.waitForTimeout(500);

    // Two tabs: scope is stated with a live count.
    await page.getByRole('button', { name: /Export/i }).click();
    await expect(page.getByRole('button', { name: /JSON/i })).toHaveText(/all 2 tabs/);
    await expect(page.getByRole('button', { name: /BEAM Turtle/i })).toHaveText(/all 2 tabs/);
    await expect(page.getByRole('button', { name: /Create KG/i })).toHaveText(/all 2 tabs/);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/tab-management.spec.ts --project=chromium -g "states its scope"`
Expected: FAIL — the two-tab assertion `toHaveText(/all 2 tabs/)` receives `📄 JSON`.

- [ ] **Step 3: Add the `pageCount` prop to Toolbar**

In `Toolbar.tsx`, in the `ToolbarProps` interface, add directly after `onExportBEAM: () => void;` (:32):

```ts
  /** Number of open tabs. Export JSON/BEAM and Create KG span all of them. */
  pageCount: number;
```

In the destructured parameter list, add after `onExportBEAM,` (:56):

```ts
  pageCount,
```

- [ ] **Step 4: Derive the scope suffix**

In `Toolbar.tsx`, directly after the `const [showExportMenu, setShowExportMenu] = React.useState(false);` line (:63), add:

```ts
  // JSON/BEAM/KG export every tab (generateMultiPageRMLExport). Say so, but stay
  // quiet at one tab — "all 1 tabs" is noise.
  const scopeSuffix = pageCount > 1 ? ` (all ${pageCount} tabs)` : '';
```

- [ ] **Step 5: Apply the suffix to the three all-tabs actions**

In `Toolbar.tsx`, change the JSON item's label (:441) from `📄 JSON` to:

```tsx
              📄 JSON{scopeSuffix}
```

Change the BEAM item's label (:479) from `⬡ BEAM Turtle (.ttl)` to:

```tsx
              ⬡ BEAM Turtle (.ttl){scopeSuffix}
```

Change the Create KG button's label (:524) from `🔗 Create KG` to:

```tsx
          🔗 Create KG{scopeSuffix}
```

Leave `🟦 Graphviz DOT` and `🗂️ PNG` untouched — they are active-tab actions and the canvas already shows their scope.

- [ ] **Step 6: Pass `pageCount` from App**

In `App.tsx`, in the `<Toolbar ... />` usage, add next to `onCreateKG={handleCreateKG}` (:1313):

```tsx
        pageCount={pages.length}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx playwright test tests/e2e/tab-management.spec.ts --project=chromium`
Expected: PASS (4 passed).

- [ ] **Step 8: Verify the type-check is clean**

Run: `npx tsc --noEmit`
Expected: no errors. (`pageCount` is required, so a missed call site fails here.)

- [ ] **Step 9: Commit**

```bash
git add tests/e2e/tab-management.spec.ts src/components/Toolbar.tsx src/App.tsx
git commit -m "feat(tabs): state all-tabs scope in export and Create KG labels"
```

---

### Task 4: Per-tab undo history

**Files:**
- Modify: `Boxology-Interface/src/App.tsx` (add `modelsRef` near `isLoadingPageRef` at :204; load effect at :215-229; `handleClosePage` at :134-144; `handleStartFresh` at :190-200; file-open at :504-505)
- Test: `Boxology-Interface/tests/e2e/tab-management.spec.ts` (append)

**Interfaces:**
- Consumes: `data-active` from Task 1; existing `isLoadingPageRef`, `loadedRef`, `diagramEpoch`.
- Produces: `modelsRef: React.MutableRefObject<Map<string, go.GraphLinksModel>>` (page id → live model).

**Background — the bug:** `handlePageSwitch` → the load effect → `diagram.model = new go.GraphLinksModel(...)`. Per GoJS's own typings (`node_modules/gojs/release/go.d.ts:4387`):

> *"Replacing a Diagram.model copies certain properties from the old UndoManager to the new one, including isEnabled and maxHistoryLength."*

It copies **properties, not history**. Every tab switch hands the diagram a fresh, empty UndoManager. Edit tab A → visit tab B → return to A → Ctrl+Z does nothing. Content is safe (`handlePageSwitch` writes it into `pages` before switching); the edit history is gone.

**The fix:** cache one live `go.GraphLinksModel` per page. Undo history lives on the model, so it survives the round trip.

**This task carries most of the risk in this plan** — it is the only change touching diagram-model lifecycle, and the load effect's existing comments warn that reloading mid-edit destroys selection and scroll position. Preserve these invariants: `isLoadingPageRef` must still gate `handleModelChange` so a load is not recorded as a user edit, and `loadedRef` must still short-circuit redundant reloads.

**Why the diagram-level listener is safe:** `GoDiagram.tsx:1099` registers via `diagram.addModelChangedListener` — diagram-level, not model-level. GoJS transfers it across model replacement, so reusing cached models needs no listener re-wiring.

- [ ] **Step 1: Write the failing test**

Append inside the `test.describe('Tab management', ...)` block in `tests/e2e/tab-management.spec.ts`:

```ts
  // Adds one node in its own transaction — i.e. exactly one undoable edit.
  //
  // Uses the window.__gojs_diagram hook (assigned at GoDiagram.tsx:1073) and
  // model.addNodeData, matching export-robustness.spec.ts. Do NOT drag from the
  // palette: it is an HTML5 draggable div (LeftSidebar.tsx:83-86) and Playwright's
  // dragTo drives mouse events, which do not reliably fire native HTML5 DnD.
  async function addNode(page: any, label: string) {
    await page.evaluate((lbl: string) => {
      const diagram = (window as any).__gojs_diagram;
      if (!diagram) throw new Error('__gojs_diagram missing — GoDiagram did not initialize');
      diagram.startTransaction('add test node');
      diagram.model.addNodeData({
        key: `test_${lbl}`,
        name: 'Data',
        type: 'Data',
        label: lbl,
        shape: 'Rectangle',
        color: '#b7eaffff',
        stroke: '#1E5F8B',
      });
      diagram.commitTransaction('add test node');
    }, label);
    await page.waitForTimeout(300);
  }

  async function nodeCount(page: any) {
    return page.evaluate(() => (window as any).__gojs_diagram?.model?.nodeDataArray?.length ?? -1);
  }

  test('undo history survives a tab switch', async ({ page }) => {
    const tabs = page.getByTestId('page-tab');

    // Edit tab A.
    await addNode(page, 'alpha');
    const afterEdit = await nodeCount(page);
    expect(afterEdit).toBeGreaterThan(0);

    // Switch away to a new tab B, then back to A.
    await page.getByTestId('add-tab').click();
    await page.waitForTimeout(500);
    await tabs.nth(0).click();
    await page.waitForTimeout(500);
    await expect(tabs.nth(0)).toHaveAttribute('data-active', 'true');
    expect(await nodeCount(page)).toBe(afterEdit);

    // Undo must still revert the edit made before the switch.
    await page.getByRole('button', { name: /Undo/i }).click();
    await page.waitForTimeout(500);
    expect(await nodeCount(page)).toBe(afterEdit - 1);
  });

  test('a closed tab leaves no undo residue', async ({ page }) => {
    const tabs = page.getByTestId('page-tab');

    // Edit tab B, then close it.
    await page.getByTestId('add-tab').click();
    await page.waitForTimeout(500);
    await addNode(page, 'beta');
    expect(await nodeCount(page)).toBeGreaterThan(0);
    await tabs.nth(1).getByText('×').click();
    await page.waitForTimeout(500);
    await expect(tabs).toHaveCount(1);

    // A brand-new tab must be empty, and undo must not replay the dead tab's edit.
    await page.getByTestId('add-tab').click();
    await page.waitForTimeout(500);
    expect(await nodeCount(page)).toBe(0);
    await page.getByRole('button', { name: /Undo/i }).click();
    await page.waitForTimeout(500);
    expect(await nodeCount(page)).toBe(0);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx playwright test tests/e2e/tab-management.spec.ts --project=chromium -g "undo"`
Expected: FAIL on `undo history survives a tab switch` — the final assertion gets `afterEdit` instead of `afterEdit - 1`, because the switch back to tab A built a new model with an empty UndoManager, so Undo is a no-op. This is the regression test for the bug. (`a closed tab leaves no undo residue` may already pass; it guards Step 5's cache eviction.)

- [ ] **Step 3: Add the model cache**

In `App.tsx`, directly after the `isLoadingPageRef` declaration (:204), add:

```ts
  // One live model per page. GoJS keeps undo history on the Model's UndoManager,
  // and replacing Diagram.model copies only isEnabled/maxHistoryLength — NOT the
  // history (go.d.ts:4387). Constructing a fresh model per switch therefore wiped
  // undo. Reusing the page's model keeps its history.
  const modelsRef = useRef<Map<string, go.GraphLinksModel>>(new Map());
```

- [ ] **Step 4: Reuse cached models in the load effect**

In `App.tsx`, replace the body of the load effect (:215-229) — keep its dependency array and both existing guards:

```ts
  useEffect(() => {
    const diagram = diagramRef.current;
    if (!diagram || !currentPage) return;
    if (loadedRef.current.diagram === diagram && loadedRef.current.pageId === currentPageId) return;

    loadedRef.current = { diagram, pageId: currentPageId };
    isLoadingPageRef.current = true;

    let model = modelsRef.current.get(currentPageId);
    if (!model) {
      model = new go.GraphLinksModel(currentPage.nodeDataArray, currentPage.linkDataArray);
      modelsRef.current.set(currentPageId, model);
    }
    diagram.model = model;

    // Released on a macrotask: GoJS commits its initial layout transaction
    // after the assignment returns.
    window.setTimeout(() => { isLoadingPageRef.current = false; }, 0);
  }, [currentPageId, currentPage, diagramEpoch]);
```

- [ ] **Step 5: Evict cached models when their page dies**

In `App.tsx`, in `handleClosePage`, add the eviction directly after the `if (pages.length === 1) return;` guard (:135):

```ts
    modelsRef.current.delete(pageId);
```

In `handleStartFresh`, add directly after `clearSession();` (:191):

```ts
    modelsRef.current.clear();
```

In the file-open path, add directly before `setPages(ensuredPages);` (:504):

```ts
        // These pages are rebuilt from the file; a surviving cached model would
        // resurrect content the user just replaced.
        modelsRef.current.clear();
```

- [ ] **Step 6: Drop the cache when the diagram instance is rebuilt**

`GoDiagram` rebuilds the `go.Diagram` instance on container/customGroup changes (and twice under StrictMode), bumping `diagramEpoch`. Models cached against a destroyed diagram must not be reused. In `App.tsx`, add this effect **immediately before** the load effect (effects run in declaration order, so this clears before the load repopulates):

```ts
  // A rebuilt diagram instance invalidates every cached model; the load effect
  // below repopulates the current page's. Costs undo history on palette changes,
  // which are rare — correctness beats history here.
  useEffect(() => {
    modelsRef.current.clear();
  }, [diagramEpoch]);
```

- [ ] **Step 7: Run the full suite**

Run: `npx playwright test --project=chromium`
Expected: PASS — including the new `undo history survives a tab switch`, and the pre-existing `example-append-tab.spec.ts` and `beam-export.spec.ts`.

If `beam-export.spec.ts` regresses, the cache is serving stale data to `generateMultiPageRMLExport`: confirm `handleModelChange` still writes edits into `pages` (`isLoadingPageRef` must be `false` outside loads) — do not "fix" it by narrowing BEAM's all-tabs scope.

- [ ] **Step 8: Verify by hand in the running app**

Run: `npm run dev`, open `http://localhost:5173`, then:
1. Drag a node onto tab 1. Add a tab. Return to tab 1. Ctrl+Z → the node disappears. (Before this task, nothing happened.)
2. Confirm switching tabs does not reset scroll position or drop selection mid-edit — the invariant the load effect's comments warn about.

- [ ] **Step 9: Commit**

```bash
git add tests/e2e/tab-management.spec.ts src/App.tsx
git commit -m "fix(tabs): keep undo history per tab across switches"
```

---

### Task 5: Correct the false test-suite claim in CLAUDE.md

**Files:**
- Modify: `Boxology-Interface/../CLAUDE.md` (repo-root `CLAUDE.md`, "Development Commands" section)

**Interfaces:**
- Consumes: nothing. Produces: nothing. Documentation only.

**Background:** `CLAUDE.md` states *"No test suite is configured (`npm test` exits 0 without running anything)."* The parenthetical is true; the claim is false. Playwright 1.61, `playwright.config.ts`, and specs under `Boxology-Interface/tests/e2e/` exist and run. This misdirects every future agent away from the suite this plan just extended.

- [ ] **Step 1: Replace the claim**

In the repo-root `CLAUDE.md`, replace the line:

```
No test suite is configured (`npm test` exits 0 without running anything).
```

with:

```
Tests are Playwright e2e specs in `Boxology-Interface/tests/e2e/`, run with
`npx playwright test` (`playwright.config.ts` auto-starts Vite on port 3000).
Note `npm test` is an `exit 0` stub and runs nothing — do not use it.
```

- [ ] **Step 2: Commit**

```bash
git add ../CLAUDE.md
git commit -m "docs: correct CLAUDE.md claim that no test suite is configured"
```

---

## Landing

Tasks 1–3 and 5 are independent of Task 4. If Task 4 destabilizes, the spec's stated fallback applies: ship 1–3 + 5 and re-spec Task 4 on its own. `feature/example-append-tab` merges into `main` cleanly (verified), but **do not merge — `main` is off-limits without explicit approval.**

Branch consolidation is deliberately out of scope; see the "Out of scope" section of the spec.
