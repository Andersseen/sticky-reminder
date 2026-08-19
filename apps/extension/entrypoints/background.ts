import {
  type Reminder,
  acknowledgeReminder,
  advanceReminder,
  needsAcknowledgement,
  recordNotifyAttempt,
  toggleReminderCompletion,
} from '@sticky-reminder/core';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import {
  cancelFollowUps,
  parseAlarmName,
  renotifyAlarmName,
  scheduleFollowUp,
  scheduleReminderAlarm,
  snoozeAlarmName,
  syncReminderAlarms,
} from '../utils/alarms';
import { refreshBadge } from '../utils/badge';
import {
  DONE_BUTTON_INDEX,
  MAX_NOTIFY_ATTEMPTS,
  RENOTIFY_DELAY_MS,
  SNOOZE_BUTTON_INDEX,
  SNOOZE_MS,
  showReminderNotification,
} from '../utils/notifications';
import { loadReminders, updateStoredReminder } from '../utils/storage';

/**
 * A browser restart should not swallow what rang while it was closed, but it
 * should not open a wall of cards either.
 */
const MAX_RESTORED_ON_STARTUP = 5;

export default defineBackground(() => {
  async function findReminder(id: string): Promise<Reminder | null> {
    return (await loadReminders()).find((reminder) => reminder.id === id) ?? null;
  }

  /** Everything that ends the escalation for one reminder, in one place. */
  async function settle(reminder: Reminder, next: Reminder): Promise<void> {
    await browser.notifications.clear(reminder.id);
    await cancelFollowUps(reminder.id);
    await updateStoredReminder(next);
    await scheduleReminderAlarm(next);
    await refreshBadge();
  }

  async function fireReminder(id: string): Promise<void> {
    const reminder = await findReminder(id);
    if (!reminder) return;

    // Rolls a repeat to its next occurrence and marks the reminder as fired
    // and unanswered; a one-off is *not* completed here.
    const advanced = advanceReminder(reminder);
    await updateStoredReminder(advanced);
    await showReminderNotification(advanced);
    await scheduleReminderAlarm(advanced);
    await refreshBadge();
  }

  /** A re-show, either because the user ignored it or because they snoozed it. */
  async function reshowReminder(id: string, countsAgainstCap: boolean): Promise<void> {
    const reminder = await findReminder(id);
    if (!reminder || !needsAcknowledgement(reminder)) return;

    const next = countsAgainstCap ? recordNotifyAttempt(reminder) : reminder;
    if (countsAgainstCap && (next.notifyAttempts ?? 0) > MAX_NOTIFY_ATTEMPTS) {
      // Out of re-shows. The badge keeps carrying it from here.
      return;
    }

    await updateStoredReminder(next);
    await showReminderNotification(next);
  }

  async function restoreUnacknowledged(): Promise<void> {
    const waiting = (await loadReminders()).filter(needsAcknowledgement);
    for (const reminder of waiting.slice(0, MAX_RESTORED_ON_STARTUP)) {
      await showReminderNotification(reminder);
    }
  }

  async function bootstrap(restore: boolean): Promise<void> {
    await syncReminderAlarms();
    if (restore) await restoreUnacknowledged();
    await refreshBadge();
  }

  browser.runtime.onInstalled.addListener(() => {
    void bootstrap(false);
  });

  browser.runtime.onStartup.addListener(() => {
    // What rang while the browser was closed is exactly what the user is most
    // likely to have missed, so a restart re-presents it instead of leaving it
    // to be discovered in the list.
    void bootstrap(true);
  });

  // The popup, the sidebar and the options page all write straight to storage,
  // so the badge follows storage rather than any one of them remembering to
  // tell the background what it just did.
  browser.storage.onChanged.addListener((_changes, area) => {
    if (area === 'local') void refreshBadge();
  });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    const parsed = parseAlarmName(alarm.name);
    if (!parsed) return;

    if (parsed.kind === 'due') await fireReminder(parsed.id);
    else await reshowReminder(parsed.id, parsed.kind === 'renotify');
  });

  browser.notifications.onClicked.addListener(async (notificationId) => {
    const reminder = await findReminder(notificationId);
    // Opening the list is the user engaging with it, so the nagging stops —
    // but a one-off stays pending, and therefore overdue, until it is ticked.
    if (reminder) await settle(reminder, acknowledgeReminder(reminder));

    await browser.tabs.create({ url: `options.html?reminder=${notificationId}` });
  });

  browser.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    const reminder = await findReminder(notificationId);
    if (!reminder) return;

    if (buttonIndex === DONE_BUTTON_INDEX) {
      const done = reminder.completed
        ? acknowledgeReminder(reminder)
        : toggleReminderCompletion(reminder);
      await settle(reminder, done);
      return;
    }

    if (buttonIndex === SNOOZE_BUTTON_INDEX) {
      // A snooze must not move `scheduledAt`: on a daily reminder that would
      // drag every future occurrence ten minutes later. It rides its own alarm
      // and leaves the schedule alone.
      await browser.notifications.clear(notificationId);
      await cancelFollowUps(notificationId);
      await scheduleFollowUp(snoozeAlarmName(notificationId), SNOOZE_MS);
    }
  });

  browser.notifications.onClosed.addListener(async (notificationId, byUser) => {
    // Dismissing on purpose is a decision; timing out is not. Only the second
    // one earns another appearance.
    if (byUser) return;

    const reminder = await findReminder(notificationId);
    if (!reminder || !needsAcknowledgement(reminder)) return;
    if ((reminder.notifyAttempts ?? 0) >= MAX_NOTIFY_ATTEMPTS) return;

    await scheduleFollowUp(renotifyAlarmName(notificationId), RENOTIFY_DELAY_MS);
  });
});
