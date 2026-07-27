import { test, expect } from '@playwright/test';
import { openExamplesSection } from './helpers';

async function dismissModal(page: any) {
  const gotItBtn = page.getByRole('button', { name: /GOT IT/i });
  if (await gotItBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await gotItBtn.click();
    await page.waitForTimeout(500);
  }
}

test.describe('BEAM Annotation & Risk palette groups', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);
  });

  test('BEAM Annotation group appears in left sidebar', async ({ page }) => {
    await expect(page.getByText('BEAM Annotation')).toBeVisible();
  });

  test('BEAM Risk group appears in left sidebar', async ({ page }) => {
    await expect(page.getByText('BEAM Risk')).toBeVisible();
  });

  test('BEAM Annotation group expands to show System, Context, Note', async ({ page }) => {
    await page.getByText('BEAM Annotation').click();
    await page.waitForTimeout(400);
    await expect(page.getByText('System').first()).toBeVisible();
    await expect(page.getByText('Context').first()).toBeVisible();
    await expect(page.getByText('Note').first()).toBeVisible();
  });

  test('BEAM Risk group expands to show all five risk elements', async ({ page }) => {
    await page.getByText('BEAM Risk').click();
    await page.waitForTimeout(400);
    await expect(page.getByText('Risk').first()).toBeVisible();
    await expect(page.getByText('Risk Source').first()).toBeVisible();
    await expect(page.getByText('Consequence').first()).toBeVisible();
    await expect(page.getByText('Impact').first()).toBeVisible();
    await expect(page.getByText('Risk Control').first()).toBeVisible();
  });

  test('BEAM Concepts group no longer appears in left sidebar (deduped)', async ({ page }) => {
    await expect(page.getByText('BEAM Concepts')).toHaveCount(0);
  });
});

test.describe('GraphRAG Example loader (right sidebar)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);
  });

  test('GraphRAG (BEAM) button is visible in right sidebar Boxology example section', async ({ page }) => {
    await openExamplesSection(page);
    await expect(page.getByRole('button', { name: /GraphRAG \(BEAM\)/i })).toBeVisible();
  });

  test('Pain Classification and MRI Segmentation buttons also present', async ({ page }) => {
    await openExamplesSection(page);
    await expect(page.getByRole('button', { name: /Pain Classification/i })).toBeVisible();
    await openExamplesSection(page);
    await expect(page.getByRole('button', { name: /MRI Segmentation/i })).toBeVisible();
  });

  test('clicking GraphRAG (BEAM) loads the diagram into the canvas', async ({ page }) => {
    await openExamplesSection(page);
    await page.getByRole('button', { name: /GraphRAG \(BEAM\)/i }).click();
    await page.waitForTimeout(1500);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});
