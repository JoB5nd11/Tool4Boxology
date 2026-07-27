import { test, expect } from '@playwright/test';
import { openExamplesSection } from './helpers';

async function dismissModal(page: any) {
  const gotItBtn = page.getByRole('button', { name: /GOT IT/i });
  if (await gotItBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await gotItBtn.click();
    await page.waitForTimeout(500);
  }
}

test.describe('Boxology example buttons append a tab (do not replace)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);
  });

  test('loading an example adds a new tab and keeps the existing one', async ({ page }) => {
    const tabs = page.getByTestId('page-tab');
    await expect(tabs).toHaveCount(1);

    await openExamplesSection(page);
    await page.getByRole('button', { name: /Pain Classification/i }).click();
    await page.waitForTimeout(1000);

    // A second tab now exists...
    await expect(tabs).toHaveCount(2);
    // ...the original "Diagram" tab survives...
    await expect(page.getByTestId('page-tab').filter({ hasText: 'Diagram' })).toHaveCount(1);
    // ...and the example's own tab is present and active.
    await expect(page.getByTestId('page-tab').filter({ hasText: 'Pain-Classification' })).toHaveCount(1);
  });

  test('loading two examples yields three distinct tabs', async ({ page }) => {
    await openExamplesSection(page);
    await page.getByRole('button', { name: /Pain Classification/i }).click();
    await page.waitForTimeout(800);
    await openExamplesSection(page);
    await page.getByRole('button', { name: /MRI Segmentation/i }).click();
    await page.waitForTimeout(800);

    await expect(page.getByTestId('page-tab')).toHaveCount(3);
    await expect(page.getByTestId('page-tab').filter({ hasText: 'Pain-Classification' })).toHaveCount(1);
    // Upstream renamed this example's boxologyLabel to 'MRI-seg-Example';
    // the tab takes its name from that label.
    await expect(page.getByTestId('page-tab').filter({ hasText: 'MRI-seg-Example' })).toHaveCount(1);
  });

  test('the leftover blank tab can be closed with its × button', async ({ page }) => {
    await openExamplesSection(page);
    await page.getByRole('button', { name: /Pain Classification/i }).click();
    await page.waitForTimeout(800);
    await expect(page.getByTestId('page-tab')).toHaveCount(2);

    // Close the original blank "Diagram" tab via its × control.
    const blankTab = page.getByTestId('page-tab').filter({ hasText: 'Diagram' });
    await blankTab.getByText('×').click();
    await page.waitForTimeout(400);

    // Only the example tab remains.
    await expect(page.getByTestId('page-tab')).toHaveCount(1);
    await expect(page.getByTestId('page-tab').filter({ hasText: 'Pain-Classification' })).toHaveCount(1);
  });

  test('loading the same example twice does not collide (two separate tabs)', async ({ page }) => {
    await openExamplesSection(page);
    await page.getByRole('button', { name: /Pain Classification/i }).click();
    await page.waitForTimeout(800);
    await openExamplesSection(page);
    await page.getByRole('button', { name: /Pain Classification/i }).click();
    await page.waitForTimeout(800);

    // 1 blank + 2 example loads = 3 tabs; the two Pain tabs are independent.
    await expect(page.getByTestId('page-tab')).toHaveCount(3);
    await expect(page.getByTestId('page-tab').filter({ hasText: 'Pain-Classification' })).toHaveCount(2);
  });
});
