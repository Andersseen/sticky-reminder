import { format, parseISO } from 'date-fns';
import type { Reminder } from './types';

export function formatNotificationTitle(reminder: Reminder): string {
  return `⏰ ${reminder.title}`;
}

export function formatNotificationBody(reminder: Reminder): string {
  const when = format(parseISO(reminder.scheduledAt), 'PPpp');
  // A reminder without notes used to produce a body starting with a blank
  // line, which reads as a rendering glitch in the OS notification.
  return reminder.body ? `${reminder.body}\nScheduled: ${when}` : `Scheduled: ${when}`;
}

/**
 * The line under the body on a re-shown notification, so a second or third
 * appearance reads as "you still have not answered this" rather than as a
 * duplicate the extension sent by mistake.
 */
export function formatNotificationReminderOf(attempt: number): string {
  return attempt <= 1 ? 'Still waiting for you' : `Still waiting for you (${attempt})`;
}

export function formatReminderListItem(reminder: Reminder): string {
  const status = reminder.completed ? '✅' : '⏳';
  const when = format(parseISO(reminder.scheduledAt), 'PPpp');
  return `${status} ${reminder.title} — ${when}`;
}
