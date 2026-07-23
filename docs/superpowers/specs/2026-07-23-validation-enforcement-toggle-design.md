# Validation Enforcement Toggle — Design

**Date:** 2026-07-23
**Status:** Approved
**Branch:** `feature/validation-enforcement-toggle`

## Problem

Drawing a link fires the `LinkDrawn` listener in
`Boxology-Interface/src/plugin/GoJSBoxologyValidation.ts` (`setupDiagramValidation`),
which immediately deletes the link in two cases:

1. **Rule-table check** — the from→to node-name pair is not in `validNext`
   (alert: "Invalid connection. Edge removed.")
2. **Cardinality check** — a process node (Train / Engineer / Transform / Deduce)
   would get a second output edge to Symbol / Model / Data

This hard enforcement sometimes prevents the user from building the diagram they
need (and therefore from generating the KG), because edges they intend to keep
are auto-removed at draw time with no way to opt out.

## Decision

Add a user-facing toggle that turns the two edge-removal rules on or off.

- **Scope:** toggle disables both edge-removal rules. The same-name/same-label
  node auto-merge in the same listener stays **always on**. The report-only
  validators (`validateGoJSDiagram`, `validateEntireDiagram`, "Check Validation!"
  button) are untouched and still report all issues regardless of the toggle.
- **Off behavior:** silent — invalid edges are simply kept. No popup, no toast,
  no special styling. The Validate button remains the way to see issues.
- **UI:** a toggle button in the main toolbar next to "Check Validation!".
  States: `🛡️ Rules: ON` (filled, dark blue `#060771`, matching the Validate
  button) / `🛡️ Rules: OFF` (grey outline). Tooltip explains that OFF allows
  drawing any edge without auto-removal.
- **Persistence:** localStorage key `enforceValidation`. Default **ON**;
  only the stored string `"false"` turns it off on load.
- **Backend/KG:** no changes. KG generation never checked validation
  server-side; the blocker was purely client-side edge deletion.

## Implementation (Approach A — module-level flag)

Chosen over prop-injection (threading a getter through App → GoDiagram →
setup, three files for the same behavior) and listener re-registration
(risk of duplicate listeners). Module-global state is acceptable because the
app has exactly one diagram instance.

### `GoJSBoxologyValidation.ts`

```ts
let enforceValidation = true;
export function setValidationEnforcement(enabled: boolean) {
  enforceValidation = enabled;
}
```

In the `LinkDrawn` listener, wrap the rule-table block and the cardinality
block in `if (enforceValidation) { ... }`. The listener stays registered once
at diagram init and reads the flag at run time — no re-wiring on toggle.

### `App.tsx`

```ts
const [enforceValidation, setEnforceValidation] = useState(
  () => localStorage.getItem('enforceValidation') !== 'false'
);

useEffect(() => {
  localStorage.setItem('enforceValidation', String(enforceValidation));
  setValidationEnforcement(enforceValidation);
}, [enforceValidation]);
```

Pass `enforceValidation` and a toggle callback to `Toolbar`.

### `Toolbar.tsx`

New props `enforceValidation: boolean` and `onToggleEnforceValidation: () => void`.
Render the toggle button immediately after "Check Validation!" using the
existing `simpleButtonStyle` conventions.

## Testing

Manual verification (no unit-test harness for GoJS listeners; e2e specs exist
but this is a small UI behavior):

1. Toggle OFF → draw a formerly forbidden edge (e.g. Symbol → Model) → edge stays, no alert.
2. Toggle OFF → give a process node a second output → edge stays.
3. Toggle ON → same actions → edge removed with the existing alerts.
4. Reload the page → toggle state persists; fresh browser profile defaults to ON.
5. "Check Validation!" still reports invalid connections in both toggle states.
