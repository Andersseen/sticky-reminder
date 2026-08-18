import { type BrowserContext, type Page, expect, test } from '@playwright/test';
import { loadExtension } from './extension';

let context: BrowserContext;
let extensionId: string;

test.describe.configure({ mode: 'serial' });

const HOUR = 60 * 60 * 1000;

/** Two pending (one of them late) and one done, so every counter has a value. */
const REMINDERS = [
  {
    id: 'late',
    title: 'Water the plants',
    body: 'The ones on the balcony',
    scheduledAt: new Date(Date.now() - 2 * HOUR).toISOString(),
    repeat: 'weekly',
    completed: false,
  },
  {
    id: 'soon',
    title: 'Daily standup',
    body: 'Join the team call',
    scheduledAt: new Date(Date.now() + HOUR).toISOString(),
    repeat: 'daily',
    completed: false,
  },
  {
    id: 'done',
    title: 'Renew the domain',
    body: '',
    scheduledAt: new Date(Date.now() - 30 * HOUR).toISOString(),
    repeat: 'none',
    completed: true,
  },
].map((r) => ({ ...r, createdAt: r.scheduledAt, updatedAt: r.scheduledAt }));

test.beforeAll(async () => {
  test.setTimeout(120_000);
  ({ context, extensionId } = await loadExtension());
});

test.afterAll(async () => {
  await context?.close();
});

async function openOptions(query = ''): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.evaluate(async (reminders) => {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({
      'stickyReminder.schemaVersion': 1,
      ...Object.fromEntries(
        reminders.map((reminder) => [`stickyReminder.reminder.${reminder.id}`, reminder]),
      ),
    });
  }, REMINDERS);

  // Reload with the query string in place: the highlight is read once, at load.
  await page.goto(`chrome-extension://${extensionId}/options.html${query}`);
  return page;
}

test('the counters describe the whole list', async () => {
  const page = await openOptions();

  await expect(page.locator('[data-stat="total"]')).toHaveText('3');
  await expect(page.locator('[data-stat="pending"]')).toHaveText('2');
  await expect(page.locator('[data-stat="overdue"]')).toHaveText('1');
  await expect(page.locator('[data-stat="completed"]')).toHaveText('1');
  await expect(page.locator('sr-reminder-item')).toHaveCount(3);

  await page.close();
});

test('filtering and searching narrow the same list', async () => {
  const page = await openOptions();

  await page.locator('[data-filter="completed"]').click();
  await expect(page.locator('sr-reminder-item')).toHaveCount(1);
  await expect(page.locator('sr-reminder-item')).toContainText('Renew the domain');

  await page.locator('[data-filter="all"]').click();
  await page.locator('#search').fill('balcony');

  // The note is searched, not just the title.
  await expect(page.locator('sr-reminder-item')).toHaveCount(1);
  await expect(page.locator('sr-reminder-item')).toContainText('Water the plants');

  await page.locator('#search').fill('nothing matches this');
  await expect(page.locator('#reminders')).toContainText('No matches');

  await page.close();
});

test('a reminder opened from its notification is called out', async () => {
  const page = await openOptions('?reminder=soon');

  await expect(page.locator('[data-id="soon"]')).toHaveClass(/is-highlighted/);
  await expect(page.locator('[data-id="late"]')).not.toHaveClass(/is-highlighted/);

  await page.close();
});

test('deleting from the options page clears the alarm too', async () => {
  const page = await openOptions();
  await page.evaluate(async () => {
    await chrome.alarms.create('reminder-soon', { when: Date.now() + 60_000 });
  });

  await page.locator('[data-id="soon"] [aria-label="Delete reminder"] button').click();

  await expect(page.locator('sr-reminder-item')).toHaveCount(2);
  expect(await page.evaluate(() => chrome.alarms.getAll())).toHaveLength(0);

  await page.close();
});

test('an existing v0.1.0 reminder is migrated on first load', async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.evaluate(async (reminder) => {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({ reminders: [reminder] });
  }, REMINDERS[1]);

  await page.reload();

  await expect(page.locator('sr-reminder-item')).toHaveCount(1);
  await expect(page.locator('sr-reminder-item')).toContainText('Daily standup');
  const keys = await page.evaluate(async () => Object.keys(await chrome.storage.local.get(null)));
  expect(keys).not.toContain('reminders');
  expect(keys.some((key) => key.startsWith('stickyReminder.reminder.'))).toBe(true);

  await page.close();
});
