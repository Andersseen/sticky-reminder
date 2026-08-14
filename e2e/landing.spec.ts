import { expect, test } from '@playwright/test';

test('the landing renders with the design system applied', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Sticky Reminder/);
  await expect(page.getByRole('heading', { name: 'Sticky Reminder', level: 1 })).toBeVisible();

  // The components hydrate and the tokens stylesheet resolved.
  const cta = page.locator('and-button[href="/download"] a');
  await expect(cta).toBeVisible();
  await expect(cta).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

  await expect(page.locator('and-card')).toHaveCount(5);
});

test('the download page is reachable from the hero', async ({ page }) => {
  await page.goto('/');
  await page.locator('and-button[href="/download"] a').click();

  await expect(page).toHaveURL(/\/download/);
  await expect(page.getByRole('heading', { name: 'Download Sticky Reminder' })).toBeVisible();
});
