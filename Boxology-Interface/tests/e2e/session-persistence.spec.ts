import { test, expect, type Page } from '@playwright/test';

const SESSION_KEY = 't4b:session:v1';
const DEBOUNCE_MS = 800;

async function dismissModal(page: Page) {
  const gotItBtn = page.getByRole('button', { name: /GOT IT/i });
  if (await gotItBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await gotItBtn.click();
    await page.waitForTimeout(300);
  }
}

async function openApp(page: Page) {
  await page.goto('/');
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(() => !!(window as any).__gojs_diagram, { timeout: 15000 });
  await dismissModal(page);
}

/** Adds a node through a real GoJS transaction, which is what the autosave listens for. */
async function addNode(page: Page, text: string) {
  await page.evaluate((label) => {
    const diagram = (window as any).__gojs_diagram;
    const model = diagram.model;
    model.startTransaction('add node');
    model.addNodeData({ key: label, text: label, type: 'Data', color: '#cde' });
    model.commitTransaction('add node');
  }, text);
}

async function nodeTexts(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    ((window as any).__gojs_diagram.model.nodeDataArray as any[]).map((n) => n.text)
  );
}

/** Waits for the debounced write to land in localStorage. */
async function waitForAutosave(page: Page) {
  await page.waitForFunction(
    (key) => !!window.localStorage.getItem(key),
    SESSION_KEY,
    { timeout: DEBOUNCE_MS + 4000 }
  );
}

test.describe('session persistence', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
    await page.evaluate((key) => window.localStorage.removeItem(key), SESSION_KEY);
  });

  test('a node drawn on the canvas survives a page reload', async ({ page }) => {
    await addNode(page, 'Survives Refresh');
    await waitForAutosave(page);

    await page.reload();
    await page.waitForSelector('canvas');
    await page.waitForFunction(() => !!(window as any).__gojs_diagram);

    expect(await nodeTexts(page)).toContain('Survives Refresh');
  });

  test('the restore notice is shown after a reload', async ({ page }) => {
    await addNode(page, 'Notice Me');
    await waitForAutosave(page);

    await page.reload();
    await page.waitForSelector('canvas');

    await expect(page.getByText(/Restored your last session/i)).toBeVisible();
  });

  test('"Start fresh" discards the restored session and does not come back', async ({ page }) => {
    await addNode(page, 'Discard Me');
    await waitForAutosave(page);

    await page.reload();
    await page.waitForSelector('canvas');
    await page.waitForFunction(() => !!(window as any).__gojs_diagram);
    expect(await nodeTexts(page)).toContain('Discard Me');

    await page.getByRole('button', { name: /Start fresh/i }).click();

    // Cleared from storage and from the canvas...
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SESSION_KEY)).toBeNull();
    expect(await nodeTexts(page)).toEqual([]);

    // ...and stays gone across another reload.
    await page.reload();
    await page.waitForSelector('canvas');
    await page.waitForFunction(() => !!(window as any).__gojs_diagram);
    expect(await nodeTexts(page)).toEqual([]);
    await expect(page.getByText(/Restored your last session/i)).not.toBeVisible();
  });

  test('a corrupt snapshot loads a blank canvas instead of crashing', async ({ page }) => {
    await page.evaluate((key) => window.localStorage.setItem(key, '{not valid json'), SESSION_KEY);

    await page.reload();
    await page.waitForSelector('canvas');
    await page.waitForFunction(() => !!(window as any).__gojs_diagram);

    expect(await nodeTexts(page)).toEqual([]);
    await expect(page.getByText(/Restored your last session/i)).not.toBeVisible();
  });

  test('a snapshot from an unknown schema version is ignored', async ({ page }) => {
    await page.evaluate((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          schemaVersion: 999,
          savedAt: Date.now(),
          pages: [{ id: 'p1', name: 'Diagram', nodeDataArray: [{ key: 'x', text: 'From The Future' }], linkDataArray: [] }],
          currentPageId: 'p1',
          containers: [],
          customContainerShapes: {},
          customGroups: {},
        })
      );
    }, SESSION_KEY);

    await page.reload();
    await page.waitForSelector('canvas');
    await page.waitForFunction(() => !!(window as any).__gojs_diagram);

    expect(await nodeTexts(page)).not.toContain('From The Future');
  });

  // The native "Leave site?" dialog cannot be observed in Playwright, but the
  // guard's actual contract is that it cancels the beforeunload event. That we
  // can check directly.
  test('beforeunload is only cancelled once there are unsaved edits', async ({ page }) => {
    const wouldWarn = () =>
      page.evaluate(() => {
        const e = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(e);
        return e.defaultPrevented;
      });

    // Clean session, nothing drawn yet.
    expect(await wouldWarn()).toBe(false);

    await addNode(page, 'Now Dirty');
    expect(await wouldWarn()).toBe(true);
  });

  test('autosaved snapshot carries pages and palette state', async ({ page }) => {
    await addNode(page, 'Payload Check');
    await waitForAutosave(page);

    const snapshot = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!), SESSION_KEY);

    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.pages.length).toBeGreaterThan(0);
    expect(snapshot.currentPageId).toBeTruthy();
    expect(snapshot.containers).toContain('General');
    // currentPageId must name a page that actually exists in the snapshot.
    expect(snapshot.pages.some((p: any) => p.id === snapshot.currentPageId)).toBe(true);
  });
});
