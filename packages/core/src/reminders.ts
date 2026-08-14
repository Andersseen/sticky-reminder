import { addDays, addWeeks, isBefore, parseISO } from 'date-fns';
import type { CreateReminderInput, Reminder, UpdateReminderInput } from './types';

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
    ...reminder,
    title: input.title !== undefined ? input.title.trim() : reminder.title,
    body: input.body !== undefined ? input.body.trim() : reminder.body,
    scheduledAt: input.scheduledAt ?? reminder.scheduledAt,
    repeat: input.repeat ?? reminder.repeat,
    updatedAt: new Date().toISOString(),
  };
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
  return { ...reminder, completed: !reminder.completed, updatedAt: new Date().toISOString() };
}

export function calculateNextAlarm(reminder: Reminder): Date | null {
  const scheduled = parseISO(reminder.scheduledAt);
  if (isBefore(new Date(), scheduled) && !reminder.completed) {
    return scheduled;
  }

  if (reminder.completed || reminder.repeat === 'none') {
    return null;
  }

  if (reminder.repeat === 'daily') {
    return addDays(scheduled, 1);
  }

  if (reminder.repeat === 'weekly') {
    return addWeeks(scheduled, 1);
  }

  return null;
}
