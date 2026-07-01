import { test, expect } from '@playwright/test';

async function dismissModal(page: any) {
  const gotItBtn = page.getByRole('button', { name: /GOT IT/i });
  if (await gotItBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await gotItBtn.click();
    await page.waitForTimeout(500);
  }
}

async function openExportMenu(page: any) {
  const exportBtn = page.getByRole('button', { name: /Export/i }).first();
  await exportBtn.click();
  await page.waitForTimeout(300);
}

async function loadGraphRAGExample(page: any) {
  const btn = page.getByRole('button', { name: /GraphRAG \(BEAM\)/i });
  await btn.click();
  await page.waitForTimeout(1500);
}

// ─── PNG / JPG ROBUSTNESS ──────────────────────────────────────────────────

test.describe('PNG export robustness', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      delete (window as any).showSaveFilePicker;
    });
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);
  });

  test('PNG export on empty diagram does not crash', async ({ page }) => {
    let alertMessage = '';
    page.on('dialog', async (dialog: any) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    await openExportMenu(page);
    await page.getByRole('button', { name: /PNG/i }).click();
    await page.waitForTimeout(1000);

    // Empty diagram may show an "empty" alert or silently skip —
    // the key assertion is no unhandled error.
    if (alertMessage) {
      expect(alertMessage).not.toContain('TypeError');
      expect(alertMessage).not.toContain('undefined');
    }
    // Page should still be responsive
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('PNG export succeeds with GraphRAG example (unclustered nodes are fine)', async ({ page }) => {
    await loadGraphRAGExample(page);

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    await openExportMenu(page);
    await page.getByRole('button', { name: /PNG/i }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.png');
  });

  test('PNG export skips clustering validation entirely', async ({ page }) => {
    await loadGraphRAGExample(page);

    let alertMessage = '';
    page.on('dialog', async (dialog: any) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    // Ensure no cluster error shown
    await openExportMenu(page);
    await page.getByRole('button', { name: /PNG/i }).click();
    await page.waitForTimeout(2000);

    expect(alertMessage).not.toContain('cluster');
  });
});

// ─── DOT EXPORT ROBUSTNESS ──────────────────────────────────────────────────

test.describe('DOT export robustness', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      delete (window as any).showSaveFilePicker;
    });
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);
  });

  test('DOT export on empty diagram does not crash', async ({ page }) => {
    let alertMessage = '';
    page.on('dialog', async (dialog: any) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    // DOT goes through clustering validation on an empty diagram —
    // there are zero nodes, so validation.valid should be true (no errors).
    // The DOT export should proceed and produce a minimal valid DOT string.
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

    await openExportMenu(page);
    const dotBtn = page.getByRole('button', { name: /DOT/i }).first();
    await dotBtn.click();
    await page.waitForTimeout(2000);

    // Either we got a download (empty but valid DOT) or a benign alert
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toContain('.dot');
    }
    // No crash — the key assertion
    expect(alertMessage).not.toContain('undefined');
    expect(alertMessage).not.toContain('TypeError');
  });

  test('DOT export with GraphRAG example: no longer blocked by clustering validation', async ({ page }) => {
    await loadGraphRAGExample(page);

    let alertMessage = '';
    page.on('dialog', async (dialog: any) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

    await openExportMenu(page);
    const dotBtn = page.getByRole('button', { name: /DOT/i }).first();
    await dotBtn.click();
    await page.waitForTimeout(1000);

    // GraphRAG has unclustered workflow nodes — clustering validation gate was removed,
    // so export should proceed without a clustering alert.
    const download = await downloadPromise;
    expect(alertMessage).not.toContain('cluster');
    expect(download).not.toBeNull();
  });

  test('DOT export with clustered workflow nodes + beamCard annotations should NOT be blocked', async ({ page }) => {
    // Programmatically create a minimal clustered diagram with a beamCard node
    await page.evaluate(() => {
      const diagramDiv = document.querySelector('[data-testid="gojs-diagram"]') || document.querySelector('canvas')?.parentElement;
      if (!diagramDiv) return;
      // Access the GoJS diagram through the React ref exposed on window for testing
      const diagram = (window as any).__gojs_diagram;
      if (!diagram) return;

      diagram.startTransaction('test-setup');
      const model = diagram.model;

      // Add a cluster group
      model.addNodeData({
        key: 'test_group_1',
        isGroup: true,
        category: 'ClusterGroup',
        label: 'Test Cluster'
      });

      // Add workflow nodes inside the cluster
      model.addNodeData({
        key: 'test_data_1',
        name: 'Data',
        type: 'Data',
        label: 'Input Data',
        shape: 'Rectangle',
        color: '#90ee90',
        group: 'test_group_1'
      });

      model.addNodeData({
        key: 'test_process_1',
        name: 'Infer',
        type: 'Infer',
        label: 'Process Step',
        shape: 'RoundedRectangle',
        color: '#fffacd',
        group: 'test_group_1'
      });

      model.addNodeData({
        key: 'test_output_1',
        name: 'Data',
        type: 'Data',
        label: 'Output Data',
        shape: 'Rectangle',
        color: '#90ee90',
        group: 'test_group_1'
      });

      // Add a beamCard annotation node (NOT in any cluster — by design)
      model.addNodeData({
        key: 'test_risk_1',
        category: 'beamCard',
        name: 'Risk',
        type: 'Risk',
        label: 'Risk: Test Risk',
        subtext: 'A test risk annotation',
        color: '#fff3e0',
        stroke: '#fb8c00'
      });

      // Links
      (model as any).addLinkData({ from: 'test_data_1', to: 'test_process_1' });
      (model as any).addLinkData({ from: 'test_process_1', to: 'test_output_1' });
      (model as any).addLinkData({ from: 'test_risk_1', to: 'test_process_1', category: 'annotation' });

      diagram.commitTransaction('test-setup');
    });

    await page.waitForTimeout(500);

    let alertMessage = '';
    page.on('dialog', async (dialog: any) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

    await openExportMenu(page);
    const dotBtn = page.getByRole('button', { name: /DOT/i }).first();
    await dotBtn.click();
    await page.waitForTimeout(2000);

    const download = await downloadPromise;

    // BUG CHECK: beamCard nodes should NOT trigger clustering validation.
    // If this test fails with an alert about clustering, that's the bug.
    if (alertMessage) {
      // If we got a clustering alert, it's because beamCard nodes are
      // falsely flagged as unclustered — this is the bug to fix.
      console.log('ALERT MESSAGE:', alertMessage);
    }

    // Expected: no clustering alert, download completes
    expect(alertMessage).not.toContain('cluster');
    expect(download).not.toBeNull();
  });
});

// ─── JSON EXPORT ROBUSTNESS ────────────────────────────────────────────────

test.describe('JSON export robustness', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      delete (window as any).showSaveFilePicker;
    });
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);
  });

  test('JSON export on empty diagram shows user-friendly alert', async ({ page }) => {
    let alertMessage = '';
    page.on('dialog', async (dialog: any) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    await openExportMenu(page);
    await page.getByRole('button', { name: /JSON/i }).click();
    await page.waitForTimeout(1500);

    // Should show "All diagrams are empty" via the try/catch, not an unhandled exception
    expect(alertMessage).toContain('empty');
    expect(alertMessage).not.toContain('TypeError');
  });

  test('JSON export with clustered workflow nodes + beamCard annotations should NOT be blocked', async ({ page }) => {
    // Same setup as the DOT test above: properly clustered + beamCard
    await page.evaluate(() => {
      const diagram = (window as any).__gojs_diagram;
      if (!diagram) return;

      diagram.startTransaction('test-setup');
      const model = diagram.model;

      model.addNodeData({
        key: 'test_group_1',
        isGroup: true,
        category: 'ClusterGroup',
        label: 'Test Cluster'
      });

      model.addNodeData({
        key: 'test_data_1',
        name: 'Data', type: 'Data',
        label: 'Input Data', shape: 'Rectangle',
        color: '#90ee90', group: 'test_group_1'
      });

      model.addNodeData({
        key: 'test_process_1',
        name: 'Infer', type: 'Infer',
        label: 'Process Step', shape: 'RoundedRectangle',
        color: '#fffacd', group: 'test_group_1'
      });

      model.addNodeData({
        key: 'test_output_1',
        name: 'Data', type: 'Data',
        label: 'Output Data', shape: 'Rectangle',
        color: '#90ee90', group: 'test_group_1'
      });

      model.addNodeData({
        key: 'test_risk_1',
        category: 'beamCard',
        name: 'Risk', type: 'Risk',
        label: 'Risk: Test Risk',
        subtext: 'A test risk annotation',
        color: '#fff3e0', stroke: '#fb8c00'
      });

      (model as any).addLinkData({ from: 'test_data_1', to: 'test_process_1' });
      (model as any).addLinkData({ from: 'test_process_1', to: 'test_output_1' });
      (model as any).addLinkData({ from: 'test_risk_1', to: 'test_process_1', category: 'annotation' });

      diagram.commitTransaction('test-setup');
    });

    await page.waitForTimeout(500);

    let alertMessage = '';
    page.on('dialog', async (dialog: any) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

    await openExportMenu(page);
    await page.getByRole('button', { name: /JSON/i }).click();
    await page.waitForTimeout(2000);

    const download = await downloadPromise;

    // BUG CHECK: beamCard nodes should NOT trigger clustering validation.
    if (alertMessage) {
      console.log('JSON ALERT MESSAGE:', alertMessage);
    }

    expect(alertMessage).not.toContain('cluster');
    expect(download).not.toBeNull();
  });
});

// ─── CREATE KG ROBUSTNESS ──────────────────────────────────────────────────

test.describe('Create KG — no cluster required', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);
  });

  test('Create KG does not block on unclustered nodes', async ({ page }) => {
    await loadGraphRAGExample(page);

    await page.route('**/api/kg', async (route: any) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', mode: 'test', triples_len: 10 }) });
    });

    const createKgBtn = page.getByRole('button', { name: /Create KG/i });
    await createKgBtn.click();
    await page.waitForTimeout(1000);

    await expect(page.getByText(/does not belong to any cluster/i)).toHaveCount(0);
  });
});
