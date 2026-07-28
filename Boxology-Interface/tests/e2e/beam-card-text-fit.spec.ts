import { test, expect } from '@playwright/test';

async function dismissModal(page: any) {
  const gotItBtn = page.getByRole('button', { name: /GOT IT/i });
  if (await gotItBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await gotItBtn.click();
    await page.waitForTimeout(500);
  }
}

// ~1000 characters — about 19 wrapped lines at a 220px-wide card, where the
// old template rendered at most 4 before cutting the text off with an ellipsis.
const LONG_DESCRIPTION = [
  'Retrieved passages may be only loosely related to the question, so the assistant',
  'can present unsupported claims as if they were grounded in the knowledge graph.',
  'This is amplified when the retriever returns high-similarity but low-relevance',
  'chunks, when the graph itself is stale, and when the answer is generated without',
  'any citation back to the source triples that justify it. Reviewers then have no',
  'practical way to tell a grounded answer from a fabricated one, and the failure is',
  'invisible in aggregate accuracy metrics because the fabricated answers are',
  'fluent, plausible, and superficially consistent with the retrieved context that',
  'was shown to the model at generation time. Mitigation therefore has to happen at',
  'the retrieval boundary rather than in post-hoc review of individual answers.'
].join(' ');

// Regression: a BEAM card (Risk, Risk Control, Consequence, …) must grow to fit
// its description instead of clipping it. The card height used to be pinned by
// the stored `size`, and the description TextBlock was capped at maxLines:10
// with OverflowEllipsis, so long text was silently truncated on the canvas.
test.describe('BEAM card text fit', () => {
  test('long descriptions grow the card instead of being truncated', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);

    const result = await page.evaluate((longText) => {
      const diagram = (window as any).__gojs_diagram;
      if (!diagram) throw new Error('__gojs_diagram not exposed');

      const base = {
        category: 'beamCard',
        name: 'Risk',
        label: 'Risk',
        color: '#fff3e0',
        stroke: '#fb8c00',
        // Legacy "width height" form: the stored height must not pin the card.
        size: '220 100'
      };
      diagram.model.addNodeData({ ...base, key: 'fit-short', loc: '0 0', subtext: 'Short.' });
      diagram.model.addNodeData({ ...base, key: 'fit-long', loc: '400 0', subtext: longText });
      diagram.updateAllTargetBindings();
      diagram.ensureBounds();

      // Located by text rather than by name, so the probe works against any
      // version of the card template.
      const findTextBlock = (obj: any, text: string): any => {
        if (typeof obj.text === 'string' && typeof obj.lineCount === 'number') {
          return obj.text === text ? obj : null;
        }
        let found: any = null;
        if (obj.elements) {
          obj.elements.each((child: any) => {
            if (!found) found = findTextBlock(child, text);
          });
        }
        return found;
      };

      const probe = (key: string, text: string) => {
        const node = diagram.findNodeForKey(key);
        const desc = findTextBlock(node, text);
        if (!desc) throw new Error(`no description TextBlock on ${key}`);
        return {
          nodeWidth: node.actualBounds.width,
          nodeHeight: node.actualBounds.height,
          lineCount: desc.lineCount,
          // The description must sit entirely inside the card's border.
          descInsideCard: node.actualBounds.containsRect(desc.getDocumentBounds())
        };
      };

      return {
        short: probe('fit-short', 'Short.'),
        long: probe('fit-long', longText)
      };
    }, LONG_DESCRIPTION);

    // Width stays as authored; only the height reacts to the text.
    expect(Math.round(result.short.nodeWidth)).toBe(Math.round(result.long.nodeWidth));

    // No line cap: ~1000 characters at this width needs well over 15 lines,
    // where the old template capped out at maxLines:10 (and showed ~4).
    expect(result.long.lineCount).toBeGreaterThan(15);

    // The card grew to hold them rather than clipping.
    expect(result.long.nodeHeight).toBeGreaterThan(result.short.nodeHeight + 100);
    expect(result.long.descInsideCard).toBe(true);
    expect(result.short.descInsideCard).toBe(true);
  });

  test('dragging a side handle changes the width and leaves the height automatic', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);

    const start = await page.evaluate((longText) => {
      const diagram = (window as any).__gojs_diagram;
      diagram.model.addNodeData({
        key: 'resize-card',
        category: 'beamCard',
        name: 'RiskControl',
        label: 'Risk Control',
        color: '#e8f5e9',
        stroke: '#388e3c',
        size: '220 NaN',
        loc: '0 0',
        subtext: longText
      });
      diagram.updateAllTargetBindings();
      diagram.ensureBounds();

      const node = diagram.findNodeForKey('resize-card');
      diagram.select(node);
      const body = node.findObject('CARD_BODY');

      // Client coordinates of the right-hand resize handle.
      const rect = diagram.div.getBoundingClientRect();
      const bounds = body.getDocumentBounds();
      const handlePt = node.location.copy();
      handlePt.x = bounds.x + bounds.width;
      handlePt.y = bounds.y + bounds.height / 2;
      const view = diagram.transformDocToView(handlePt);
      return {
        width: node.actualBounds.width,
        height: node.actualBounds.height,
        handleX: rect.left + view.x,
        handleY: rect.top + view.y
      };
    }, LONG_DESCRIPTION);

    await page.mouse.move(start.handleX, start.handleY);
    await page.mouse.down();
    await page.mouse.move(start.handleX + 80, start.handleY + 60, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const after = await page.evaluate(() => {
      const diagram = (window as any).__gojs_diagram;
      const node = diagram.findNodeForKey('resize-card');
      const body = node.findObject('CARD_BODY');
      return {
        width: node.actualBounds.width,
        height: node.actualBounds.height,
        storedSize: node.data.size,
        desiredHeightIsAuto: isNaN(body.desiredSize.height)
      };
    });

    // Wider by roughly the drag distance…
    expect(after.width).toBeGreaterThan(start.width + 60);
    // …and the vertical component of the drag was ignored: the height is still
    // whatever the text needs (wider card ⇒ fewer lines ⇒ shorter, not taller).
    expect(after.desiredHeightIsAuto).toBe(true);
    expect(after.height).toBeLessThan(start.height);
    expect(after.storedSize).toMatch(/^\d+ NaN$/);
  });
});
