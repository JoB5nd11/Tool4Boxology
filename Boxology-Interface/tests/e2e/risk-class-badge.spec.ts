import { test, expect } from '@playwright/test';

async function dismissModal(page: any) {
  const gotItBtn = page.getByRole('button', { name: /GOT IT/i });
  if (await gotItBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await gotItBtn.click();
    await page.waitForTimeout(500);
  }
}

// Regression: RISK_CLASS_BADGE must not render on a beamCard whose data has no
// `name`. GoJS skips a Binding whose source property is undefined, so the panel
// has to default to visible:false rather than rely on its converter — otherwise
// it shows as an empty pill with a black default-filled dot.
test.describe('Risk class badge', () => {
  test('is hidden without a name, shown for a risk class', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);

    const result = await page.evaluate(() => {
      const diagram = (window as any).__gojs_diagram;
      if (!diagram) throw new Error('__gojs_diagram not exposed');

      const base = {
        category: 'beamCard',
        label: 'Card',
        color: '#fff3e0',
        stroke: '#fb8c00',
        width: 140,
        height: 60
      };
      // No `name` at all — the undefined-source case.
      diagram.model.addNodeData({ ...base, key: 'probe-noname', loc: '0 0' });
      diagram.model.addNodeData({ ...base, key: 'probe-risk', name: 'Risk', loc: '300 0' });
      // A non-risk element: `name` is present but not a risk class.
      diagram.model.addNodeData({ ...base, key: 'probe-other', name: 'Context', loc: '600 0' });

      const badge = (key: string) =>
        diagram.findNodeForKey(key).findObject('RISK_CLASS_BADGE');
      return {
        noNameFound: badge('probe-noname') !== null,
        noNameVisible: badge('probe-noname').visible,
        riskVisible: badge('probe-risk').visible,
        otherVisible: badge('probe-other').visible
      };
    });

    expect(result.noNameFound).toBe(true);
    expect(result.noNameVisible).toBe(false);
    expect(result.otherVisible).toBe(false);
    expect(result.riskVisible).toBe(true);
  });
});
