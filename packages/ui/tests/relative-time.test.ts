import { describe, expect, it } from 'vitest';
import { formatRelativeTime, isOverdue } from '../src/utils/relative-time';

const NOW = new Date('2026-08-14T12:00:00.000Z');
const at = (ms: number) => new Date(NOW.getTime() + ms);

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelativeTime', () => {
  it('picks the largest unit that still fits', () => {
    expect(formatRelativeTime(at(20 * MINUTE), NOW)).toBe('in 20 minutes');
    expect(formatRelativeTime(at(5 * HOUR), NOW)).toBe('in 5 hours');
    expect(formatRelativeTime(at(3 * DAY), NOW)).toBe('in 3 days');
    expect(formatRelativeTime(at(21 * DAY), NOW)).toBe('in 3 weeks');
  });

  it('reads the past as the past', () => {
    expect(formatRelativeTime(at(-45 * MINUTE), NOW)).toBe('45 minutes ago');
    expect(formatRelativeTime(at(-2 * HOUR), NOW)).toBe('2 hours ago');
  });

  it('uses day names where the locale has them', () => {
    expect(formatRelativeTime(at(DAY), NOW)).toBe('tomorrow');
    expect(formatRelativeTime(at(-DAY), NOW)).toBe('yesterday');
  });

  // Rounding towards zero would render "in 0 minutes" for anything under a
  // minute and knock every other value down a step.
  it('never rounds a future moment down to nothing', () => {
    expect(formatRelativeTime(at(30_000), NOW)).toBe('in less than a minute');
    expect(formatRelativeTime(at(90_000), NOW)).toBe('in 2 minutes');
    expect(formatRelativeTime(at(-30_000), NOW)).toBe('just now');
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatRelativeTime(new Date('nonsense'), NOW)).toBe('');
  });
});

describe('isOverdue', () => {
  it('is true only once the moment has passed', () => {
    expect(isOverdue(at(-1), NOW)).toBe(true);
    expect(isOverdue(at(MINUTE), NOW)).toBe(false);
  });
});
