const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const UNITS: [limit: number, ms: number, unit: Intl.RelativeTimeFormatUnit][] = [
  [HOUR, MINUTE, 'minute'],
  [DAY, HOUR, 'hour'],
  [WEEK, DAY, 'day'],
  [Number.POSITIVE_INFINITY, WEEK, 'week'],
];

/**
 * "in 20 minutes", "tomorrow", "3 days ago" — the human half of a due date,
 * shown next to the absolute one rather than replacing it.
 *
 * Rounds away from zero so a reminder 90 seconds out reads "in 2 minutes"
 * rather than "in 1 minute", and never renders "in 0 minutes".
 */
export function formatRelativeTime(target: Date, from: Date = new Date()): string {
  const diff = target.getTime() - from.getTime();
  if (Number.isNaN(diff)) return '';

  if (Math.abs(diff) < MINUTE) return diff >= 0 ? 'in less than a minute' : 'just now';

  const [, ms, unit] = UNITS.find(([limit]) => Math.abs(diff) < limit) ?? UNITS[UNITS.length - 1];
  const value = diff < 0 ? Math.floor(diff / ms) : Math.ceil(diff / ms);

  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(value, unit);
}

/** Whether a pending reminder's moment has already passed. */
export function isOverdue(target: Date, from: Date = new Date()): boolean {
  return target.getTime() < from.getTime();
}
