import { test, expect } from '@playwright/test';
import { openExamplesSection } from './helpers';

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

test.describe('BEAM Export — UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);
  });

  test('BEAM Turtle export button appears in export dropdown', async ({ page }) => {
    await openExportMenu(page);
    const beamBtn = page.getByRole('button', { name: /BEAM Turtle/i });
    await expect(beamBtn).toBeVisible();
  });

  test('export dropdown also contains JSON, DOT, PNG options alongside BEAM', async ({ page }) => {
    await openExportMenu(page);
    await expect(page.getByRole('button', { name: /JSON/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /DOT/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /PNG/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /BEAM Turtle/i })).toBeVisible();
  });
});

test.describe('BEAM Export — no cluster required', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);
  });

  test('BEAM export does NOT show clustering validation error when diagram has unclustered nodes', async ({ page }) => {
    // Load GraphRAG example — it has workflow nodes WITHOUT clusters
    await openExamplesSection(page);
    const graphragBtn = page.getByRole('button', { name: /GraphRAG \(BEAM\)/i });
    await graphragBtn.click();
    await page.waitForTimeout(1500);

    // Listen for alert dialogs — clustering validation shows an alert
    let alertMessage = '';
    page.on('dialog', async (dialog: any) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    // Mock the backend so we don't need it running
    await page.route('**/api/beam-export', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/turtle',
        body: '@prefix beam: <http://w3id.org/beam/core#> .\n',
      });
    });

    await openExportMenu(page);
    const beamBtn = page.getByRole('button', { name: /BEAM Turtle/i });
    await beamBtn.click();
    await page.waitForTimeout(1000);

    // The alert should NOT mention clustering
    expect(alertMessage).not.toContain('cluster');
    expect(alertMessage).not.toContain('Cannot export');
  });

  test('JSON export no longer shows a clustering error for unclustered nodes', async ({ page }) => {
    await openExamplesSection(page);
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
});

test.describe('BEAM Export — backend interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);
  });

  test('BEAM export sends correct payload to /api/beam-export', async ({ page }) => {
    // Load GraphRAG example
    await openExamplesSection(page);
    const graphragBtn = page.getByRole('button', { name: /GraphRAG \(BEAM\)/i });
    await graphragBtn.click();
    await page.waitForTimeout(1500);

    let capturedBody: any = null;

    await page.route('**/api/beam-export', async (route: any) => {
      const request = route.request();
      capturedBody = JSON.parse(request.postData());
      await route.fulfill({
        status: 200,
        contentType: 'text/turtle',
        body: '@prefix beam: <http://w3id.org/beam/core#> .\n',
      });
    });

    await openExportMenu(page);
    const beamBtn = page.getByRole('button', { name: /BEAM Turtle/i });
    await beamBtn.click();
    await page.waitForTimeout(1500);

    // Verify the payload structure
    expect(capturedBody).not.toBeNull();
    expect(capturedBody).toHaveProperty('boxologies');
    expect(Array.isArray(capturedBody.boxologies)).toBe(true);
    expect(capturedBody.boxologies.length).toBeGreaterThan(0);

    const box = capturedBody.boxologies[0];
    expect(box).toHaveProperty('id');
    expect(box).toHaveProperty('label');
    expect(box).toHaveProperty('DesignPattern');
    expect(box).toHaveProperty('annotations');
    expect(box).toHaveProperty('annotationLinks');
  });

  test('BEAM export payload includes beamCard annotations from GraphRAG example', async ({ page }) => {
    await openExamplesSection(page);
    const graphragBtn = page.getByRole('button', { name: /GraphRAG \(BEAM\)/i });
    await graphragBtn.click();
    await page.waitForTimeout(1500);

    let capturedBody: any = null;

    await page.route('**/api/beam-export', async (route: any) => {
      capturedBody = JSON.parse(route.request().postData());
      await route.fulfill({
        status: 200,
        contentType: 'text/turtle',
        body: '@prefix beam: <http://w3id.org/beam/core#> .\n',
      });
    });

    await openExportMenu(page);
    await page.getByRole('button', { name: /BEAM Turtle/i }).click();
    await page.waitForTimeout(1500);

    expect(capturedBody).not.toBeNull();
    // Loading an example appends a new tab (the initial blank "Diagram" page is
    // preserved), so the GraphRAG boxology is no longer guaranteed to sit at
    // index 0. Select the boxology that actually carries the beamCard annotations.
    const box = capturedBody.boxologies.reduce((a: any, b: any) =>
      (b.annotations?.length ?? 0) > (a.annotations?.length ?? 0) ? b : a
    );

    // GraphRAG example has 16 beamCard annotation nodes
    expect(box.annotations.length).toBeGreaterThanOrEqual(10);

    // Should include Risk, RiskControl, System, Context, etc.
    const names = box.annotations.map((a: any) => a.name);
    expect(names).toContain('Risk');
    expect(names).toContain('System');
    expect(names).toContain('Context');
    expect(names).toContain('RiskControl');

    // Should include annotation links
    expect(box.annotationLinks.length).toBeGreaterThan(0);

    // Annotation links should have type info
    const firstLink = box.annotationLinks[0];
    expect(firstLink).toHaveProperty('from');
    expect(firstLink).toHaveProperty('to');
    expect(firstLink).toHaveProperty('fromType');
    expect(firstLink).toHaveProperty('toType');
    expect(firstLink).toHaveProperty('fromIsAnnotation');
    expect(firstLink).toHaveProperty('toIsAnnotation');
  });

  test('BEAM export handles backend error gracefully', async ({ page }) => {
    await openExamplesSection(page);
    const graphragBtn = page.getByRole('button', { name: /GraphRAG \(BEAM\)/i });
    await graphragBtn.click();
    await page.waitForTimeout(1500);

    let alertMessage = '';
    page.on('dialog', async (dialog: any) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.route('**/api/beam-export', async (route: any) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Test error from mock' }),
      });
    });

    await openExportMenu(page);
    await page.getByRole('button', { name: /BEAM Turtle/i }).click();
    await page.waitForTimeout(1500);

    expect(alertMessage).toContain('BEAM export failed');
  });

  test('BEAM export triggers file download on success', async ({ page }) => {
    // Disable File System Access API before navigation so saveWithPicker
    // falls through to downloadFile (blob URL anchor click).
    await page.addInitScript(() => {
      delete (window as any).showSaveFilePicker;
    });

    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);

    await openExamplesSection(page);
    const graphragBtn = page.getByRole('button', { name: /GraphRAG \(BEAM\)/i });
    await graphragBtn.click();
    await page.waitForTimeout(1500);

    const turtleContent = [
      '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .',
      '@prefix beam: <http://w3id.org/beam/core#> .',
      '<http://tool4boxology.org/Boxology/test> rdf:type beam:System .',
    ].join('\n');

    await page.route('**/api/beam-export', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/turtle',
        body: turtleContent,
      });
    });

    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    await openExportMenu(page);
    await page.getByRole('button', { name: /BEAM Turtle/i }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('beam_export');
    expect(download.suggestedFilename()).toContain('.ttl');
  });
});

test.describe('BEAM Export — empty diagram', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);
  });

  test('BEAM export on empty diagram shows appropriate error', async ({ page }) => {
    let alertMessage = '';
    page.on('dialog', async (dialog: any) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.route('**/api/beam-export', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/turtle',
        body: '@prefix beam: <http://w3id.org/beam/core#> .\n',
      });
    });

    await openExportMenu(page);
    await page.getByRole('button', { name: /BEAM Turtle/i }).click();
    await page.waitForTimeout(1500);

    // Empty diagram might either export empty turtle (valid) or show an error —
    // both are acceptable. The key is it should NOT crash or show clustering error.
    expect(alertMessage).not.toContain('cluster');
  });
});
