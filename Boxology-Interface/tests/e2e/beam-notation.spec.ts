import { test, expect } from '@playwright/test';

async function dismissModal(page: any) {
  const gotItBtn = page.getByRole('button', { name: /GOT IT/i });
  if (await gotItBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await gotItBtn.click();
    await page.waitForTimeout(500);
  }
}

test.describe('BEAM Notation Integration', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
    await dismissModal(page);
  });

  test('BEAM View toggle button is visible in toolbar', async ({ page }) => {
    const beamToggle = page.getByRole('button', { name: /BEAM View/i });
    await expect(beamToggle).toBeVisible();
  });

  test('BEAM View toggle activates with cyan background', async ({ page }) => {
    const beamToggle = page.getByRole('button', { name: /BEAM View/i });

    // Get initial background color (inactive)
    const initialBg = await beamToggle.evaluate((el: HTMLElement) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Click to activate
    await beamToggle.click();
    await page.waitForTimeout(300);

    // Background should change to cyan (#89dceb = rgb(137, 220, 235))
    const activeBg = await beamToggle.evaluate((el: HTMLElement) =>
      window.getComputedStyle(el).backgroundColor
    );

    expect(activeBg).not.toBe(initialBg);
    expect(activeBg).toBe('rgb(137, 220, 235)');
  });

  test('BEAM View toggle deactivates on second click', async ({ page }) => {
    const beamToggle = page.getByRole('button', { name: /BEAM View/i });

    const initialBg = await beamToggle.evaluate((el: HTMLElement) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Toggle ON then OFF
    await beamToggle.click();
    await page.waitForTimeout(300);
    await beamToggle.click();
    await page.waitForTimeout(300);

    const finalBg = await beamToggle.evaluate((el: HTMLElement) =>
      window.getComputedStyle(el).backgroundColor
    );

    expect(finalBg).toBe(initialBg);
  });

  test('BEAM View button is positioned after SPARQL button', async ({ page }) => {
    const buttons = page.getByRole('button');
    const count = await buttons.count();

    let sparqlIdx = -1;
    let beamIdx = -1;
    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).innerText().catch(() => '');
      // Upstream added a right-sidebar nav button also containing 'SPARQL';
      // match the toolbar one specifically.
      if (text.includes('🔍 SPARQL')) sparqlIdx = i;
      if (text.includes('BEAM View')) beamIdx = i;
    }

    expect(sparqlIdx).toBeGreaterThan(-1);
    expect(beamIdx).toBeGreaterThan(-1);
    expect(beamIdx).toBeGreaterThan(sparqlIdx);
  });

  test('existing toolbar buttons are intact', async ({ page }) => {
    await expect(page.getByRole('button', { name: /🔍 SPARQL/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Create KG/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Undo/i })).toBeVisible();
  });

});
