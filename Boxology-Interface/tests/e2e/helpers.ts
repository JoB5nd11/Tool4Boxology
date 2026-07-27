import type { Page } from '@playwright/test';

/**
 * Upstream reorganised the right sidebar into collapsible sections ('howto',
 * 'examples', 'query', 'style', 'symbols') and 'howto' is the default. The
 * Boxology example buttons (Pain Classification / MRI Segmentation / GraphRAG
 * (BEAM)) therefore aren't mounted until the Examples section is opened.
 *
 * Call this before interacting with any example button. It is idempotent: if
 * the section is already open it returns immediately.
 */
export async function openExamplesSection(page: Page) {
  const anExample = page.getByRole('button', { name: /Pain Classification/i });
  if (await anExample.isVisible({ timeout: 1000 }).catch(() => false)) return;

  // The intro dialog can sit over the sidebar and swallow the nav click.
  const gotIt = page.getByRole('button', { name: /GOT IT/i });
  if (await gotIt.isVisible({ timeout: 1000 }).catch(() => false)) {
    await gotIt.click();
  }

  const nav = page.getByRole('button', { name: /Load sample diagrams/i });
  await nav.waitFor({ state: 'visible', timeout: 10000 });
  await nav.click();
  await anExample.waitFor({ state: 'visible', timeout: 10000 });
}
