import { test, expect } from '@playwright/test';

async function dismissModal(page: any) {
  const gotItBtn = page.getByRole('button', { name: /GOT IT/i });
  if (await gotItBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await gotItBtn.click();
    await page.waitForTimeout(500);
  }
}

const base = {
  category: 'beamCard',
  label: 'Speed up MRI reading',
  color: '#f5f5f5',
  stroke: '#757575',
  width: 160,
  height: 80
};

// The Context card stays one element; CONTEXT_TYPE_BADGE only sets a
// `contextType` subtype on it (unlike the risk badge, which rewrites `name`).
test.describe('Context type badge', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);
  });

  test('is shown only on Context cards and defaults to "Context"', async ({ page }) => {
    const result = await page.evaluate((base) => {
      const diagram = (window as any).__gojs_diagram;
      if (!diagram) throw new Error('__gojs_diagram not exposed');
      diagram.model.addNodeData({ ...base, key: 'probe-noname', loc: '0 0' });
      diagram.model.addNodeData({ ...base, key: 'probe-ctx', name: 'Context', loc: '300 0' });
      diagram.model.addNodeData({ ...base, key: 'probe-risk', name: 'Risk', loc: '600 0' });
      const badge = (key: string) =>
        diagram.findNodeForKey(key).findObject('CONTEXT_TYPE_BADGE');
      return {
        noNameVisible: badge('probe-noname').visible,
        ctxVisible: badge('probe-ctx').visible,
        riskVisible: badge('probe-risk').visible,
        ctxText: badge('probe-ctx').findObject('CONTEXT_TYPE_TEXT').text
      };
    }, base);

    expect(result.noNameVisible).toBe(false);
    expect(result.riskVisible).toBe(false);
    expect(result.ctxVisible).toBe(true);
    expect(result.ctxText).toBe('Context');
  });

  test('choosing a subtype sets contextType and leaves the card a Context', async ({ page }) => {
    const point = await page.evaluate((base) => {
      const diagram = (window as any).__gojs_diagram;
      diagram.model.addNodeData({ ...base, key: 'probe-ctx', name: 'Context', type: 'Context', loc: '100 100' });
      diagram.maybeUpdate(); // lay the new card out so the badge has bounds
      const badge = diagram.findNodeForKey('probe-ctx').findObject('CONTEXT_TYPE_BADGE');
      const view = diagram.transformDocToView(badge.getDocumentBounds().center);
      const rect = diagram.div.getBoundingClientRect();
      return { x: rect.left + view.x, y: rect.top + view.y };
    }, base);

    await page.mouse.click(point.x, point.y);
    await page.locator('[data-context-type="BusinessObjective"]').click();

    const after = await page.evaluate(() => {
      const diagram = (window as any).__gojs_diagram;
      const node = diagram.findNodeForKey('probe-ctx');
      const d = node.data;
      return {
        contextType: d.contextType,
        name: d.name,
        type: d.type,
        color: d.color,
        stroke: d.stroke,
        label: d.label,
        badgeText: node.findObject('CONTEXT_TYPE_TEXT').text
      };
    });
    expect(after).toEqual({
      contextType: 'BusinessObjective',
      name: 'Context',
      type: 'Context',
      color: '#f5f5f5',
      stroke: '#757575',
      label: 'Speed up MRI reading',
      badgeText: 'Business Objective'
    });
    await expect(page.locator('[data-context-type]')).toHaveCount(0);

    // Back to generic Context clears the field.
    await page.mouse.click(point.x, point.y);
    await page.locator('[data-context-type="Context"]').click();
    const cleared = await page.evaluate(() =>
      (window as any).__gojs_diagram.findNodeForKey('probe-ctx').data.contextType);
    expect(cleared).toBeUndefined();
  });

  test('RDF export payload is unchanged by the subtype', async ({ page }) => {
    const exported = await page.evaluate(async (base) => {
      const mod = await import('/src/utils/exportHelpers.ts');
      const page = {
        name: 'p',
        nodeDataArray: [{ ...base, key: 'c1', name: 'Context', subtext: 'why', contextType: 'TechnicalObjective' }],
        linkDataArray: []
      };
      return mod.generateMultiPageRMLExport([page]);
    }, base);
    expect(exported.boxologies[0].annotations).toEqual([
      { key: 'c1', name: 'Context', label: 'Speed up MRI reading', subtext: 'why' }
    ]);
    expect(JSON.stringify(exported)).not.toContain('TechnicalObjective');
  });
});
