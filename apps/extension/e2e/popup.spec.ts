import { type BrowserContext, type Page, expect, test } from '@playwright/test';
import { loadExtension } from './extension';

const REPEAT_LABELS = {
  none: 'Does not repeat',
  daily: 'Every day',
  weekly: 'Every week',
} as const;

let context: BrowserContext;
let extensionId: string;

// One browser for the whole file: launching a persistent context per test is
// slow, and they share the extension's storage anyway.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  test.setTimeout(120_000);
  ({ context, extensionId } = await loadExtension());
});

test.afterAll(async () => {
  await context?.close();
});

async function openPopup(): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  // Alarms outlive storage and the page, so both need clearing between tests.
  await page.evaluate(async () => {
    await chrome.storage.local.clear();
    await chrome.alarms.clearAll();
    const notifications = await chrome.notifications.getAll();
    await Promise.all(Object.keys(notifications).map((id) => chrome.notifications.clear(id)));
  });
  await page.reload();
  return page;
}

async function openSidePanel(): Promise<Page> {
  const page = await context.newPage();
  await page.setViewportSize({ width: 420, height: 760 });
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await page.evaluate(async () => {
    await chrome.storage.local.clear();
    await chrome.alarms.clearAll();
    const notifications = await chrome.notifications.getAll();
    await Promise.all(Object.keys(notifications).map((id) => chrome.notifications.clear(id)));
  });
  await page.reload();
  return page;
}

/**
 * Fills the form. The fields sit across nested shadow roots, and `and-select`
 * is a custom combobox rather than a native `<select>`.
 */
async function fillReminder(
  page: Page,
  title: string,
  repeat: keyof typeof REPEAT_LABELS,
  minutesFromNow = 60,
) {
  const form = page.locator('sr-reminder-form');
  await form.locator('and-input[name="title"] input').fill(title);

  const when = new Date(Date.now() + minutesFromNow * 60_000);
  const local = new Date(when.getTime() - when.getTimezoneOffset() * 60_000);
  await form.locator('input[name="scheduledAt"]').fill(local.toISOString().slice(0, 16));

  const combobox = form.locator('and-select[name="repeat"] [role="combobox"]');
  await combobox.click();
  await page.locator('[role="option"]', { hasText: REPEAT_LABELS[repeat] }).click();

  // and-select@0.4.1 leaves the listbox open after a pick — aria-expanded stays
  // "true" and Escape does not dismiss it — and the overlay then swallows
  // clicks on the rest of the form. Toggle it shut through the trigger.
  await combobox.click();
  await expect(combobox).toHaveAttribute('aria-expanded', 'false');
}

async function submitForm(page: Page) {
  await page.locator('sr-reminder-form and-button[type="submit"] button').click();
}

test('the popup loads with the design system applied', async () => {
  const page = await openPopup();

  await expect(page.locator('sr-reminder-form')).toBeVisible();
  await expect(page.locator('#reminders')).toContainText('No reminders yet');

  // The tokens stylesheet resolved if the button picked up a themed background.
  const submit = page.locator('sr-reminder-form and-button[type="submit"] button');
  await expect(submit).toBeVisible();
  await expect(submit).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

  await page.close();
});

test('the sidepanel reuses the reminder flow without covering page content', async () => {
  const page = await openSidePanel();

  await expect(page.locator('.sidepanel-shell')).toBeVisible();
  await fillReminder(page, 'Review store listing', 'none');
  await submitForm(page);

  await expect(page.locator('sr-reminder-item').first()).toContainText('Review store listing');
  await expect(page.locator('#reminders')).toContainText('Review store listing');

  await page.close();
});

test('the form refuses an empty submission', async () => {
  const page = await openPopup();

  await submitForm(page);

  await expect(page.locator('#reminders')).toContainText('No reminders yet');
  expect(await page.evaluate(() => chrome.alarms.getAll())).toHaveLength(0);

  await page.close();
});

test('creating a reminder stores it and schedules an alarm', async () => {
  const page = await openPopup();
  await fillReminder(page, 'Water the plants', 'daily');
  await submitForm(page);

  const item = page.locator('sr-reminder-item').first();
  await expect(item).toContainText('Water the plants');
  await expect(item.locator('and-badge')).toContainText('Daily');

  const alarms = await page.evaluate(() => chrome.alarms.getAll());
  expect(alarms).toHaveLength(1);
  expect(alarms[0].name).toMatch(/^reminder-/);
  expect(alarms[0].scheduledTime).toBeGreaterThan(Date.now());

  await page.close();
});

test('a due one-off reminder creates a browser notification naturally', async () => {
  const page = await openPopup();
  await fillReminder(page, 'Natural notification', 'none', 0);
  await submitForm(page);

  const reminderId = await page.evaluate(async () => {
    const store = await chrome.storage.local.get(null);
    const reminder = Object.values(store).find(
      (value): value is { id: string; title: string } =>
        Boolean(value) &&
        typeof value === 'object' &&
        'title' in value &&
        value.title === 'Natural notification',
    );
    return reminder?.id;
  });
  expect(reminderId).toBeTruthy();

  await expect
    .poll(
      async () =>
        page.evaluate(async (id) => {
          const [store, notifications] = await Promise.all([
            chrome.storage.local.get(null),
            chrome.notifications.getAll(),
          ]);
          const reminder = Object.values(store).find(
            (value): value is { id: string; completed: boolean; firedAt?: string } =>
              Boolean(value) && typeof value === 'object' && 'id' in value && value.id === id,
          );

          return {
            completed: reminder?.completed,
            waiting: Boolean(reminder?.firedAt),
            notified: Object.hasOwn(notifications, id),
          };
        }, reminderId as string),
      {
        timeout: 20_000,
        intervals: [250],
        message: 'the natural browser alarm never produced a notification',
      },
    )
    // Firing is not finishing: the reminder is marked as waiting for an answer
    // and stays pending, so a notification nobody saw cannot silently complete
    // it. Only the user ticking it off, or the notification's own Done button,
    // sets `completed`.
    .toEqual({ completed: false, waiting: true, notified: true });

  await page.close();
});

test('deleting a reminder clears its alarm too', async () => {
  const page = await openPopup();
  await fillReminder(page, 'Temporary', 'none');
  await submitForm(page);
  await expect(page.locator('sr-reminder-item')).toHaveCount(1);

  await page.locator('sr-reminder-item [aria-label="Delete reminder"] button').click();

  await expect(page.locator('#reminders')).toContainText('No reminders yet');
  expect(await page.evaluate(() => chrome.alarms.getAll())).toHaveLength(0);

  await page.close();
});

test('a fired repeating alarm reschedules instead of completing', async () => {
  const page = await openPopup();
  await fillReminder(page, 'Standup', 'daily');
  await submitForm(page);
  await expect(page.locator('sr-reminder-item').first()).toContainText('Standup');

  // Bring the due date forward to a moment ago, so firing the alarm reproduces
  // a reminder coming due rather than one triggered an hour early — those are
  // different cases, and only the first should roll the date forward.
  const before = await page.evaluate(async () => {
    const store = await chrome.storage.local.get(null);
    const [key, reminder] = Object.entries(store).find(([name]) =>
      name.startsWith('stickyReminder.reminder.'),
    ) as [string, { id: string; scheduledAt: string }];
    const overdue = { ...reminder, scheduledAt: new Date(Date.now() - 1000).toISOString() };
    await chrome.storage.local.set({ [key]: overdue });
    return overdue;
  });

  const worker = context.serviceWorkers()[0];
  await worker.evaluate(
    (name) => chrome.alarms.create(name, { when: Date.now() }),
    `reminder-${before.id}`,
  );

  const readReminder = () =>
    page.evaluate(async () => {
      const store = await chrome.storage.local.get(null);
      return Object.entries(store).find(([name]) =>
        name.startsWith('stickyReminder.reminder.'),
      )?.[1] as { scheduledAt: string; completed: boolean };
    });

  // The background awaits notifications.create before advancing, so a rolled
  // forward date also means the notification went out.
  await expect
    .poll(async () => (await readReminder()).scheduledAt, {
      timeout: 20_000,
      intervals: [250],
      message: 'the reminder never rolled forward to its next occurrence',
    })
    .not.toBe(before.scheduledAt);

  const after = await readReminder();
  expect(after.completed).toBe(false);
  expect(new Date(after.scheduledAt).getTime() - new Date(before.scheduledAt).getTime()).toBe(
    24 * 60 * 60 * 1000,
  );

  await page.close();
});

test('completing a reminder moves it to the Done tab', async () => {
  const page = await openPopup();
  await fillReminder(page, 'Pay the invoice', 'none');
  await submitForm(page);
  await expect(page.locator('sr-reminder-item')).toHaveCount(1);

  await page.locator('sr-reminder-item [aria-label="Mark as done"] button').click();

  // Gone from Upcoming, and its alarm went with it.
  await expect(page.locator('#reminders')).toContainText('No reminders yet');
  expect(await page.evaluate(() => chrome.alarms.getAll())).toHaveLength(0);

  await page.locator('[data-filter="completed"]').click();
  await expect(page.locator('sr-reminder-item')).toContainText('Pay the invoice');
  await expect(page.locator('[data-count="completed"]')).toHaveText('1');
  await expect(page.locator('[data-count="pending"]')).toHaveText('0');

  await page.close();
});
