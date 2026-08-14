import { expect, test } from '@playwright/test';

test('web landing renders', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Sticky Reminder/);
});
