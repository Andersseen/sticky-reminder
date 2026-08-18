import { expect, test } from '@playwright/test';

// The site is served from the root in dev and from /<repo>/ on Pages, so every
// internal link is matched by suffix rather than by an absolute path.
const installCta = 'and-button[href$="/download"] a';

test('the landing renders with the design system applied', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Sticky Reminder/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('actually reach you');

  // The components hydrate and the tokens stylesheet resolved.
  const cta = page.locator(installCta).first();
  await expect(cta).toBeVisible();
  await expect(cta).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

  await expect(page.locator('#features .tile')).toHaveCount(7);
  await expect(page.locator('#privacy .permission')).toHaveCount(3);
});

test('the FAQ answers are collapsed until asked for', async ({ page }) => {
  await page.goto('/');

  const first = page.locator('#faq details').first();
  await expect(first.locator('p')).toBeHidden();

  await first.locator('summary').click();
  await expect(first.locator('p')).toBeVisible();
});

test('the theme toggle overrides the system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');

  const root = page.locator('html');
  await expect(root).not.toHaveAttribute('data-mode', 'dark');

  await page.getByRole('button', { name: /light and dark/i }).click();
  await expect(root).toHaveAttribute('data-mode', 'dark');

  // The choice has to survive a reload, applied before the first paint.
  await page.reload();
  await expect(root).toHaveAttribute('data-mode', 'dark');
});

test('the download page is reachable from the hero', async ({ page }) => {
  await page.goto('/');
  await page.locator(installCta).first().click();

  await expect(page).toHaveURL(/\/download/);
  await expect(page.getByRole('heading', { name: 'Get Sticky Reminder' })).toBeVisible();
  await expect(page.locator('.install-card')).toHaveCount(2);
});

test('the public privacy policy is linked and describes local storage', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' }).click();

  await expect(page).toHaveURL(/\/privacy/);
  await expect(
    page.getByRole('heading', { name: 'Your reminders stay on your device' }),
  ).toBeVisible();
  await expect(
    page.getByText('does not collect, sell, share or transmit personal data'),
  ).toBeVisible();
  await expect(page.locator('.legal-permissions div')).toHaveCount(3);
});
