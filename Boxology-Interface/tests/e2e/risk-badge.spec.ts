import { test, expect } from '@playwright/test';

async function dismissModal(page: any) {
  const gotItBtn = page.getByRole('button', { name: /GOT IT/i });
  if (await gotItBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await gotItBtn.click();
    await page.waitForTimeout(500);
  }
}

// Regression: a node whose data has no `riskMarker` property must not render the
// RISK_BADGE. GoJS skips a Binding whose source property is undefined, so the
// panel has to default to visible:false rather than rely on its converter —
// otherwise every node grows an empty badge ("tail") below its shape.
test.describe('Risk marker badge', () => {
  test('is hidden without riskMarker, shown with it', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);

    const result = await page.evaluate(() => {
      const diagram = (window as any).__gojs_diagram;
      if (!diagram) throw new Error('__gojs_diagram not exposed');

      const base = {
        name: 'Actor',
        label: 'id-actor',
        shape: 'Triangle',
        color: '#f8ce92ff',
        stroke: '#8B6200',
        width: 100,
        height: 60
      };
      diagram.model.addNodeData({ ...base, key: 'probe-plain', loc: '0 0' });
      diagram.model.addNodeData({ ...base, key: 'probe-risk', riskMarker: 'Risk', loc: '300 0' });

      const plain = diagram.findNodeForKey('probe-plain');
      const risky = diagram.findNodeForKey('probe-risk');
      return {
        plainBadgeFound: plain.findObject('RISK_BADGE') !== null,
        plainBadgeVisible: plain.findObject('RISK_BADGE').visible,
        riskyBadgeVisible: risky.findObject('RISK_BADGE').visible
      };
    });

    expect(result.plainBadgeFound).toBe(true);
    expect(result.plainBadgeVisible).toBe(false);
    expect(result.riskyBadgeVisible).toBe(true);
  });
});
