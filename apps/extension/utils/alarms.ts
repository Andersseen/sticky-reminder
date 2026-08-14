import { calculateNextAlarm } from '@sticky-reminder/core';
import type { Reminder } from '@sticky-reminder/core';
import { browser } from 'wxt/browser';
import { loadReminders } from './storage';

export const ALARM_PREFIX = 'reminder-';

export function alarmNameForId(id: string): string {
  return `${ALARM_PREFIX}${id}`;
}

export function alarmNameFor(reminder: Reminder): string {
  return alarmNameForId(reminder.id);
}

export async function scheduleReminderAlarm(reminder: Reminder): Promise<void> {
  const next = calculateNextAlarm(reminder);
  if (!next) return;

  await browser.alarms.create(alarmNameFor(reminder), {
    when: next.getTime(),
  });
}

export async function cancelReminderAlarm(id: string): Promise<void> {
  await browser.alarms.clear(alarmNameForId(id));
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
