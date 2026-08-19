import { addDays, addWeeks, isBefore, isValid, parseISO } from 'date-fns';
import type { CreateReminderInput, Reminder, RepeatInterval, UpdateReminderInput } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

interface RepeatStep {
  add: (date: Date, amount: number) => Date;
  ms: number;
}

const REPEAT_STEPS: Record<Exclude<RepeatInterval, 'none'>, RepeatStep> = {
  daily: { add: addDays, ms: DAY_MS },
  weekly: { add: addWeeks, ms: 7 * DAY_MS },
};

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createReminder(input: CreateReminderInput): Reminder {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: input.title.trim(),
    body: input.body.trim(),
    createdAt: now,
    updatedAt: now,
    scheduledAt: input.scheduledAt,
    repeat: input.repeat ?? 'none',
    completed: false,
  };
}

export function updateReminder(reminder: Reminder, input: UpdateReminderInput): Reminder {
  return {
    ...clearFiredState(reminder),
    title: input.title !== undefined ? input.title.trim() : reminder.title,
    body: input.body !== undefined ? input.body.trim() : reminder.body,
    scheduledAt: input.scheduledAt ?? reminder.scheduledAt,
    repeat: input.repeat ?? reminder.repeat,
    updatedAt: new Date().toISOString(),
  };
}

/** Drops the fired/unacknowledged markers without touching anything else. */
function clearFiredState(reminder: Reminder): Reminder {
  const { firedAt: _firedAt, notifyAttempts: _attempts, ...rest } = reminder;
  return rest;
}

export function deleteReminder(reminders: Reminder[], id: string): Reminder[] {
  return reminders.filter((r) => r.id !== id);
}

export function listReminders(reminders: Reminder[]): Reminder[] {
  return [...reminders].sort(
    (a, b) => parseISO(a.scheduledAt).getTime() - parseISO(b.scheduledAt).getTime(),
  );
}

export function toggleReminderCompletion(reminder: Reminder): Reminder {
  // Ticking a reminder off is the strongest acknowledgement there is, so it
  // also stops the badge counting it and the browser re-showing it.
  return {
    ...clearFiredState(reminder),
    completed: !reminder.completed,
    updatedAt: new Date().toISOString(),
  };
}

/** A reminder whose alarm fired and that nobody has acted on yet. */
export function needsAcknowledgement(reminder: Reminder): boolean {
  return Boolean(reminder.firedAt) && !reminder.completed;
}

export function countUnacknowledged(reminders: Reminder[]): number {
  return reminders.filter(needsAcknowledgement).length;
}

/**
 * The user saw it. Stops the escalation without deciding the reminder is done:
 * a one-off they merely glanced at stays pending — and therefore overdue —
 * until they actually tick it off.
 */
export function acknowledgeReminder(reminder: Reminder, from: Date = new Date()): Reminder {
  if (reminder.firedAt === undefined && reminder.notifyAttempts === undefined) return reminder;
  return { ...clearFiredState(reminder), updatedAt: from.toISOString() };
}

/** Counts one re-show of an unacknowledged notification against its cap. */
export function recordNotifyAttempt(reminder: Reminder, from: Date = new Date()): Reminder {
  return {
    ...reminder,
    notifyAttempts: (reminder.notifyAttempts ?? 0) + 1,
    updatedAt: from.toISOString(),
  };
}

export function calculateNextAlarm(reminder: Reminder, from: Date = new Date()): Date | null {
  if (reminder.completed) {
    return null;
  }

  const scheduled = parseISO(reminder.scheduledAt);
  if (!isValid(scheduled)) {
    return null;
  }

  if (isBefore(from, scheduled)) {
    return scheduled;
  }

  if (reminder.repeat === 'none') {
    return null;
  }

  // Skip the periods that already elapsed in one jump so a reminder left dormant
  // for months does not step forward a day at a time, then walk the remainder:
  // calendar arithmetic drifts from fixed milliseconds across DST boundaries.
  const { add, ms } = REPEAT_STEPS[reminder.repeat];
  let next = add(scheduled, Math.floor((from.getTime() - scheduled.getTime()) / ms));
  while (!isBefore(from, next)) {
    next = add(next, 1);
  }

  return next;
}

/**
 * Rolls a reminder forward after its alarm fired: repeating reminders move to
 * their next occurrence, one-off reminders stay where they are.
 *
 * Note what this deliberately does not do: complete the one-off. The browser
 * having shown a notification says nothing about whether anyone was at the
 * screen, so the reminder is marked as fired-and-unacknowledged and stays in
 * the list — overdue and counted — until the user answers it.
 */
export function advanceReminder(reminder: Reminder, from: Date = new Date()): Reminder {
  const next = calculateNextAlarm(reminder, from);
  const updatedAt = from.toISOString();
  const fired = { firedAt: updatedAt, notifyAttempts: 0 };

  if (!next) {
    return { ...reminder, ...fired, updatedAt };
  }

  return { ...reminder, ...fired, scheduledAt: next.toISOString(), updatedAt };
}
