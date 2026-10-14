import { test, expect } from '@playwright/test';

// Frontend half of "every arrow maps to a relation": the dashed "Risk" arrow
// must reach the backend as dash:true, and must not count as a data flow
// when design patterns are built.
test('dashed arrows travel as dash:true and form no pattern roles', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas', { timeout: 15000 });

  const exported = await page.evaluate(async () => {
    const mod = await import('/src/utils/exportHelpers.ts');
    const nodes = [
      { key: 'g', isGroup: true, category: 'ClusterGroup', label: 'P' },
      { key: 'd', name: 'Data', type: 'Data', label: 'scans', group: 'g' },
      { key: 't', name: 'Train', type: 'Train', label: 'train', group: 'g' },
      { key: 'm', name: 'Model', type: 'Model', label: 'cnn', group: 'g' },
    ];
    const links = [
      { from: 'd', to: 't', dash: true },
      { from: 't', to: 'm' },
    ];
    return mod.generateMultiPageRMLExport([{ name: 'p', nodeDataArray: nodes, linkDataArray: links }]);
  });

  const box = exported.boxologies[0];
  expect(box.workflowLinks).toEqual([
    { from: 'd', to: 't', dash: true },
    { from: 't', to: 'm' },
  ]);
  const [pattern] = box.DesignPattern;
  expect(pattern.output.map((o: any) => o.id)).toEqual(['m']);      // solid arrow: output role
  expect((pattern.input ?? []).map((i: any) => i.id)).toEqual([]); // dashed arrow: no input role
});
