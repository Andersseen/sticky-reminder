import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const extensionRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const extensionPath = resolve(extensionRoot, '.output/chrome-mv3');
const profilePath = process.env.STICKY_REMINDER_PROFILE
  ? resolve(process.env.STICKY_REMINDER_PROFILE)
  : resolve(tmpdir(), 'sticky-reminder-manual-profile');

const args = process.argv.slice(2);
const smoke = args.includes('--smoke');
const target = args.find((arg) => !arg.startsWith('--')) ?? 'sidepanel';
const targetPages = new Set(['sidepanel', 'popup', 'options']);

if (!targetPages.has(target)) {
  console.error(`Unknown target "${target}". Use one of: ${[...targetPages].join(', ')}.`);
  process.exit(1);
}

if (!existsSync(resolve(extensionPath, 'manifest.json'))) {
  console.error(
    [
      'The Chromium extension build is missing.',
      'Run `pnpm --filter @sticky-reminder/extension build` first, then retry.',
    ].join('\n'),
  );
  process.exit(1);
}

await mkdir(profilePath, { recursive: true });

const context = await chromium.launchPersistentContext(profilePath, {
  channel: 'chromium',
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--no-first-run',
    '--no-default-browser-check',
  ],
});

const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
const extensionId = new URL(worker.url()).host;
const page = await context.newPage();

await page.goto(`chrome-extension://${extensionId}/${target}.html`);
await writeFile(
  resolve(profilePath, 'sticky-reminder-dev-browser.json'),
  `${JSON.stringify({ extensionId, openedAt: new Date().toISOString(), target }, null, 2)}\n`,
);

console.log(`Sticky Reminder loaded from ${extensionPath}`);
console.log(`Profile: ${profilePath}`);
console.log(`Opened: chrome-extension://${extensionId}/${target}.html`);

if (smoke) {
  await context.close();
  process.exit(0);
}

console.log('Close the Chromium window to stop this session.');
await context.waitForEvent('close');
