import { calculateNextAlarm } from '@sticky-reminder/core';
import type { Reminder } from '@sticky-reminder/core';
import { browser } from 'wxt/browser';
import { loadReminders } from './storage';

export const ALARM_PREFIX = 'reminder-';

export function alarmNameFor(reminder: Reminder): string {
  return `${ALARM_PREFIX}${reminder.id}`;
}

export async function scheduleReminderAlarm(reminder: Reminder): Promise<void> {
  const next = calculateNextAlarm(reminder);
  if (!next) return;

  await browser.alarms.create(alarmNameFor(reminder), {
    when: next.getTime(),
  });
}

export async function cancelReminderAlarm(reminder: Reminder): Promise<void> {
  await browser.alarms.clear(alarmNameFor(reminder));
}

/**
 * Alarms are dropped when the extension is installed, updated or reloaded, but
 * the reminders behind them live in storage. Re-create the pending ones so a
 * repeating reminder does not silently stop firing.
 */
export async function syncReminderAlarms(): Promise<void> {
  const reminders = await loadReminders();
  await Promise.all(reminders.map((reminder) => scheduleReminderAlarm(reminder)));
}

export function reminderIdFromAlarmName(name: string): string | null {
  if (!name.startsWith(ALARM_PREFIX)) return null;
  return name.slice(ALARM_PREFIX.length);
}
