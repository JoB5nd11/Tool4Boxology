import { test } from '@playwright/test';

test('debug - full body text', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);

  // Dismiss modal
  const gotItBtn = page.getByRole('button', { name: /GOT IT/i });
  if (await gotItBtn.isVisible()) {
    await gotItBtn.click();
    await page.waitForTimeout(500);
  }

  const allText = await page.locator('body').innerText();
  // Find BEAM Concepts
  const idx = allText.indexOf('BEAM Concepts');
  console.log('BEAM Concepts index in body:', idx);
  if (idx >= 0) {
    console.log('Context around BEAM Concepts:', allText.slice(Math.max(0, idx - 50), idx + 200));
  }

  // Print full body text
  console.log('Full body text (first 1500):\n', allText.slice(0, 1500));

  await page.screenshot({ path: 'test-results/full-sidebar.png', fullPage: true });
});
