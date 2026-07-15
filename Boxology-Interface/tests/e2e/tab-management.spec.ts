import { test, expect } from '@playwright/test';

async function dismissModal(page: any) {
  const gotItBtn = page.getByRole('button', { name: /GOT IT/i });
  if (await gotItBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await gotItBtn.click();
    await page.waitForTimeout(500);
  }
}

test.describe('Tab management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);
  });

  test('the + button adds a tab and makes it active', async ({ page }) => {
    const tabs = page.getByTestId('page-tab');
    await expect(tabs).toHaveCount(1);

    await page.getByTestId('add-tab').click();
    await page.waitForTimeout(500);

    await expect(tabs).toHaveCount(2);
    // The new tab is the active one; the old tab is not.
    await expect(tabs.nth(1)).toHaveAttribute('data-active', 'true');
    await expect(tabs.nth(0)).toHaveAttribute('data-active', 'false');
  });

  test('tab names do not collide after closing a middle tab', async ({ page }) => {
    const tabs = page.getByTestId('page-tab');

    await page.getByTestId('add-tab').click();
    await page.getByTestId('add-tab').click();
    await page.getByTestId('add-tab').click();
    await page.waitForTimeout(500);
    await expect(tabs).toHaveCount(4);

    // Close the middle tab (index 2) via its × affordance.
    await tabs.nth(2).getByText('×').click();
    await page.waitForTimeout(500);
    await expect(tabs).toHaveCount(3);

    await page.getByTestId('add-tab').click();
    await page.waitForTimeout(500);
    await expect(tabs).toHaveCount(4);

    const names = await tabs.allInnerTexts();
    const cleaned = names.map((n) => n.replace(/×/g, '').trim());
    expect(new Set(cleaned).size).toBe(cleaned.length);
  });

  test('the active tab is visually distinct from inactive tabs', async ({ page }) => {
    await page.getByTestId('add-tab').click();
    await page.waitForTimeout(500);

    const tabs = page.getByTestId('page-tab');
    const activeBg = await tabs.nth(1).evaluate((el) => getComputedStyle(el).backgroundColor);
    const inactiveBg = await tabs.nth(0).evaluate((el) => getComputedStyle(el).backgroundColor);
    const activeBorder = await tabs.nth(1).evaluate((el) => getComputedStyle(el).borderTopColor);

    expect(activeBg).toBe('rgb(255, 255, 255)');
    expect(inactiveBg).toBe('rgb(207, 211, 216)');
    expect(activeBg).not.toBe(inactiveBg);
    expect(activeBorder).toBe('rgb(17, 9, 105)');
  });
});
