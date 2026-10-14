import { test, expect, type Page } from '@playwright/test';

async function dismissModal(page: Page) {
  const gotItBtn = page.getByRole('button', { name: /GOT IT/i });
  if (await gotItBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await gotItBtn.click();
    await page.waitForTimeout(500);
  }
}

const VERSION = { iri: 'http://w3id.org/beam/core#version', label: 'version', datatype: 'xsd:string' };

const model = {
  key: 'm1', name: 'Model', type: 'Model', label: 'CNN',
  shape: 'Hexagon', color: '#add8e6', stroke: '#1c6ea4', loc: '200 200'
};
const card = {
  key: 'c1', category: 'beamCard', name: 'Risk', type: 'Risk', label: 'Data from one hospital',
  subtext: 'Bias', color: '#fff3e0', stroke: '#fb8c00', loc: '500 100'
};

async function open(page: Page, schema: 'ok' | 'down' = 'ok') {
  await page.route('**/api/schema/properties', (route) =>
    schema === 'ok'
      ? route.fulfill({ json: { classes: { Model: [VERSION] } } })
      : route.abort()
  );
  await page.goto('/');
  await page.waitForSelector('canvas', { timeout: 15000 });
  await dismissModal(page);
}

async function addNodes(page: Page, ...nodes: any[]) {
  await page.evaluate((nodes) => {
    const diagram = (window as any).__gojs_diagram;
    nodes.forEach((n: any) => diagram.model.addNodeData({ ...n }));
    diagram.maybeUpdate();
  }, nodes);
}

/** Double-click a node at a fraction of its main shape (default: below the
 *  label; pass a small fy to hit a card's title). */
async function dblclickNode(page: Page, key: string, fx = 0.5, fy = 0.85) {
  const pt = await page.evaluate(({ key, fx, fy }) => {
    const diagram = (window as any).__gojs_diagram;
    const node = diagram.findNodeForKey(key);
    const b = node.findMainElement().getDocumentBounds();
    const doc = b.position.copy().offset(b.width * fx, b.height * fy);
    const view = diagram.transformDocToView(doc);
    const rect = diagram.div.getBoundingClientRect();
    return { x: rect.left + view.x, y: rect.top + view.y };
  }, { key, fx, fy });
  await page.mouse.dblclick(pt.x, pt.y);
}

const nodeData = (page: Page, key: string) =>
  page.evaluate((key) => {
    const node = (window as any).__gojs_diagram.findNodeForKey(key);
    const pill = node.findObject('PROPS_PILL');
    return {
      props: node.data.props,
      pillVisible: pill?.visible,
      pillText: node.findObject('PROPS_PILL_TEXT')?.text
    };
  }, key);

async function addCustom(page: Page, name: string, type: string, value: string) {
  await page.getByRole('button', { name: 'Add custom' }).click();
  const row = page.getByTestId('prop-row').last();
  await row.getByLabel('Name').fill(name);
  await row.getByRole('combobox', { name: 'Type' }).click();
  await page.getByRole('option', { name: type, exact: true }).click();
  await row.getByLabel('Value').fill(value);
}

test.describe('Data properties', () => {
  test('double-click opens the dialog with schema properties for the type', async ({ page }) => {
    await open(page);
    await addNodes(page, model);
    await dblclickNode(page, 'm1');
    const dialog = page.getByTestId('data-properties-dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('combobox', { name: 'Add property' }).click();
    await page.getByRole('option', { name: 'version' }).click();
    await expect(dialog.getByTestId('prop-row')).toHaveCount(1);
    await dialog.getByTestId('prop-row').getByLabel('version').fill('2.1');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();
    expect((await nodeData(page, 'm1')).props).toEqual([{ ...VERSION, value: '2.1' }]);
  });

  test('custom property is saved and the pill shows the count', async ({ page }) => {
    await open(page);
    await addNodes(page, model);
    expect((await nodeData(page, 'm1')).pillVisible).toBe(false);
    await dblclickNode(page, 'm1');
    await addCustom(page, 'gpu hours', 'Integer', '12');
    await page.getByRole('button', { name: 'Save' }).click();
    const d = await nodeData(page, 'm1');
    expect(d.props).toEqual([{ iri: null, label: 'gpu hours', datatype: 'xsd:integer', value: '12' }]);
    expect(d.pillVisible).toBe(true);
    expect(d.pillText).toBe('1 prop');
  });

  test('invalid value blocks Save; Cancel discards', async ({ page }) => {
    await open(page);
    await addNodes(page, model);
    await dblclickNode(page, 'm1');
    await addCustom(page, 'accuracy', 'Decimal', '0,87');
    await expect(page.getByText('Number expected, e.g. 0.87')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    await page.getByRole('button', { name: 'Cancel' }).click();
    expect((await nodeData(page, 'm1')).props).toBeUndefined();
  });

  test('custom names that clash or are empty block Save', async ({ page }) => {
    await open(page);
    await addNodes(page, model);
    await dblclickNode(page, 'm1');
    await addCustom(page, 'a', 'Text', 'x');
    await addCustom(page, 'A!', 'Text', 'y');
    await expect(page.getByText('Same name as another property')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    await page.getByTestId('prop-row').last().getByLabel('Name').fill('!!!');
    await expect(page.getByText('Name needs a letter or digit')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('schema unavailable still allows custom properties', async ({ page }) => {
    await open(page, 'down');
    await addNodes(page, model);
    await dblclickNode(page, 'm1');
    await expect(page.getByText('Schema unavailable — custom properties only')).toBeVisible();
    await addCustom(page, 'owner', 'Text', 'lab');
    await page.getByRole('button', { name: 'Save' }).click();
    expect((await nodeData(page, 'm1')).props).toHaveLength(1);
  });

  test('double-click on a card title opens the dialog, not the text editor', async ({ page }) => {
    await open(page);
    await addNodes(page, card);
    await dblclickNode(page, 'c1', 0.3, 0.15);
    await expect(page.getByTestId('data-properties-dialog')).toBeVisible();
    const editing = await page.evaluate(() =>
      (window as any).__gojs_diagram.currentTool instanceof (window as any).__gojs_diagram.toolManager.textEditingTool.constructor);
    expect(editing).toBe(false);
  });

  // Regression: a click on a selected card's text starts in-place editing, so
  // the second click of the double-click used to land in the text editor and
  // the dialog never opened.
  for (const preselected of [false, true]) {
    test(`double-click on a card description opens the dialog (preselected: ${preselected})`, async ({ page }) => {
      await open(page);
      await addNodes(page, card);
      if (preselected) {
        await page.evaluate(() => {
          const d = (window as any).__gojs_diagram;
          d.select(d.findNodeForKey('c1'));
        });
      }
      await dblclickNode(page, 'c1', 0.5, 0.75);
      await expect(page.getByTestId('data-properties-dialog')).toBeVisible();
      const state = await page.evaluate(() => {
        const d = (window as any).__gojs_diagram;
        return {
          editing: d.currentTool === d.toolManager.textEditingTool,
          subtext: d.findNodeForKey('c1').data.subtext
        };
      });
      expect(state).toEqual({ editing: false, subtext: 'Bias' });
    });
  }

  test('a stored property the schema no longer lists is still shown', async ({ page }) => {
    await open(page);
    await addNodes(page, { ...model, props: [
      { iri: 'http://example.org/dropped', label: 'legacyScore', datatype: 'xsd:decimal', value: '3' }
    ] });
    await dblclickNode(page, 'm1');
    await expect(page.getByTestId('prop-row').getByLabel('legacyScore')).toHaveValue('3');
  });

  test('card props travel in the export payload', async ({ page }) => {
    await open(page);
    const exported = await page.evaluate(async (card) => {
      const mod = await import('/src/utils/exportHelpers.ts');
      const props = [{ iri: null, label: 'odds', datatype: 'xsd:string', value: 'low' }];
      return mod.generateMultiPageRMLExport([{ name: 'p', nodeDataArray: [{ ...card, props }], linkDataArray: [] }]);
    }, card);
    expect(exported.boxologies[0].annotations[0].props).toEqual([
      { iri: null, label: 'odds', datatype: 'xsd:string', value: 'low' }
    ]);
  });
});
