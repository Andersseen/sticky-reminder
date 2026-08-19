import { calculateNextAlarm } from '@sticky-reminder/core';
import type { Reminder } from '@sticky-reminder/core';
import { browser } from 'wxt/browser';
import { loadReminders } from './storage';

export const ALARM_PREFIX = 'reminder-';
/** Re-shows a notification the user never answered. */
export const RENOTIFY_PREFIX = 'renotify-';
/** Re-shows a notification the user explicitly pushed back. */
export const SNOOZE_PREFIX = 'snooze-';

export function alarmNameForId(id: string): string {
  return `${ALARM_PREFIX}${id}`;
}

export function alarmNameFor(reminder: Reminder): string {
  return alarmNameForId(reminder.id);
}

export function renotifyAlarmName(id: string): string {
  return `${RENOTIFY_PREFIX}${id}`;
}

export function snoozeAlarmName(id: string): string {
  return `${SNOOZE_PREFIX}${id}`;
}

/**
 * Both follow-ups exist to bring one reminder back; the moment it is answered,
 * neither should ever arrive.
 */
export async function cancelFollowUps(id: string): Promise<void> {
  await browser.alarms.clear(renotifyAlarmName(id));
  await browser.alarms.clear(snoozeAlarmName(id));
}

export async function scheduleFollowUp(
  name: string,
  delayMs: number,
  from = new Date(),
): Promise<void> {
  await browser.alarms.create(name, { when: from.getTime() + delayMs });
}

export async function scheduleReminderAlarm(reminder: Reminder, from = new Date()): Promise<void> {
  let next = calculateNextAlarm(reminder, from);
  if (
    !next &&
    !reminder.completed &&
    !reminder.firedAt &&
    reminder.repeat === 'none' &&
    !Number.isNaN(Date.parse(reminder.scheduledAt)) &&
    Date.parse(reminder.scheduledAt) <= from.getTime()
  ) {
    // Browser alarms disappear across some reload/update paths. Recover a
    // missed one-off now instead of leaving it pending forever.
    //
    // `firedAt` is the guard that keeps this from looping: a one-off no longer
    // completes itself when it fires, so without it every restart would fire
    // the same unanswered reminder again through this branch rather than
    // through the deliberate restore path.
    next = from;
  }
  if (!next) return;

  await browser.alarms.create(alarmNameFor(reminder), {
    when: next.getTime(),
  });
}

export async function cancelReminderAlarm(id: string): Promise<void> {
  await browser.alarms.clear(alarmNameForId(id));
  // Every caller here is deleting, editing or ticking off the reminder — all
  // of which are the user answering it, so nothing should still come back.
  await cancelFollowUps(id);
}

/**
 * Alarms are dropped when the extension is installed, updated or reloaded, but
 * the reminders behind them live in storage. Re-create the pending ones so a
 * repeating reminder does not silently stop firing.
 */
export async function syncReminderAlarms(): Promise<void> {
  const reminders = await loadReminders();
  const expected = new Set(
    reminders.filter((reminder) => !reminder.completed).map((reminder) => alarmNameFor(reminder)),
  );
  // Follow-ups outlive the reminder that scheduled them unless they are swept
  // too, and one pointing at a deleted id can never resolve to anything.
  const live = new Set(reminders.map((reminder) => reminder.id));
  const stale = (await browser.alarms.getAll()).filter((alarm) => {
    if (alarm.name.startsWith(ALARM_PREFIX)) return !expected.has(alarm.name);
    for (const prefix of [RENOTIFY_PREFIX, SNOOZE_PREFIX]) {
      if (alarm.name.startsWith(prefix)) return !live.has(alarm.name.slice(prefix.length));
    }
    return false;
  });

  await Promise.all(stale.map((alarm) => browser.alarms.clear(alarm.name)));
  await Promise.all(reminders.map((reminder) => scheduleReminderAlarm(reminder)));
}

export function reminderIdFromAlarmName(name: string): string | null {
  if (!name.startsWith(ALARM_PREFIX)) return null;
  return name.slice(ALARM_PREFIX.length);
}

/** Why an alarm fired: its due moment, an unanswered re-show, or a snooze. */
export type AlarmKind = 'due' | 'renotify' | 'snooze';

const ALARM_KINDS: [prefix: string, kind: AlarmKind][] = [
  [ALARM_PREFIX, 'due'],
  [RENOTIFY_PREFIX, 'renotify'],
  [SNOOZE_PREFIX, 'snooze'],
];

export function parseAlarmName(name: string): { kind: AlarmKind; id: string } | null {
  for (const [prefix, kind] of ALARM_KINDS) {
    if (name.startsWith(prefix)) return { kind, id: name.slice(prefix.length) };
  }
  return null;
}
