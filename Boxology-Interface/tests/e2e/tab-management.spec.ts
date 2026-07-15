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
});
