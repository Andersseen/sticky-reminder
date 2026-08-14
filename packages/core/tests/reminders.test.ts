import { parseISO } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import {
  calculateNextAlarm,
  createReminder,
  deleteReminder,
  formatNotificationBody,
  formatNotificationTitle,
  listReminders,
  toggleReminderCompletion,
  updateReminder,
} from '../src';
import type { CreateReminderInput } from '../src';

function makeInput(overrides: Partial<CreateReminderInput> = {}): CreateReminderInput {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return {
    title: 'Test reminder',
    body: 'Test body',
    scheduledAt: tomorrow,
    repeat: 'none',
    ...overrides,
  };
}

describe('createReminder', () => {
  it('creates a reminder with defaults', () => {
    const reminder = createReminder(makeInput());
    expect(reminder.title).toBe('Test reminder');
    expect(reminder.body).toBe('Test body');
    expect(reminder.completed).toBe(false);
    expect(reminder.id).toBeDefined();
  });

  it('trims title and body', () => {
    const reminder = createReminder(makeInput({ title: '  T  ', body: '  B  ' }));
    expect(reminder.title).toBe('T');
    expect(reminder.body).toBe('B');
  });
});

describe('updateReminder', () => {
  it('updates selected fields and updatedAt', () => {
    const reminder = createReminder(makeInput());
    vi.useFakeTimers();
    vi.advanceTimersByTime(1);
    const updated = updateReminder(reminder, { title: 'Updated' });
    vi.useRealTimers();
    expect(updated.title).toBe('Updated');
    expect(updated.body).toBe(reminder.body);
    expect(updated.updatedAt).not.toBe(reminder.updatedAt);
  });
});

describe('deleteReminder', () => {
  it('removes the reminder by id', () => {
    const a = createReminder(makeInput({ title: 'A' }));
    const b = createReminder(makeInput({ title: 'B' }));
    expect(deleteReminder([a, b], a.id)).toEqual([b]);
  });
});

describe('listReminders', () => {
  it('sorts by scheduledAt ascending', () => {
    const later = makeInput({
      scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    });
    const sooner = makeInput({
      scheduledAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    });
    const a = createReminder(later);
    const b = createReminder(sooner);
    expect(listReminders([a, b]).map((r) => r.id)).toEqual([b.id, a.id]);
  });
});

describe('toggleReminderCompletion', () => {
  it('flips completed state', () => {
    const reminder = createReminder(makeInput());
    const toggled = toggleReminderCompletion(reminder);
    expect(toggled.completed).toBe(true);
  });
});

describe('calculateNextAlarm', () => {
  it('returns scheduled time when in the future and not completed', () => {
    const future = new Date(Date.now() + 60 * 1000).toISOString();
    const reminder = createReminder(makeInput({ scheduledAt: future, repeat: 'none' }));
    expect(calculateNextAlarm(reminder)).toEqual(parseISO(future));
  });

  it('returns null for completed reminders', () => {
    const past = new Date(Date.now() - 60 * 1000).toISOString();
    const reminder = createReminder(makeInput({ scheduledAt: past }));
    const completed = toggleReminderCompletion(reminder);
    expect(calculateNextAlarm(completed)).toBeNull();
  });

  it('returns daily repeat when past and not completed', () => {
    const past = new Date(Date.now() - 60 * 1000).toISOString();
    const reminder = createReminder(makeInput({ scheduledAt: past, repeat: 'daily' }));
    const next = calculateNextAlarm(reminder);
    expect(next).not.toBeNull();
    expect(next?.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('formatNotification', () => {
  it('formats title and body', () => {
    const reminder = createReminder(makeInput({ title: 'Hello', body: 'World' }));
    expect(formatNotificationTitle(reminder)).toContain('Hello');
    expect(formatNotificationBody(reminder)).toContain('World');
  });
});
