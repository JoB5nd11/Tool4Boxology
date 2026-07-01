# Tool4Boxology Backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 7 approved 2026-07-01 backlog specs (topology-based pattern extraction, arbitrary/nested clusters, link-type inference, risk marker badge, BEAM UI dedup, JSON reload clarification, auto-arrangement) on top of the existing BEAM WIP already in the working tree.

**Architecture:** React 19 + TypeScript + GoJS 3.1 frontend (`Boxology-Interface/src/`), FastAPI + rdflib backend (`Boxology-Interface/backend/`). Diagram state lives in a GoJS `GraphLinksModel`; export/KG generation flows through `utils/exportHelpers.ts` → `POST /api/beam-export` or `/api/kg` → `kg_creation/` Python pipeline.

**Tech Stack:** React 19, TypeScript 5.8, GoJS 3.1, Vite 7, Playwright (`@playwright/test`) for both e2e and pure-logic unit tests (verified: Playwright's Node test context can import `src/` modules that transitively import `gojs`, so pure-logic functions get real unit tests, not just browser e2e), Python 3.11 (stdlib `unittest`, no pytest installed) for backend logic.

## Global Constraints

- Work happens in the nested repo root `Tool4Boxology/Tool4Boxology/` (the outer `Tool4Boxology/` is a container folder, not the git repo).
- Do not use `git add -A` — stage files explicitly by path (existing repo convention from prior sessions).
- Frontend commands run from `Boxology-Interface/`: `npx playwright test <path>` for tests (auto-starts the Vite dev server per `playwright.config.ts`, no need to start it manually first).
- Python commands run from `Boxology-Interface/src/kg_creation/`: `python <script>.py`.
- Match existing code conventions: GoJS model mutations use `model.setDataProperty(data, key, value)` (not `model.set`), never mutate node/link data objects directly outside a `diagram.startTransaction()`/`commitTransaction()` pair.
- No new npm/pip dependencies — everything in this plan uses packages already installed (`gojs`, `@playwright/test`, Python stdlib).

---

## Task 1: Commit the existing uncommitted WIP as a clean baseline

**Files:**
- Modify: `Boxology-Interface/.gitignore`
- Stage (no content changes): all currently modified/untracked source files listed below

**Interfaces:** N/A (repo hygiene only).

- [ ] **Step 1: Add ignore rules for build/cache artifacts currently polluting `git status`**

Add to `Boxology-Interface/.gitignore`:
```
__pycache__/
*.pyc
test-results/
```

- [ ] **Step 2: Untrack the already-committed `.pyc` files**

```bash
cd Boxology-Interface
git rm -r --cached backend/__pycache__ src/kg_creation/__pycache__ src/kg_creation/in_memory_rdfizer/__pycache__ src/kg_creation/in_memory_rdfizer/test_triples_map/__pycache__
```
Expected: files removed from the index (still present on disk).

- [ ] **Step 3: Stage the real source WIP explicitly**

```bash
git add Boxology-Interface/backend/main.py Boxology-Interface/docker-compose.yml Boxology-Interface/package-lock.json Boxology-Interface/package.json Boxology-Interface/src/App.tsx Boxology-Interface/src/GoDiagram.tsx Boxology-Interface/src/components/LeftSidebar.tsx Boxology-Interface/src/components/RightSidebar.tsx Boxology-Interface/src/components/Toolbar.tsx Boxology-Interface/src/data/beamStyles.ts Boxology-Interface/src/data/shape.ts Boxology-Interface/src/kg_creation/kg_creation.py Boxology-Interface/src/utils/exportHelpers.ts Boxology-Interface/src/utils/shapeMapping.ts Ontology/Tool4BoxologyOntology.ttl Boxology-Interface/src/data/graphragExample.ts Boxology-Interface/src/kg_creation/beam_annotation_triples.py Boxology-Interface/src/kg_creation/beam_enrichment.py Boxology-Interface/src/kg_creation/ontologies/ Boxology-Interface/tests/e2e/beam-annotation.spec.ts Boxology-Interface/tests/e2e/beam-export.spec.ts Boxology-Interface/tests/e2e/debug.spec.ts Boxology-Interface/tests/e2e/export-robustness.spec.ts CLAUDE.md Boxology-Interface/.gitignore docs/superpowers/plans/2026-07-01-tool4boxology-backlog.md
```

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore: commit BEAM WIP baseline (view toggle, annotation/risk export, e2e tests)

Establishes a clean starting point before the 2026-07-01 backlog
implementation work. No behavior change beyond what was already
sitting uncommitted in the working tree.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Verify clean state**

```bash
git status --short
```
Expected: no output (or only unrelated files you did not stage).

---

## Task 2: Topology-based DesignPattern extraction

**Spec:** `docs/superpowers/specs/2026-07-01-topology-based-pattern-extraction-design.md`

**Files:**
- Modify: `Boxology-Interface/src/utils/exportHelpers.ts` (lines 8-11 `PROCESS_TYPES`, lines 44-119 `buildDesignPatternsFromModelData`)
- Test: `Boxology-Interface/tests/e2e/pattern-extraction.spec.ts` (new)

**Interfaces:**
- Consumes: nothing new.
- Produces: `buildDesignPatternsFromModelData(nodeDataArray: any[], linkDataArray: any[]): any[]` — same signature as before, now process-centric instead of cluster-centric. Later tasks (Task 3, 4) depend on this being merged first.

- [ ] **Step 1: Write the failing test**

Create `Boxology-Interface/tests/e2e/pattern-extraction.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import { buildDesignPatternsFromModelData } from '../../src/utils/exportHelpers';

test.describe('buildDesignPatternsFromModelData — topology-based extraction', () => {
  test('unclustered process node still produces a DesignPattern (regression for the GraphRAG bug)', () => {
    const nodeDataArray = [
      { key: 'nlq', name: 'Data', type: 'Data', label: 'Natural Language Question' },
      { key: 'extraction', name: 'Infer', type: 'Infer', label: 'Event ID Extraction' },
      { key: 'event_id', name: 'Data', type: 'Data', label: 'Event ID' },
    ];
    const linkDataArray = [
      { from: 'nlq', to: 'extraction' },
      { from: 'extraction', to: 'event_id' },
    ];

    const patterns = buildDesignPatternsFromModelData(nodeDataArray, linkDataArray);

    expect(patterns.length).toBe(1);
    expect(patterns[0].id).toBe('extraction');
    expect(patterns[0].process.id).toBe('extraction');
    expect(patterns[0].input).toEqual([{ id: 'nlq', name: 'Data', label: 'Natural Language Question' }]);
    expect(patterns[0].output).toEqual([{ id: 'event_id', name: 'Data', label: 'Event ID' }]);
  });

  test('clustered process node keeps the cluster id/label (no regression for existing examples)', () => {
    const nodeDataArray = [
      { key: 'grp1', isGroup: true, category: 'ClusterGroup', label: 'My Cluster' },
      { key: 'a', name: 'Data', type: 'Data', label: 'A', group: 'grp1' },
      { key: 'p', name: 'Train', type: 'Train', label: 'P', group: 'grp1' },
      { key: 'b', name: 'Data', type: 'Data', label: 'B', group: 'grp1' },
    ];
    const linkDataArray = [
      { from: 'a', to: 'p' },
      { from: 'p', to: 'b' },
    ];

    const patterns = buildDesignPatternsFromModelData(nodeDataArray, linkDataArray);

    expect(patterns.length).toBe(1);
    expect(patterns[0].id).toBe('grp1');
    expect(patterns[0].label).toBe('My Cluster');
  });

  test('two process nodes sharing one cluster get distinct pattern ids (no collision)', () => {
    const nodeDataArray = [
      { key: 'grp1', isGroup: true, category: 'ClusterGroup', label: 'Shared Cluster' },
      { key: 'a', name: 'Data', type: 'Data', label: 'A', group: 'grp1' },
      { key: 'p1', name: 'Train', type: 'Train', label: 'P1', group: 'grp1' },
      { key: 'p2', name: 'Engineer', type: 'Engineer', label: 'P2', group: 'grp1' },
      { key: 'b', name: 'Data', type: 'Data', label: 'B', group: 'grp1' },
    ];
    const linkDataArray = [
      { from: 'a', to: 'p1' },
      { from: 'p1', to: 'b' },
      { from: 'a', to: 'p2' },
    ];

    const patterns = buildDesignPatternsFromModelData(nodeDataArray, linkDataArray);

    expect(patterns.length).toBe(2);
    const ids = patterns.map((p: any) => p.id).sort();
    expect(ids).toEqual(['p1', 'p2']);
  });

  test('no ClusterGroup nodes at all still produces one pattern per process node', () => {
    const nodeDataArray = [
      { key: 'x', name: 'Data', type: 'Data', label: 'X' },
      { key: 'y', name: 'Transform', type: 'Transform', label: 'Y' },
      { key: 'z', name: 'Data', type: 'Data', label: 'Z' },
    ];
    const linkDataArray = [
      { from: 'x', to: 'y' },
      { from: 'y', to: 'z' },
    ];

    const patterns = buildDesignPatternsFromModelData(nodeDataArray, linkDataArray);
    expect(patterns.length).toBe(1);
    expect(patterns[0].id).toBe('y');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd Boxology-Interface
npx playwright test tests/e2e/pattern-extraction.spec.ts --reporter=line
```
Expected: FAIL — the first test fails because `patterns.length` is `0` (old code only reads `ClusterGroup` members, and there are none), and/or because `'Infer'` isn't recognized as a process type by the current `PROCESS_TYPES` set.

- [ ] **Step 3: Add `Infer`/`Inference` to `PROCESS_TYPES`**

In `Boxology-Interface/src/utils/exportHelpers.ts`, change:
```ts
const PROCESS_TYPES = new Set<string>([
  'Train', 'Training', 'Engineer', 'Engineering','Deduce', 'Induce', 'Induction',
   'Transform', 'Embed', 'Embedding'
].map(norm));
```
to:
```ts
const PROCESS_TYPES = new Set<string>([
  'Train', 'Training', 'Engineer', 'Engineering', 'Deduce', 'Induce', 'Induction',
  'Transform', 'Embed', 'Embedding', 'Infer', 'Inference'
].map(norm));
```

- [ ] **Step 4: Rewrite `buildDesignPatternsFromModelData` to be process-centric**

In `Boxology-Interface/src/utils/exportHelpers.ts`, replace the entire function body (currently lines 44-119, from `export function buildDesignPatternsFromModelData(` through its closing `}`) with:
```ts
export function buildDesignPatternsFromModelData(
  nodeDataArray: any[],
  linkDataArray: any[]
) {
  const nodeByKey = new Map<string, any>(nodeDataArray.map((n: any) => [String(n.key), n]));
  const groupByKey = new Map<string, any>(
    nodeDataArray
      .filter((n: any) => n.isGroup && n.category === 'ClusterGroup')
      .map((g: any) => [String(g.key), g])
  );

  const links = (linkDataArray ?? []).map((l: any) => ({
    from: String(l.from),
    to: String(l.to),
  }));

  // Count process nodes per cluster so a cluster's id/label is only reused
  // when it unambiguously identifies a single pattern (avoids id collisions
  // when two process nodes share one cluster).
  const processCountByGroup = new Map<string, number>();
  for (const n of nodeDataArray) {
    if (!n.isGroup && isProcess(n) && n.group) {
      const gKey = String(n.group);
      processCountByGroup.set(gKey, (processCountByGroup.get(gKey) ?? 0) + 1);
    }
  }

  const patterns: any[] = [];

  for (const processNode of nodeDataArray) {
    if (processNode.isGroup || !isProcess(processNode)) continue;

    const processKey = String(processNode.key);

    const inputNodes = links
      .filter(l => l.to === processKey)
      .map(l => nodeByKey.get(l.from))
      .filter(Boolean);

    const outputNodes = links
      .filter(l => l.from === processKey)
      .map(l => nodeByKey.get(l.to))
      .filter(Boolean);

    const group = processNode.group ? groupByKey.get(String(processNode.group)) : undefined;
    const usesClusterIdentity = !!group && processCountByGroup.get(String(processNode.group)) === 1;

    const pattern: any = {
      id: usesClusterIdentity ? group.key : processNode.key,
      label: usesClusterIdentity ? (group.label ?? group.text ?? 'Cluster') : (processNode.label ?? 'Pattern'),
    };

    const mappedInputs = inputNodes.map(toComponent);
    const mappedOutputs = outputNodes.map(toComponent);

    if (mappedInputs.length > 0) pattern.input = singleOrArray(mappedInputs);
    if (mappedOutputs.length > 0) pattern.output = singleOrArray(mappedOutputs);
    pattern.process = toComponent(processNode);

    patterns.push(pattern);
  }

  return patterns;
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd Boxology-Interface
npx playwright test tests/e2e/pattern-extraction.spec.ts --reporter=line
```
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add Boxology-Interface/src/utils/exportHelpers.ts Boxology-Interface/tests/e2e/pattern-extraction.spec.ts
git commit -m "$(cat <<'EOF'
fix: make DesignPattern extraction process-centric, not cluster-centric

buildDesignPatternsFromModelData only read nodes inside a ClusterGroup,
so unclustered diagrams (e.g. the entire GraphRAG/Onlim example) were
silently dropped from BEAM/KG export. Now finds every process-type node
directly and builds its pattern from link topology, independent of
clustering. Also fixes 'Infer' missing from PROCESS_TYPES, which would
have left the GraphRAG example's extraction step unrecognized even
after this fix.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Remove the clustering validation gate

**Spec:** same as Task 2. **Depends on Task 2.**

**Files:**
- Modify: `Boxology-Interface/src/App.tsx` (delete `validateNodeClustering` at line 418 and its two call sites at ~line 474 and ~line 1082)
- Test: `Boxology-Interface/tests/e2e/beam-export.spec.ts` (extend), `Boxology-Interface/tests/e2e/export-robustness.spec.ts` (extend)

**Interfaces:**
- Consumes: Task 2's `buildDesignPatternsFromModelData`.
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Add to `Boxology-Interface/tests/e2e/beam-export.spec.ts` (inside the `'BEAM Export — no cluster required'` describe block, after the existing `'JSON export DOES show clustering error...'` test):
```ts
  test('JSON export no longer shows a clustering error for unclustered nodes', async ({ page }) => {
    const graphragBtn = page.getByRole('button', { name: /GraphRAG \(BEAM\)/i });
    await graphragBtn.click();
    await page.waitForTimeout(1500);

    let alertMessage = '';
    page.on('dialog', async (dialog: any) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.route('**/api/beam-export', async (route: any) => {
      await route.fulfill({ status: 200, contentType: 'text/turtle', body: '@prefix beam: <http://w3id.org/beam/core#> .\n' });
    });

    await openExportMenu(page);
    const jsonBtn = page.getByRole('button', { name: /JSON/i });
    await jsonBtn.click();
    await page.waitForTimeout(1000);

    expect(alertMessage).not.toContain('cluster');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd Boxology-Interface
npx playwright test tests/e2e/beam-export.spec.ts --reporter=line
```
Expected: FAIL — the new test fails because `validateNodeClustering()` still blocks JSON export of the unclustered GraphRAG example (this contradicts the pre-existing test right above it in the same file, which asserted the *old*, now-unwanted behavior — that old test will be removed in Step 3).

- [ ] **Step 3: Remove the old contradicting test and the validation gate**

In `Boxology-Interface/tests/e2e/beam-export.spec.ts`, delete the now-obsolete test `'JSON export DOES show clustering error when nodes are unclustered'` (it asserted the behavior this task removes).

In `Boxology-Interface/src/App.tsx`:
1. Delete the `validateNodeClustering` function (starts `const validateNodeClustering = (): { valid: boolean; errors: string[] } => {` at line 418, ends at its matching closing `};`).
2. In the `'json'` export case, delete the validation block:
```ts
      const validation = validateNodeClustering();
      if (!validation.valid) {
        alert(
          'Cannot export: All nodes must belong to exactly one cluster.\n\n' +
          'Issues found:\n' +
          validation.errors.join('\n')
        );
        return;
      }
```
   (This sits just before `if (!diagramRef.current) { alert('No diagram to export'); return; }` near line 474 — leave that null-check in place, only remove the validation block above it.)
3. In `handleCreateKG` (starts ~line 1081), delete:
```ts
    const validation = validateNodeClustering();
    if (!validation.valid) {
      setLoadingMessage(`Validation failed:\n\n${validation.errors.join('\n')}`);
      setIsCreatingKG(true);
      setTimeout(() => setIsCreatingKG(false), 2500);
      return;
    }
```
   (Leave the `if (!diagramRef.current) { ... }` check immediately after it in place.)

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd Boxology-Interface
npx playwright test tests/e2e/beam-export.spec.ts --reporter=line
```
Expected: PASS (all tests in the file, including the new one).

- [ ] **Step 5: Add a Create-KG regression test**

Add to `Boxology-Interface/tests/e2e/export-robustness.spec.ts` (check the file's existing `dismissModal`/setup pattern first and match it — if the file already has a `test.describe` block for Create KG, add inside it; otherwise add a new one):
```ts
test.describe('Create KG — no cluster required', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    const gotItBtn = page.getByRole('button', { name: /GOT IT/i });
    if (await gotItBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await gotItBtn.click();
    }
  });

  test('Create KG does not block on unclustered nodes', async ({ page }) => {
    const graphragBtn = page.getByRole('button', { name: /GraphRAG \(BEAM\)/i });
    await graphragBtn.click();
    await page.waitForTimeout(1500);

    await page.route('**/api/kg', async (route: any) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', mode: 'test', triples_len: 10 }) });
    });

    const createKgBtn = page.getByRole('button', { name: /Create KG/i });
    await createKgBtn.click();
    await page.waitForTimeout(1000);

    await expect(page.getByText(/does not belong to any cluster/i)).toHaveCount(0);
  });
});
```

- [ ] **Step 6: Run it and verify it passes**

```bash
cd Boxology-Interface
npx playwright test tests/e2e/export-robustness.spec.ts --reporter=line
```
Expected: PASS. If the "Create KG" button's accessible name differs from `/Create KG/i` in the actual `Toolbar.tsx`/`RightSidebar.tsx` rendering, adjust the locator to match (check via `npx playwright test --debug` or by reading the button's `title`/text in the component first).

- [ ] **Step 7: Commit**

```bash
git add Boxology-Interface/src/App.tsx Boxology-Interface/tests/e2e/beam-export.spec.ts Boxology-Interface/tests/e2e/export-robustness.spec.ts
git commit -m "$(cat <<'EOF'
fix: remove clustering validation gate from JSON export and Create KG

validateNodeClustering existed to protect against DesignPattern silently
dropping unclustered nodes — that data-loss bug is fixed (previous
commit), so the gate has nothing left to protect and only blocks valid
diagrams from being exported/upserted.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Arbitrary and nested clusters

**Spec:** `docs/superpowers/specs/2026-07-01-arbitrary-nested-clusters-design.md`. **Depends on Task 2 and 3.**

**Files:**
- Modify: `Boxology-Interface/src/App.tsx` (`handleClusterSelectedNodes` ~line 991, `hasMultipleProcessNodes` ~line 922)

**Interfaces:**
- Consumes: Task 2's process-centric pattern extraction (this task is unsafe without it).
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Confirm the export-side regression test already exists**

GoJS right-click context-menu interaction can't be reliably driven from Playwright in this repo (confirmed: no existing spec file simulates canvas-coordinate right-clicks — they all either check DOM elements or drive the model directly via the `window.__gojs_diagram` escape hatch `GoDiagram.tsx:883` exposes). The behavior this task changes — multi-process clusters exporting correctly — is already covered by Task 2's `pattern-extraction.spec.ts` test `'two process nodes sharing one cluster get distinct pattern ids'`, which exercises `buildDesignPatternsFromModelData` directly with exactly this scenario. No new automated test is added here; this task's own verification is the manual pass in Step 4 below, which exercises the actual UI restriction being removed (something Task 2's test, operating below the UI layer, cannot).

- [ ] **Step 2: Remove the single-process-per-cluster restriction**

In `Boxology-Interface/src/App.tsx`, in `handleClusterSelectedNodes` (~line 991), delete:
```ts
    // 🚨 ADD VALIDATION HERE
    if (hasMultipleProcessNodes(selectedNodes)) {
      alert('❌ Error: A cluster cannot contain more than one process node.');
      return;
    }

```
Then delete the now-unused `hasMultipleProcessNodes` function (~line 922-929):
```ts
  // Validate process nodes in a selection
  function hasMultipleProcessNodes(selectedNodes: go.Node[]) {
    const processNodes = selectedNodes.filter(
      n =>
        processNodeNames.includes(n.data.name) ||
        processNodeNames.includes(n.data.type)
    );
    return processNodes.length > 1;
  }

```
(Leave `processNodeNames` itself — it's still used by `detectAndUpdateSharedNodes`. While here, add `"Infer"` to it for consistency with Task 2's `PROCESS_TYPES` fix:
```ts
  const processNodeNames = [
    "Train", "Engineer", "Deduce", "Induce", "Transform", "Embed", "Infer"
  ];
```
)

- [ ] **Step 3: Allow selecting existing clusters for nesting**

In `handleClusterSelectedNodes`, change the selection-collection logic from:
```ts
    // Collect selected non-group nodes
    const selectedNodes: go.Node[] = [];
    diagram.selection.each(part => {
      if (part instanceof go.Node && !part.data.isGroup) selectedNodes.push(part);
    });
```
to:
```ts
    // Collect selected nodes AND existing clusters (for nesting)
    const selectedNodes: go.Node[] = [];
    diagram.selection.each(part => {
      if (part instanceof go.Node) selectedNodes.push(part);
    });
```
Note `go.Group` is a subclass of `go.Node` in GoJS, so `part instanceof go.Node` already matches both plain nodes and existing `ClusterGroup` groups — removing the `!part.data.isGroup` filter is the only change needed; the rest of the function (assigning `group` via `setDataProperty(n.data, 'group', key)`) already works unmodified for group data, since a Group's data is a plain object like any node's.

- [ ] **Step 4: Manual verification**

```bash
cd Boxology-Interface
npm run dev
```
In the browser: load the GraphRAG example, select two different process-type nodes (e.g. "Event ID Extraction" and "KG Querying"), right-click → "Cluster Group" → confirm no error and both become members of one cluster. Then select that new cluster plus one more loose node, cluster again → confirm the first cluster is now nested inside the second (visually, one box inside another). Right-click the outer cluster → "Uncluster" → confirm only the outer level releases, leaving the inner cluster intact.

- [ ] **Step 5: Run the full pattern-extraction and beam-export suites to confirm no regressions**

```bash
cd Boxology-Interface
npx playwright test tests/e2e/pattern-extraction.spec.ts tests/e2e/beam-export.spec.ts --reporter=line
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add Boxology-Interface/src/App.tsx
git commit -m "$(cat <<'EOF'
feat: allow arbitrary and nested clusters

Removes the hard-coded 'one process per cluster' restriction (no
longer needed now that pattern extraction is process-centric, not
cluster-centric — Task 2) and the selection filter that prevented
grouping an existing cluster inside a new outer cluster.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Automatic link-type inference

**Spec:** `docs/superpowers/specs/2026-07-01-link-type-inference-design.md`. Independent of Tasks 2-4.

**Files:**
- Create: `Boxology-Interface/src/utils/linkCategory.ts`
- Test: `Boxology-Interface/tests/e2e/link-category.spec.ts` (new)
- Modify: `Boxology-Interface/src/GoDiagram.tsx` (add import + two diagram listeners after the `'ExternalObjectsDropped'` listener, ~line 767)

**Interfaces:**
- Consumes: nothing.
- Produces: `inferLinkCategory(fromData: any, toData: any): string | undefined` — used by `GoDiagram.tsx`'s new listeners.

- [ ] **Step 1: Write the failing test**

Create `Boxology-Interface/tests/e2e/link-category.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import { inferLinkCategory } from '../../src/utils/linkCategory';

test.describe('inferLinkCategory', () => {
  test('returns annotation when the "to" node is a beamCard', () => {
    expect(inferLinkCategory({ category: undefined }, { category: 'beamCard' })).toBe('annotation');
  });

  test('returns annotation when the "from" node is a beamCard', () => {
    expect(inferLinkCategory({ category: 'beamCard' }, { category: undefined })).toBe('annotation');
  });

  test('returns undefined when neither endpoint is a beamCard', () => {
    expect(inferLinkCategory({ category: undefined }, { category: undefined })).toBeUndefined();
  });

  test('returns annotation when both endpoints are beamCard', () => {
    expect(inferLinkCategory({ category: 'beamCard' }, { category: 'beamCard' })).toBe('annotation');
  });

  test('handles missing/undefined data gracefully', () => {
    expect(inferLinkCategory(undefined, undefined)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd Boxology-Interface
npx playwright test tests/e2e/link-category.spec.ts --reporter=line
```
Expected: FAIL with a module-not-found error (`linkCategory.ts` doesn't exist yet).

- [ ] **Step 3: Implement `inferLinkCategory`**

Create `Boxology-Interface/src/utils/linkCategory.ts`:
```ts
export function inferLinkCategory(fromData: any, toData: any): string | undefined {
  const isCard = (d: any) => d?.category === 'beamCard';
  return (isCard(fromData) || isCard(toData)) ? 'annotation' : undefined;
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
cd Boxology-Interface
npx playwright test tests/e2e/link-category.spec.ts --reporter=line
```
Expected: PASS (5 tests).

- [ ] **Step 5: Wire it into GoDiagram.tsx**

Add the import near the top of `Boxology-Interface/src/GoDiagram.tsx` (after the existing `beamStyles` import, ~line 6):
```ts
import { inferLinkCategory } from './utils/linkCategory';
```

Insert two new diagram listeners immediately after the existing `'ExternalObjectsDropped'` listener block (currently ends at line 767 with `});`, right before `const handleDragOver = (e: DragEvent) => {` at line 769):
```ts

    diagram.addDiagramListener('LinkDrawn', (e) => {
      const link = e.subject;
      if (!(link instanceof go.Link)) return;
      const fromData = link.fromNode?.data;
      const toData = link.toNode?.data;
      const category = inferLinkCategory(fromData, toData);
      if (category) {
        (diagram.model as go.GraphLinksModel).setCategoryForLinkData(link.data, category);
      }
    });

    diagram.addDiagramListener('LinkRelinked', (e) => {
      const link = e.subject;
      if (!(link instanceof go.Link)) return;
      const fromData = link.fromNode?.data;
      const toData = link.toNode?.data;
      const category = inferLinkCategory(fromData, toData);
      (diagram.model as go.GraphLinksModel).setCategoryForLinkData(link.data, category ?? '');
    });
```

- [ ] **Step 6: Manual verification**

```bash
cd Boxology-Interface
npm run dev
```
In the browser: load the GraphRAG example (or start blank), drag a plain workflow shape and a Risk card onto the canvas, draw a link from the workflow shape to the Risk card by dragging from its edge — confirm the link renders dotted (annotation style), not solid. Draw a link between two plain workflow shapes — confirm it stays solid. Drag an existing solid link's endpoint onto a Risk card — confirm it switches to dotted.

- [ ] **Step 7: Commit**

```bash
git add Boxology-Interface/src/utils/linkCategory.ts Boxology-Interface/tests/e2e/link-category.spec.ts Boxology-Interface/src/GoDiagram.tsx
git commit -m "$(cat <<'EOF'
feat: infer link category automatically from endpoint type

No UI ever set a drawn link's category, so hand-drawn links were
always the default solid template even when connecting to a
Risk/Note/System card — silently breaking KG export, which splits
links into workflow vs. annotationLinks purely by category ===
'annotation'. Now inferred automatically on draw and relink.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Risk/Risk Control marker badge — data model and rendering

**Spec:** `docs/superpowers/specs/2026-07-01-beam-risk-marker-badge-design.md`. Independent of Tasks 2-5.

**Files:**
- Modify: `Boxology-Interface/src/GoDiagram.tsx` (add `RISK_BADGE` panel to the default node template, after the `TYPE_BADGE` panel ~line 497)

**Interfaces:**
- Consumes: nothing.
- Produces: node data field `riskMarker?: 'Risk' | 'RiskControl'` — consumed by Task 7 (context menu) and Task 8 (export).

- [ ] **Step 1: Manual test plan (no automated test for this step — pure rendering, see Task 7 for the testable interaction)**

This step only adds a visual element bound to a data field nothing sets yet, so there's no user-visible behavior to assert until Task 7 wires up the context menu. Proceed directly to implementation; Task 7's e2e test will cover the rendering end-to-end (badge visible after marking).

- [ ] **Step 2: Add the `RISK_BADGE` panel**

In `Boxology-Interface/src/GoDiagram.tsx`, inside the default node template, insert this new panel immediately after the `TYPE_BADGE` panel's closing `)` (currently line 497) and before the node template's closing `);` (currently line 498) — add a comma after the `TYPE_BADGE` panel's closing `)`:
```ts
      ),

      // Risk / Risk Control marker badge — bottom-center, mirrors TYPE_BADGE (top-center)
      $(go.Panel, 'Auto',
        {
          name: 'RISK_BADGE',
          alignment: go.Spot.Bottom,
          alignmentFocus: go.Spot.Top,
          margin: new go.Margin(0, 0, -8, 0),
        },
        new go.Binding('visible', 'riskMarker', (marker) => !!marker),
        $(go.Shape, 'RoundedRectangle',
          {
            fill: 'white',
            strokeWidth: 1,
            parameter1: 10
          },
          new go.Binding('stroke', 'riskMarker', (marker) =>
            marker === 'RiskControl' ? '#388e3c' : '#fb8c00'
          )
        ),
        $(go.Panel, 'Horizontal',
          { margin: new go.Margin(3, 8, 3, 8) },
          $(go.Shape, 'Circle',
            {
              width: 5,
              height: 5,
              stroke: null,
              margin: new go.Margin(0, 4, 0, 0)
            },
            new go.Binding('fill', 'riskMarker', (marker) =>
              marker === 'RiskControl' ? '#388e3c' : '#fb8c00'
            )
          ),
          $(go.TextBlock,
            {
              font: '9px system-ui, -apple-system, sans-serif',
            },
            new go.Binding('text', 'riskMarker', (marker) =>
              marker === 'RiskControl' ? 'Risk Control' : 'Risk'
            ),
            new go.Binding('stroke', 'riskMarker', (marker) =>
              marker === 'RiskControl' ? '#388e3c' : '#fb8c00'
            )
          )
        )
      )
    );
```
(The final `);` shown above replaces the original line 498 `);` that closes the whole node template — don't duplicate it.)

- [ ] **Step 3: Verify the app still builds and the existing default-node-template tests still pass**

```bash
cd Boxology-Interface
npx tsc -b --noEmit
npx playwright test tests/e2e/beam-annotation.spec.ts --reporter=line
```
Expected: no TypeScript errors; existing tests still PASS (badge is invisible since nothing sets `riskMarker` yet).

- [ ] **Step 4: Commit**

```bash
git add Boxology-Interface/src/GoDiagram.tsx
git commit -m "$(cat <<'EOF'
feat: add Risk/Risk Control marker badge rendering

Bottom-center badge on the default node template, bound to a new
optional riskMarker field, mirroring the existing TYPE_BADGE pattern.
Invisible until Task 7 wires up a way to set it.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Risk/Risk Control marker badge — context menu interaction

**Spec:** same as Task 6. **Depends on Task 6.**

**Files:**
- Modify: `Boxology-Interface/src/ContextMenu.tsx` (add menu items)
- Modify: `Boxology-Interface/src/App.tsx` (add `handleSetRiskMarker` + wire into `handleContextMenuAction`)
- No automated test file changes — see Step 1 for why; covered by manual verification (Step 4).

**Interfaces:**
- Consumes: Task 6's `riskMarker` field and `RISK_BADGE` panel.
- Produces: nothing new consumed by later tasks (Task 8 reads `riskMarker` off exported node data independently).

- [ ] **Step 1: No automated test for the context-menu interaction itself**

GoJS renders to `<canvas>`, and this repo's existing tests never simulate canvas-coordinate right-clicks (confirmed across all of `tests/e2e/*.spec.ts` — they either check DOM elements outside the canvas or drive the model directly via the `window.__gojs_diagram` escape hatch `GoDiagram.tsx:883` exposes). A test that sets `riskMarker` directly via `page.evaluate(() => diagram.model.setDataProperty(...))` would pass before this task's code exists too (GoJS model data accepts arbitrary properties regardless of whether any menu sets them), so it wouldn't be a real red/green cycle for *this* task's actual change — the context-menu wiring. This task's implementation is verified via the manual pass in Step 4, which exercises the real interaction (right-click → menu → click → badge appears).

- [ ] **Step 2: Add context menu items**

In `Boxology-Interface/src/ContextMenu.tsx`, insert new menu items after the existing "Cluster Group" / "Uncluster" blocks (after line 106, before the "Cancel Option" div at line 108-109):
```tsx
      {/* Risk marker actions — only for plain workflow nodes (not clusters, not beamCard) */}
      {!selectedData?.isCluster && selectedData?.category !== 'beamCard' && !selectedData?.riskMarker && (
        <>
          <div
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              color: '#fb8c00',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              transition: 'background-color 0.2s ease',
            }}
            onClick={() => onAction('mark_risk')}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <span style={{ marginRight: 8 }}>🟠</span>
            Mark as Risk
          </div>
          <div
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              color: '#388e3c',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              transition: 'background-color 0.2s ease',
            }}
            onClick={() => onAction('mark_risk_control')}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <span style={{ marginRight: 8 }}>🟢</span>
            Mark as Risk Control
          </div>
        </>
      )}

      {!selectedData?.isCluster && selectedData?.category !== 'beamCard' && selectedData?.riskMarker && (
        <div
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            color: '#495057',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            transition: 'background-color 0.2s ease',
          }}
          onClick={() => onAction('clear_risk_marker')}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <span style={{ marginRight: 8 }}>⚪</span>
          Clear Risk Marker
        </div>
      )}
```

- [ ] **Step 3: Wire the actions in App.tsx**

In `Boxology-Interface/src/App.tsx`, add a new handler near `handleClusterSelectedNodes`/`handleUnclusterGroup` (~after line 1076):
```ts
  const handleSetRiskMarker = (marker: 'Risk' | 'RiskControl' | null) => {
    if (!diagramRef.current) {
      alert('No diagram available');
      return;
    }
    const diagram = diagramRef.current;
    const selectedPart = diagram.selection.first();

    if (!(selectedPart instanceof go.Node) || selectedPart.data.isGroup || selectedPart.data.category === 'beamCard') {
      alert('Select a single workflow component to mark.');
      return;
    }

    diagram.startTransaction('set risk marker');
    (diagram.model as go.GraphLinksModel).setDataProperty(selectedPart.data, 'riskMarker', marker ?? undefined);
    diagram.commitTransaction('set risk marker');
  };
```
Then add cases to `handleContextMenuAction`'s switch (after the existing `'uncluster_group'` case, ~line 800):
```ts
      case 'mark_risk':
        handleSetRiskMarker('Risk');
        break;
      case 'mark_risk_control':
        handleSetRiskMarker('RiskControl');
        break;
      case 'clear_risk_marker':
        handleSetRiskMarker(null);
        break;
```

- [ ] **Step 4: Manual verification**

```bash
cd Boxology-Interface
npm run dev
```
In the browser: load the GraphRAG example, right-click a plain workflow node (e.g. "Event ID Extraction") — confirm "Mark as Risk" and "Mark as Risk Control" appear (not on a Risk card, not on a cluster). Click "Mark as Risk Control" — confirm the orange/green badge appears bottom-center on the node reading "Risk Control". Right-click again — confirm only "Clear Risk Marker" now shows. Click it — confirm the badge disappears.

- [ ] **Step 5: Run the full test suite for regressions**

```bash
cd Boxology-Interface
npx playwright test tests/e2e/beam-annotation.spec.ts tests/e2e/export-robustness.spec.ts --reporter=line
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add Boxology-Interface/src/ContextMenu.tsx Boxology-Interface/src/App.tsx
git commit -m "$(cat <<'EOF'
feat: wire Risk/Risk Control marker to the right-click context menu

Mark as Risk / Mark as Risk Control / Clear Risk Marker, gated to
plain workflow nodes (not clusters, not beamCard annotation nodes).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Risk/Risk Control marker badge — KG export

**Spec:** same as Task 6. **Depends on Task 7** (needs `riskMarker` to actually be settable to be meaningful, though technically only reads the data field).

**Files:**
- Modify: `Boxology-Interface/src/kg_creation/beam_annotation_triples.py` (new function `generate_risk_marker_triples`)
- Modify: `Boxology-Interface/src/utils/exportHelpers.ts` (include `riskMarker` in exported node shape, if not already passed through)
- Test: `Boxology-Interface/src/kg_creation/test_beam_annotation_triples.py` (new)

**Interfaces:**
- Consumes: `riskMarker` field from Task 6/7.
- Produces: `generate_risk_marker_triples(nodeDataArray: list[dict]) -> str` — called from `kg_creation.py`'s `create_kg()`/backend `/api/beam-export` path (Step 4 wires this in).

- [ ] **Step 1: Write the failing test**

Create `Boxology-Interface/src/kg_creation/test_beam_annotation_triples.py`:
```python
import unittest
from beam_annotation_triples import generate_risk_marker_triples


class TestGenerateRiskMarkerTriples(unittest.TestCase):
    def test_emits_rdf_type_for_marked_node(self):
        nodes = [
            {"key": "extraction", "riskMarker": "RiskControl"},
        ]
        result = generate_risk_marker_triples(nodes)
        self.assertIn(
            "<http://tool4boxology.org/Component/extraction> "
            "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type> "
            "<http://w3id.org/beam/risk#RiskControl> .",
            result,
        )

    def test_emits_risk_type_correctly(self):
        nodes = [{"key": "kg_query", "riskMarker": "Risk"}]
        result = generate_risk_marker_triples(nodes)
        self.assertIn(
            "<http://tool4boxology.org/Component/kg_query> "
            "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type> "
            "<http://w3id.org/beam/risk#Risk> .",
            result,
        )

    def test_skips_nodes_without_marker(self):
        nodes = [{"key": "a"}, {"key": "b", "riskMarker": None}]
        result = generate_risk_marker_triples(nodes)
        self.assertEqual(result, "")

    def test_skips_unknown_marker_values(self):
        nodes = [{"key": "a", "riskMarker": "NotARealMarker"}]
        result = generate_risk_marker_triples(nodes)
        self.assertEqual(result, "")

    def test_multiple_marked_nodes(self):
        nodes = [
            {"key": "a", "riskMarker": "Risk"},
            {"key": "b", "riskMarker": "RiskControl"},
        ]
        result = generate_risk_marker_triples(nodes)
        self.assertEqual(len(result.strip().splitlines()), 2)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd Boxology-Interface/src/kg_creation
python test_beam_annotation_triples.py
```
Expected: FAIL with `ImportError: cannot import name 'generate_risk_marker_triples'`.

- [ ] **Step 3: Implement `generate_risk_marker_triples`**

In `Boxology-Interface/src/kg_creation/beam_annotation_triples.py`, add after `generate_annotation_triples` (after its closing, end of file):
```python
_VALID_RISK_MARKERS = {"Risk", "RiskControl"}


def generate_risk_marker_triples(node_data_array):
    """Return N-Triple lines for workflow nodes tagged with a riskMarker badge.

    Additive to generate_annotation_triples: multi-types the SAME
    Component/{id} IRI the main T4B pipeline already assigns each
    workflow node, rather than creating a new resource.
    """
    lines = []
    for node in node_data_array or []:
        marker = node.get("riskMarker")
        if marker not in _VALID_RISK_MARKERS:
            continue
        component_iri = _component_iri(node["key"])
        lines.append(f"{_iri(component_iri)} {_iri(RDF_TYPE)} {_iri(BEAMR + marker)} .")
    return "\n".join(lines) + "\n" if lines else ""
```

- [ ] **Step 4: Run it to verify it passes**

```bash
cd Boxology-Interface/src/kg_creation
python test_beam_annotation_triples.py
```
Expected: PASS (`OK`, 5 tests).

- [ ] **Step 5: Wire into the backend export path**

In `Boxology-Interface/backend/main.py`, in `api_beam_export` (~line 61-111), after the existing `annotation_triples = generate_annotation_triples(source)` line (~line 74), add:
```python
        from kg_creation.beam_annotation_triples import generate_risk_marker_triples
        all_workflow_nodes = [
            n for b in source.get("boxologies", []) for n in b.get("nodeDataArray", [])
        ]
        risk_marker_triples = generate_risk_marker_triples(all_workflow_nodes)
```
Then include it in `beam_lines` — change:
```python
        if annotation_triples:
            for line in annotation_triples.splitlines():
                stripped = line.strip()
                if stripped:
                    beam_lines.append(stripped)
```
to:
```python
        if annotation_triples:
            for line in annotation_triples.splitlines():
                stripped = line.strip()
                if stripped:
                    beam_lines.append(stripped)

        if risk_marker_triples:
            for line in risk_marker_triples.splitlines():
                stripped = line.strip()
                if stripped:
                    beam_lines.append(stripped)
```

- [ ] **Step 6: Ensure `nodeDataArray` (with `riskMarker`) reaches the backend payload**

Check `Boxology-Interface/src/utils/exportHelpers.ts`'s `generateMultiPageRMLExport` (~line 199-263) — the `boxologies` objects it builds currently expose `id`, `label`, `DesignPattern`, `annotations`, `annotationLinks`, but not the raw `nodeDataArray`. Add it so the backend has something to read in Step 5:
```ts
    return {
      id,
      label,
      DesignPattern: patterns,
      annotations,
      annotationLinks,
      nodeDataArray: nodeDataArray.filter((n: any) => !n.isGroup && n.category !== 'beamCard'),
    };
```
(This replaces the existing `return { id, label, DesignPattern: patterns, annotations, annotationLinks };` block at the end of the `.map()` callback, ~line 254-260.)

- [ ] **Step 7: Manual end-to-end verification**

```bash
cd Boxology-Interface
docker-compose up -d
npm run dev
```
In the browser: load the GraphRAG example, right-click "Event ID Extraction" → "Mark as Risk Control", then Export → BEAM Turtle. Open the downloaded `.ttl` file, confirm it contains a line like:
```
<http://tool4boxology.org/Component/extraction> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://w3id.org/beam/risk#RiskControl> .
```

- [ ] **Step 8: Commit**

```bash
git add Boxology-Interface/src/kg_creation/beam_annotation_triples.py Boxology-Interface/src/kg_creation/test_beam_annotation_triples.py Boxology-Interface/backend/main.py Boxology-Interface/src/utils/exportHelpers.ts
git commit -m "$(cat <<'EOF'
feat: export riskMarker badge as an additional rdf:type triple

Multi-types the same Component/{id} IRI the main T4B pipeline already
assigns each workflow node, additive to the existing connected-card
risk chain triples.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Remove duplicate BEAM Concepts palette entries

**Spec:** `docs/superpowers/specs/2026-07-01-beam-ui-dedup-design.md`. Independent of all other tasks.

**Files:**
- Modify: `Boxology-Interface/src/data/shape.ts` (delete the `'BEAM Concepts'` shape block, lines 28-37)
- Modify: `Boxology-Interface/src/components/LeftSidebar.tsx` (remove `'BEAM Concepts'` from `categoryOrder`, line 28)
- Test: `Boxology-Interface/tests/e2e/beam-annotation.spec.ts` (extend)

**Interfaces:** N/A — pure deletion, no new interfaces.

- [ ] **Step 1: Write the failing test**

Add to `Boxology-Interface/tests/e2e/beam-annotation.spec.ts`, inside the existing `'BEAM Annotation & Risk palette groups'` describe block:
```ts
  test('BEAM Concepts group no longer appears in left sidebar (deduped)', async ({ page }) => {
    await expect(page.getByText('BEAM Concepts')).toHaveCount(0);
  });
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd Boxology-Interface
npx playwright test tests/e2e/beam-annotation.spec.ts --reporter=line -g "BEAM Concepts"
```
Expected: FAIL — the group is still present.

- [ ] **Step 3: Delete the duplicate shape entries**

In `Boxology-Interface/src/data/shape.ts`, delete this block (currently lines 28-37, including the leading comment and the blank line before the next section):
```ts
  // BEAM Concepts — visual notation from the BEAM ontology
  { name: 'Data',             label: 'Data',              shape: 'Rectangle',        color: '#90ee90', stroke: '#2d7a2d', group: 'BEAM Concepts' },
  { name: 'Symbol',           label: 'Symbol',            shape: 'Rectangle',        color: '#d0d0d0', stroke: '#808080', group: 'BEAM Concepts' },
  { name: 'StatisticalModel', label: 'Statistical Model', shape: 'Hexagon',          color: '#add8e6', stroke: '#1c6ea4', group: 'BEAM Concepts' },
  { name: 'SemanticModel',    label: 'Semantic Model',    shape: 'Hexagon',          color: '#00ced1', stroke: '#008b8b', group: 'BEAM Concepts' },
  { name: 'Train',            label: 'Training',          shape: 'RoundedRectangle', borderRadius: '45px', color: '#dda0dd', stroke: '#8b008b', group: 'BEAM Concepts' },
  { name: 'Engineer',         label: 'Engineering',       shape: 'RoundedRectangle', borderRadius: '45px', color: '#ffb6c1', stroke: '#c1307a', group: 'BEAM Concepts' },
  { name: 'Infer',            label: 'Inference',         shape: 'RoundedRectangle', borderRadius: '45px', color: '#fffacd', stroke: '#b8860b', group: 'BEAM Concepts' },
  { name: 'Transform',        label: 'Transformation',    shape: 'RoundedRectangle', borderRadius: '45px', color: '#ffb6c1', stroke: '#cd5c5c', group: 'BEAM Concepts' },
  { name: 'Actor',            label: 'Actor',             shape: 'Triangle',          color: '#ffd700', stroke: '#b8860b', group: 'BEAM Concepts' },

```

- [ ] **Step 4: Remove the group from the sidebar's category order**

In `Boxology-Interface/src/components/LeftSidebar.tsx`, delete the line `  'BEAM Concepts',` from the `categoryOrder` array (currently line 28).

- [ ] **Step 5: Run it to verify it passes**

```bash
cd Boxology-Interface
npx playwright test tests/e2e/beam-annotation.spec.ts --reporter=line
```
Expected: PASS (all tests, including the new one — the file's other tests only check for `'BEAM Annotation'`/`'BEAM Risk'`, unaffected).

- [ ] **Step 6: Manual verification that the BEAM View toggle still works on plain T4B shapes**

```bash
cd Boxology-Interface
npm run dev
```
In the browser: drag a plain "Model" shape (from "AI & Models", not a removed duplicate) onto the canvas, click "BEAM View" toggle — confirm it re-colors to the BEAM hexagon style. Toggle off — confirm it reverts.

- [ ] **Step 7: Commit**

```bash
git add Boxology-Interface/src/data/shape.ts Boxology-Interface/src/components/LeftSidebar.tsx Boxology-Interface/tests/e2e/beam-annotation.spec.ts
git commit -m "$(cat <<'EOF'
fix: remove duplicate BEAM Concepts palette group

These entries duplicated existing T4B shapes (same name, different
default color) with no semantic difference — the BEAM View toggle
already recolors any node by type, making a second palette group
redundant. BEAM Annotation/Risk groups are untouched (genuinely new
concepts, not duplicates).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Clarify JSON export vs. reload

**Spec:** `docs/superpowers/specs/2026-07-01-json-reload-clarification-design.md`. Independent of all other tasks.

**Files:**
- Modify: `Boxology-Interface/src/components/Toolbar.tsx` (JSON export button label/title, ~line 432-442)
- Modify: `Boxology-Interface/src/App.tsx` (Open handler error message, ~line 342-356)
- Test: `Boxology-Interface/tests/e2e/beam-export.spec.ts` (extend)

**Interfaces:** N/A.

- [ ] **Step 1: Write the failing test**

Add to `Boxology-Interface/tests/e2e/beam-export.spec.ts`, in the `'BEAM Export — UI'` describe block:
```ts
  test('JSON export button is labeled to distinguish it from Save', async ({ page }) => {
    await openExportMenu(page);
    await expect(page.getByRole('button', { name: /Export KG JSON/i })).toBeVisible();
  });
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd Boxology-Interface
npx playwright test tests/e2e/beam-export.spec.ts --reporter=line -g "labeled to distinguish"
```
Expected: FAIL — button is currently labeled just "JSON".

- [ ] **Step 3: Update the button label**

In `Boxology-Interface/src/components/Toolbar.tsx`, change (currently lines 432-442):
```tsx
            <button
              onClick={() => {
                onExportJSON();
                setShowExportMenu(false);
              }}
              style={exportItemStyle}
              onMouseOver={hoverOn}
              onMouseOut={hoverOff}
            >
              📄 JSON
            </button>
```
to:
```tsx
            <button
              onClick={() => {
                onExportJSON();
                setShowExportMenu(false);
              }}
              style={exportItemStyle}
              onMouseOver={hoverOn}
              onMouseOut={hoverOff}
              title="KG interchange format — for backend ingestion, not for reopening a diagram. Use Save to reopen later."
            >
              📄 Export KG JSON
            </button>
```

- [ ] **Step 4: Run it to verify it passes**

```bash
cd Boxology-Interface
npx playwright test tests/e2e/beam-export.spec.ts --reporter=line
```
Expected: PASS.

- [ ] **Step 5: Add the clarified Open error (no automated test — requires a real file picker interaction, verified manually)**

In `Boxology-Interface/src/App.tsx`, in `handleFileOperation`'s `'open'` branch, immediately after the existing parse block (currently ends ~line 356 with the `catch` block's closing `}`), insert:
```ts

      if (model && Array.isArray(model.boxologies) && !Array.isArray(model.nodeDataArray)) {
        alert(
          'This looks like an exported KG JSON file, not a saved diagram.\n\n' +
          'Use a .boxology file (or JSON saved via Save) to reopen a diagram for editing.'
        );
        return;
      }
```
(This sits before the "Normalize node names/types" block that currently follows, ~line 358-360.)

- [ ] **Step 6: Manual verification**

```bash
cd Boxology-Interface
npm run dev
```
In the browser: load the GraphRAG example, Export → "Export KG JSON" (downloads a file), then File → Open and select that same downloaded file — confirm the clarified alert appears instead of a silent failure or generic parse error. Then Save the diagram (downloads a `.boxology` file), Open that file — confirm it loads correctly (existing behavior, unaffected).

- [ ] **Step 7: Commit**

```bash
git add Boxology-Interface/src/components/Toolbar.tsx Boxology-Interface/src/App.tsx Boxology-Interface/tests/e2e/beam-export.spec.ts
git commit -m "$(cat <<'EOF'
fix: clarify Export KG JSON vs Save/Open are different formats

No reconstruction logic added — Save/Open already round-trips
correctly via the raw GoJS model shape. Export KG JSON is an
unrelated KG-interchange shape with no geometry; relabeled the
button and added a clear error if someone tries to reopen one.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Auto-arrangement toolbar action

**Spec:** `docs/superpowers/specs/2026-07-01-auto-arrangement-design.md`. Independent, but sequenced last since it's lowest priority and benefits from Task 4's cluster changes being in place.

**Files:**
- Modify: `Boxology-Interface/src/App.tsx` (new `handleAutoArrange`, wire into `<Toolbar>`)
- Modify: `Boxology-Interface/src/components/Toolbar.tsx` (new `onAutoArrange` prop + button)
- Test: `Boxology-Interface/tests/e2e/export-robustness.spec.ts` (extend)

**Interfaces:**
- Consumes: nothing new (uses `go.LayeredDigraphLayout`, confirmed available in the installed `gojs` package).
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Write the failing test**

Add to `Boxology-Interface/tests/e2e/export-robustness.spec.ts`:
```ts
test.describe('Auto-arrange', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    const gotItBtn = page.getByRole('button', { name: /GOT IT/i });
    if (await gotItBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await gotItBtn.click();
    }
  });

  test('Auto-arrange changes node locations without changing node count or keys', async ({ page }) => {
    await page.getByRole('button', { name: /GraphRAG \(BEAM\)/i }).click();
    await page.waitForTimeout(1500);

    const before = await page.evaluate(() => {
      const diagram = (window as any).__gojs_diagram;
      return diagram.model.nodeDataArray.map((n: any) => ({ key: n.key, loc: n.loc }));
    });

    await page.getByRole('button', { name: /Auto-arrange/i }).click();
    await page.waitForTimeout(500);

    const after = await page.evaluate(() => {
      const diagram = (window as any).__gojs_diagram;
      return diagram.model.nodeDataArray.map((n: any) => ({ key: n.key, loc: n.loc }));
    });

    expect(after.length).toBe(before.length);
    expect(after.map((n: any) => n.key).sort()).toEqual(before.map((n: any) => n.key).sort());
    const anyLocationChanged = after.some((a: any) => {
      const b = before.find((x: any) => x.key === a.key);
      return b && b.loc !== a.loc;
    });
    expect(anyLocationChanged).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd Boxology-Interface
npx playwright test tests/e2e/export-robustness.spec.ts --reporter=line -g "Auto-arrange"
```
Expected: FAIL — no "Auto-arrange" button exists yet.

- [ ] **Step 3: Implement `handleAutoArrange` in App.tsx**

Add near `handleCreateKG` (~after line 1132):
```ts
  const handleAutoArrange = () => {
    if (!diagramRef.current) {
      alert('No diagram available');
      return;
    }
    const diagram = diagramRef.current;

    const workflowParts = new go.Set<go.Part>();
    const annotationParts = new go.Set<go.Part>();

    diagram.nodes.each((node) => {
      if (node.data.isGroup) return;
      if (node.data.category === 'beamCard') {
        annotationParts.add(node);
      } else {
        workflowParts.add(node);
      }
    });
    diagram.links.each((link) => {
      if (link.data.category === 'annotation') {
        annotationParts.add(link);
      } else {
        workflowParts.add(link);
      }
    });

    diagram.startTransaction('auto-arrange');

    const workflowLayout = new go.LayeredDigraphLayout({ direction: 0, layerSpacing: 60, columnSpacing: 30 });
    workflowLayout.doLayout(workflowParts);

    const annotationLayout = new go.LayeredDigraphLayout({ direction: 90, layerSpacing: 40, columnSpacing: 20 });
    annotationLayout.doLayout(annotationParts);

    const workflowBounds = diagram.computePartsBounds(workflowParts);
    const annotationBounds = diagram.computePartsBounds(annotationParts);
    if (!annotationBounds.isEmpty() && !workflowBounds.isEmpty()) {
      const dx = workflowBounds.x - annotationBounds.x;
      const dy = workflowBounds.y - annotationBounds.height - 60 - annotationBounds.y;
      annotationParts.each((part) => {
        if (part instanceof go.Node) {
          part.move(new go.Point(part.location.x + dx, part.location.y + dy));
        }
      });
    }

    diagram.commitTransaction('auto-arrange');
  };
```

- [ ] **Step 4: Wire the prop into Toolbar**

In `Boxology-Interface/src/App.tsx`'s `<Toolbar ... />` invocation (~line 1172-1200), add:
```tsx
        onAutoArrange={handleAutoArrange}
```

- [ ] **Step 5: Add the prop and button to Toolbar.tsx**

In `Boxology-Interface/src/components/Toolbar.tsx`, add to the `ToolbarProps` type (after `onBeamViewToggle: (active: boolean) => void;`, ~line 37):
```ts
  onAutoArrange: () => void;
```
Add to the destructured props (after `onBeamViewToggle,`, ~line 61):
```ts
  onAutoArrange,
```
Add the button after the BEAM View toggle button (after its closing `</button>` at line 571, before the separator div at line 573-574):
```tsx

      {/* Auto-arrange */}
      <button
        onClick={onAutoArrange}
        style={simpleButtonStyle}
        title="Auto-arrange nodes using a layered directed-graph layout"
      >
        🧭 Auto-arrange
      </button>
```

- [ ] **Step 6: Run it to verify it passes**

```bash
cd Boxology-Interface
npx playwright test tests/e2e/export-robustness.spec.ts --reporter=line -g "Auto-arrange"
```
Expected: PASS.

- [ ] **Step 7: Manual verification**

```bash
cd Boxology-Interface
npm run dev
```
In the browser: load the GraphRAG example, click "Auto-arrange" — confirm the workflow re-lays-out left-to-right and the annotation/Risk cards form a separate band above it, non-overlapping. Load the Pain Classification or MRI Segmentation example (has clusters), click "Auto-arrange" — confirm cluster boxes stay visually intact (members don't scatter outside their cluster).

- [ ] **Step 8: Run the full test suite for regressions**

```bash
cd Boxology-Interface
npx playwright test --reporter=line
```
Expected: PASS across all spec files (excluding any pre-existing unrelated failures — note them if present, don't silently ignore).

- [ ] **Step 9: Commit**

```bash
git add Boxology-Interface/src/App.tsx Boxology-Interface/src/components/Toolbar.tsx Boxology-Interface/tests/e2e/export-robustness.spec.ts
git commit -m "$(cat <<'EOF'
feat: add Auto-arrange toolbar action using LayeredDigraphLayout

On-demand only (never runs automatically). Two separate layout
passes — main workflow (solid links) and annotation/Risk band
(dotted links) — composed so the annotation band sits above the
workflow, non-overlapping, matching the BEAM paper's visual style.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Final Verification

- [ ] **Run the complete test suite one more time from a clean state**

```bash
cd Boxology-Interface
npx playwright test --reporter=line
python -m unittest discover -s src/kg_creation -p "test_*.py"
```
Expected: all PASS.

- [ ] **Confirm working tree is clean except for expected artifacts**

```bash
cd ..
git status --short
```
Expected: no unexpected modified files (build artifacts like `dist/`, `node_modules/` are already gitignored).
