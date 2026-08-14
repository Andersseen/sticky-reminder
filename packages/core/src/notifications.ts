import { format, parseISO } from 'date-fns';
import type { Reminder } from './types';

export function formatNotificationTitle(reminder: Reminder): string {
  return `⏰ ${reminder.title}`;
}

export function formatNotificationBody(reminder: Reminder): string {
  const when = format(parseISO(reminder.scheduledAt), 'PPpp');
  return `${reminder.body}\nScheduled: ${when}`;
}

export function formatReminderListItem(reminder: Reminder): string {
  const status = reminder.completed ? '✅' : '⏳';
  const when = format(parseISO(reminder.scheduledAt), 'PPpp');
  return `${status} ${reminder.title} — ${when}`;
}
