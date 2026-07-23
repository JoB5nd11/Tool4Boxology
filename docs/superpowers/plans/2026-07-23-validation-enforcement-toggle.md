# Validation Enforcement Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted toolbar toggle that disables the two automatic edge-removal validation rules so users can draw any edge when enforcement is off.

**Architecture:** A module-level boolean flag in the GoJS validation plugin, read at run time by the already-registered `LinkDrawn` listener. App owns the React state (initialized from localStorage, default ON) and syncs it to the plugin via an exported setter. Toolbar renders the toggle button next to "Check Validation!".

**Tech Stack:** React 19, TypeScript 5.8, GoJS 3.1, Vite 7. No backend changes.

**Spec:** `docs/superpowers/specs/2026-07-23-validation-enforcement-toggle-design.md`

## Global Constraints

- localStorage key is exactly `enforceValidation`; default is ON — only the stored string `"false"` turns enforcement off on load.
- The same-name/same-label auto-merge in the `LinkDrawn` listener stays **always on**, regardless of the toggle.
- Report-only validators (`validateGoJSDiagram`, `validateEntireDiagram`) must not change.
- When enforcement is OFF, invalid edges are kept **silently** — no alert, no toast, no styling.
- All work happens in worktree `C:\Users\Guntur\Documents\PROJECT\Tool4Boxology\wt-validation-toggle`, branch `feature/validation-enforcement-toggle`. Frontend paths below are relative to `Boxology-Interface/`.
- There is no unit-test harness for GoJS listeners (`npm test` is an `exit 0` stub — do not use it). Each task is verified by `npm run build` (type-checks via `tsc -b`) plus the manual browser checks in Task 3.

---

### Task 1: Enforcement flag in the validation plugin

**Files:**
- Modify: `Boxology-Interface/src/plugin/GoJSBoxologyValidation.ts:126-165` (the `setupDiagramValidation` function)

**Interfaces:**
- Consumes: nothing new.
- Produces: `export function setValidationEnforcement(enabled: boolean): void` — called by App (Task 2). Module keeps a private `let enforceValidation = true` that the `LinkDrawn` listener reads at run time.

- [ ] **Step 1: Add the flag and setter**

In `GoJSBoxologyValidation.ts`, insert immediately above the `// --- Prevent invalid edges and merge on link creation ---` comment (currently line 125):

```ts
// --- Enforcement toggle ---
// When false, the two edge-removal rules below are skipped: users may draw
// any edge. Auto-merge of identical nodes and the report-only validators
// (validateGoJSDiagram / validateEntireDiagram) are unaffected.
let enforceValidation = true;

export function setValidationEnforcement(enabled: boolean) {
  enforceValidation = enabled;
}
```

- [ ] **Step 2: Gate the two edge-removal blocks**

Inside the `LinkDrawn` listener in `setupDiagramValidation`, wrap the rule-table check and the cardinality check in a single `if (enforceValidation)` block. The listener body becomes:

```ts
  diagram.addDiagramListener("LinkDrawn", e => {
    const link = e.subject as go.Link;
    if (!link.fromNode || !link.toNode) return;

    const fromName = getNodeName(link.fromNode);
    const toName = getNodeName(link.toNode);

    if (enforceValidation) {
      // Prevent invalid connection by rule table
      if (!validNext[fromName] || !validNext[fromName].includes(toName)) {
        diagram.model.startTransaction("remove invalid link");
        (diagram.model as go.GraphLinksModel).removeLinkData(link.data);
        diagram.model.commitTransaction("remove invalid link");
        alert("Invalid connection. Edge removed.");
        return;
      }

      // Enforce process output cardinality: exactly one of symbol/model/data
      if (PROCESS_NODES.has(fromName) && OUTPUT_TARGETS.has(toName)) {
        const outCount = countProcessOutputs(link.fromNode);
        if (outCount > 1) {
          diagram.model.startTransaction("enforce process output cardinality");
          (diagram.model as go.GraphLinksModel).removeLinkData(link.data);
          diagram.model.commitTransaction("enforce process output cardinality");
          alert("A process can have exactly one output (symbol, model, or data).");
          return;
        }
      }
    }

    // 🎯 FIXED: Only merge nodes if they have SAME NAME AND SAME LABEL
    const fromLabel = link.fromNode.data.label || "";
    const toLabel = link.toNode.data.label || "";

    if (fromName === toName && fromLabel === toLabel) {
      // Same name AND same label = merge required
      mergeIdenticalNodes(diagram, link.fromNode, link.toNode);
    }
    // If same name but different labels = allow connection (no merge)
  });
```

Only the `if (enforceValidation) { ... }` wrapper and its indentation are new; the inner code is unchanged. The auto-merge block stays **outside** the wrapper.

- [ ] **Step 3: Verify it compiles**

Run (from `Boxology-Interface/`): `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add Boxology-Interface/src/plugin/GoJSBoxologyValidation.ts
git commit -m "feat: add runtime enforcement flag to link validation"
```

---

### Task 2: Toolbar toggle button and App wiring

**Files:**
- Modify: `Boxology-Interface/src/components/Toolbar.tsx:16-67` (props) and `:509-520` (button row)
- Modify: `Boxology-Interface/src/App.tsx:10` (import), inside `function App()` near other state (around line 58+), and the `<Toolbar ...>` element at `:1445-1475`

**Interfaces:**
- Consumes: `setValidationEnforcement(enabled: boolean)` from Task 1 (imported from `./plugin/GoJSBoxologyValidation`).
- Produces: Toolbar props `enforceValidation: boolean` and `onToggleEnforceValidation: () => void` (both required).

- [ ] **Step 1: Add the two props to Toolbar**

In `Toolbar.tsx`, add to the `ToolbarProps` type after `onValidate: () => void;`:

```ts
  /** Whether draw-time edge-removal rules are active. */
  enforceValidation: boolean;
  onToggleEnforceValidation: () => void;
```

Add `enforceValidation,` and `onToggleEnforceValidation,` to the destructured parameter list after `onValidate,`.

- [ ] **Step 2: Render the toggle button**

In `Toolbar.tsx`, immediately after the "Check Validation!" button (`</button>` at line 520), insert:

```tsx
      <button
        onClick={onToggleEnforceValidation}
        style={
          enforceValidation
            ? {
                ...simpleButtonStyle,
                backgroundColor: '#060771',
                color: 'white',
                borderColor: '#060771',
              }
            : {
                ...simpleButtonStyle,
                backgroundColor: '#f8f8f8',
                color: '#888',
                borderColor: '#aaa',
              }
        }
        title={
          enforceValidation
            ? 'Connection rules enforced: invalid edges are removed as you draw. Click to allow any edge.'
            : 'Connection rules OFF: any edge can be drawn. Click to re-enable enforcement.'
        }
      >
        🛡️ Rules: {enforceValidation ? 'ON' : 'OFF'}
      </button>
```

- [ ] **Step 3: Add App state, persistence effect, and props**

In `App.tsx`, extend the existing plugin import (line 10):

```ts
import { validateGoJSDiagram, setValidationEnforcement } from './plugin/GoJSBoxologyValidation';
```

Inside `function App()`, next to the other `useState` declarations, add:

```ts
  // Draw-time edge-removal rules toggle. Default ON; only a stored "false"
  // disables it. Synced to the GoJS validation plugin, persisted per browser.
  const [enforceValidation, setEnforceValidation] = useState(
    () => window.localStorage.getItem('enforceValidation') !== 'false'
  );

  useEffect(() => {
    window.localStorage.setItem('enforceValidation', String(enforceValidation));
    setValidationEnforcement(enforceValidation);
  }, [enforceValidation]);
```

In the `<Toolbar ...>` element (line 1445), add after `onValidate={...}`:

```tsx
        enforceValidation={enforceValidation}
        onToggleEnforceValidation={() => setEnforceValidation(v => !v)}
```

- [ ] **Step 4: Verify it compiles and lints**

Run (from `Boxology-Interface/`): `npm run build`
Expected: success, no TS errors (the required props are now supplied at the single `<Toolbar>` call site).

Run: `npm run lint`
Expected: no new errors in the three touched files (pre-existing warnings elsewhere are out of scope).

- [ ] **Step 5: Commit**

```bash
git add Boxology-Interface/src/components/Toolbar.tsx Boxology-Interface/src/App.tsx
git commit -m "feat: add toolbar toggle for validation enforcement"
```

---

### Task 3: Manual verification in the browser

**Files:** none modified — verification only.

**Interfaces:** exercises the full path: Toolbar button → App state → localStorage + `setValidationEnforcement` → `LinkDrawn` listener.

- [ ] **Step 1: Start the dev server**

From `Boxology-Interface/`: `npm install` (if `node_modules` is absent in this worktree), then `npm run dev`. Open http://localhost:5173.

- [ ] **Step 2: Verify default and OFF behavior**

1. Confirm the toolbar shows `🛡️ Rules: ON` (dark blue) on first load.
2. Drag a **Symbol** node and a **Model** node onto the canvas; draw Symbol → Model. Expected while ON: alert "Invalid connection. Edge removed." and the edge disappears (`Symbol → Model` is not in `validNext`).
3. Click the toggle → button turns grey `🛡️ Rules: OFF`. Draw Symbol → Model again. Expected: edge stays, no alert.
4. Cardinality: add **Train**, **Data**, **Model**; draw Data → Train, Train → Model, Train → Data. Expected while OFF: all edges stay (the second output would be removed when ON).

- [ ] **Step 3: Verify ON behavior restored and reporting unaffected**

1. Click the toggle back to ON. Draw another invalid edge (e.g. a second Symbol → Model between fresh nodes). Expected: removed with alert.
2. With the invalid edges from Step 2 still on the canvas, click "Check Validation!" (validate entire diagram). Expected: report lists the invalid connections — reporting works in both toggle states.

- [ ] **Step 4: Verify persistence**

1. Set the toggle OFF, reload the page. Expected: still OFF.
2. In DevTools console run `localStorage.removeItem('enforceValidation')`, reload. Expected: defaults to ON.

- [ ] **Step 5: Report results**

Record any deviation as a bug to fix before merge. If all checks pass, the feature is complete; no commit in this task.
