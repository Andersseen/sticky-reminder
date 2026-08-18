import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const extensionPath = fileURLToPath(new URL('../.output/chrome-mv3/', import.meta.url));
const assetsDirectory = fileURLToPath(new URL('../../../.github/store-assets/', import.meta.url));
const iconPath = fileURLToPath(new URL('../public/icon/128.png', import.meta.url));

const HOUR = 60 * 60 * 1000;
const now = Date.now();
const reminders = [
  {
    id: 'weekly-review',
    title: 'Weekly review',
    body: 'Close the week and choose Monday’s priorities',
    scheduledAt: new Date(now + 2 * HOUR).toISOString(),
    repeat: 'weekly',
    completed: false,
  },
  {
    id: 'water-plants',
    title: 'Water the plants',
    body: 'The ones on the balcony',
    scheduledAt: new Date(now - 3 * HOUR).toISOString(),
    repeat: 'none',
    completed: false,
  },
  {
    id: 'renew-domain',
    title: 'Renew the domain',
    body: '',
    scheduledAt: new Date(now - 30 * HOUR).toISOString(),
    repeat: 'none',
    completed: true,
  },
].map((reminder) => ({
  ...reminder,
  createdAt: reminder.scheduledAt,
  updatedAt: reminder.scheduledAt,
}));

await mkdir(assetsDirectory, { recursive: true });

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});

try {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();

  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.evaluate(async (data) => {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({
      'stickyReminder.schemaVersion': 1,
      ...Object.fromEntries(
        data.map((reminder) => [`stickyReminder.reminder.${reminder.id}`, reminder]),
      ),
    });
  }, reminders);
  await page.reload();
  await page.locator('sr-reminder-item').first().waitFor();
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.screenshot({
    path: `${assetsDirectory}/screenshot-options-light.png`,
    animations: 'disabled',
  });

  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.screenshot({
    path: `${assetsDirectory}/screenshot-options-dark.png`,
    animations: 'disabled',
  });

  const icon = (await readFile(iconPath)).toString('base64');
  const promo = await context.newPage();
  await promo.setViewportSize({ width: 440, height: 280 });
  await promo.setContent(`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          html, body { width: 440px; height: 280px; margin: 0; overflow: hidden; }
          body {
            display: grid;
            place-items: center;
            color: #eef2ff;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background:
              radial-gradient(circle at 82% 18%, rgba(244, 114, 182, .32), transparent 31%),
              radial-gradient(circle at 18% 88%, rgba(129, 140, 248, .38), transparent 36%),
              #17172b;
          }
          main { width: 100%; padding: 34px 38px; }
          .brand { display: flex; align-items: center; gap: 12px; }
          img { width: 46px; height: 46px; border-radius: 12px; box-shadow: 0 14px 30px rgba(0,0,0,.3); }
          .name { font-size: 18px; font-weight: 720; letter-spacing: -.02em; }
          h1 { max-width: 350px; margin: 25px 0 13px; font-size: 34px; line-height: 1.04; letter-spacing: -.045em; }
          h1 span { color: #a5b4fc; }
          p { margin: 0; color: #c7c9dc; font-size: 15px; line-height: 1.45; }
          .pill { display: inline-block; margin-top: 20px; padding: 6px 11px; border: 1px solid rgba(199,201,220,.22); border-radius: 999px; color: #dfe3ff; font-size: 12px; font-weight: 650; }
        </style>
      </head>
      <body>
        <main>
          <div class="brand">
            <img src="data:image/png;base64,${icon}" alt="">
            <span class="name">Sticky Reminder</span>
          </div>
          <h1>Reminders that <span>actually reach you.</span></h1>
          <p>One click. Native notifications. Stored locally.</p>
          <span class="pill">Private · Open source</span>
        </main>
      </body>
    </html>`);
  await promo.screenshot({ path: `${assetsDirectory}/promo-small.png` });
} finally {
  await context.close();
}
