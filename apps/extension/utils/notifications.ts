import {
  type Reminder,
  formatNotificationBody,
  formatNotificationReminderOf,
  formatNotificationTitle,
} from '@sticky-reminder/core';
import { type Browser, browser } from 'wxt/browser';

export const TEST_NOTIFICATION_ID = 'sticky-reminder-test-notification';

/** How long a snoozed reminder stays quiet. */
export const SNOOZE_MS = 10 * 60_000;
/** How long an unanswered notification waits before it comes back. */
export const RENOTIFY_DELAY_MS = 2 * 60_000;
/**
 * After this many unanswered appearances the extension stops re-showing and
 * leaves the toolbar badge to carry it. A reminder that nags forever gets the
 * extension uninstalled, which is a worse outcome than a missed reminder.
 */
export const MAX_NOTIFY_ATTEMPTS = 3;

export const DONE_BUTTON_INDEX = 0;
export const SNOOZE_BUTTON_INDEX = 1;

const ICON_URL = '/icon/128.png';

/**
 * Chromium keeps a notification on screen until the user deals with it and can
 * render action buttons; Firefox implements neither and rejects the entire
 * `create` call when it sees a property it does not know. Probed once on the
 * first reminder rather than paying for a failed call on every one.
 *
 * On macOS `requireInteraction` is advisory at best: whether a notification
 * sticks is the OS's decision (System Settings → Notifications → Alerts vs
 * Banners), which is exactly why the badge and the re-show exist.
 */
let richNotificationsSupported: boolean | null = null;

type CreateOptions = Browser.notifications.NotificationCreateOptions;

async function createNotification(
  id: string,
  base: CreateOptions,
  rich: Record<string, unknown>,
): Promise<void> {
  if (richNotificationsSupported === false) {
    await browser.notifications.create(id, base);
    return;
  }

  try {
    await browser.notifications.create(id, { ...base, ...rich } as CreateOptions);
    richNotificationsSupported = true;
  } catch {
    richNotificationsSupported = false;
    await browser.notifications.create(id, base);
  }
}

/**
 * Shows the notification for a reminder. The id is the reminder's own, so a
 * re-show replaces the previous card instead of stacking a second copy of the
 * same thing in the notification centre.
 */
export async function showReminderNotification(reminder: Reminder): Promise<void> {
  const attempt = reminder.notifyAttempts ?? 0;

  await browser.notifications.clear(reminder.id);
  await createNotification(
    reminder.id,
    {
      type: 'basic',
      iconUrl: ICON_URL,
      title: formatNotificationTitle(reminder),
      message: formatNotificationBody(reminder),
    },
    {
      requireInteraction: true,
      ...(attempt > 0 ? { contextMessage: formatNotificationReminderOf(attempt) } : {}),
      buttons: [{ title: 'Mark as done' }, { title: 'Snooze 10 minutes' }],
    },
  );
}

export async function sendTestNotification(now = new Date()): Promise<string> {
  await browser.notifications.clear(TEST_NOTIFICATION_ID);
  await browser.notifications.create(TEST_NOTIFICATION_ID, {
    type: 'basic',
    iconUrl: ICON_URL,
    title: 'Sticky Reminder test',
    message: `Notifications are working. Sent at ${now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}.`,
  });

  return TEST_NOTIFICATION_ID;
}

/**
 * Whether the browser will actually show anything, or `null` where it declines
 * to say — Firefox has no `getPermissionLevel`. A reminder nobody can receive
 * is worth surfacing before the user trusts it with something that matters.
 */
export async function notificationsAllowed(): Promise<boolean | null> {
  const getPermissionLevel = browser.notifications.getPermissionLevel;
  if (typeof getPermissionLevel !== 'function') return null;

  try {
    return (await getPermissionLevel()) === 'granted';
  } catch {
    return null;
  }
}
