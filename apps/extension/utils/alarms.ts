import { calculateNextAlarm } from '@sticky-reminder/core';
import type { Reminder } from '@sticky-reminder/core';
import { browser } from 'wxt/browser';

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

export function reminderIdFromAlarmName(name: string): string | null {
  if (!name.startsWith(ALARM_PREFIX)) return null;
  return name.slice(ALARM_PREFIX.length);
}
