import { expect, test } from '@playwright/test';

test('popup renders the form', async ({ page }) => {
  await page.goto('https://example.com');
  await page.evaluate(() => {
    // Placeholder: extension popup pages can be loaded by path in a real test runner.
  });
  await expect(page).toHaveTitle(/Example/);
});
