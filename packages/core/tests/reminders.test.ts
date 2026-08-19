import { addDays, addWeeks, parseISO } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import {
  acknowledgeReminder,
  advanceReminder,
  calculateNextAlarm,
  countUnacknowledged,
  createReminder,
  deleteReminder,
  formatNotificationBody,
  formatNotificationTitle,
  listReminders,
  needsAcknowledgement,
  recordNotifyAttempt,
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

  it('skips every daily occurrence missed while dormant', () => {
    const now = new Date('2026-08-14T12:00:00.000Z');
    const scheduled = new Date('2026-07-01T09:00:00.000Z');
    const reminder = createReminder(
      makeInput({ scheduledAt: scheduled.toISOString(), repeat: 'daily' }),
    );

    // 44 days elapsed, so the next occurrence is the 45th one — the first after now.
    expect(calculateNextAlarm(reminder, now)).toEqual(addDays(scheduled, 45));
  });

  it('skips every weekly occurrence missed while dormant', () => {
    const now = new Date('2026-08-14T12:00:00.000Z');
    const scheduled = new Date('2026-06-05T09:00:00.000Z');
    const reminder = createReminder(
      makeInput({ scheduledAt: scheduled.toISOString(), repeat: 'weekly' }),
    );

    // Exactly 10 weeks elapsed, so the 10th occurrence is already due — take the 11th.
    const next = calculateNextAlarm(reminder, now);
    expect(next).toEqual(addWeeks(scheduled, 11));
    expect(next?.getTime()).toBeGreaterThan(now.getTime());
  });

  it('returns null for an unparseable scheduledAt', () => {
    const reminder = createReminder(makeInput({ scheduledAt: 'not a date', repeat: 'daily' }));
    expect(calculateNextAlarm(reminder)).toBeNull();
  });
});

describe('advanceReminder', () => {
  const now = new Date('2026-08-14T12:00:00.000Z');

  it('leaves a fired one-off pending so a notification nobody saw is not treated as done', () => {
    const past = new Date('2026-08-14T11:00:00.000Z').toISOString();
    const reminder = createReminder(makeInput({ scheduledAt: past, repeat: 'none' }));

    const advanced = advanceReminder(reminder, now);
    expect(advanced.completed).toBe(false);
    expect(advanced.scheduledAt).toBe(past);
    expect(advanced.firedAt).toBe(now.toISOString());
    expect(needsAcknowledgement(advanced)).toBe(true);
  });

  it('marks a repeating reminder as unanswered while rolling it forward', () => {
    const scheduled = new Date('2026-08-14T11:00:00.000Z');
    const reminder = createReminder(
      makeInput({ scheduledAt: scheduled.toISOString(), repeat: 'daily' }),
    );

    const advanced = advanceReminder(reminder, now);
    expect(advanced.firedAt).toBe(now.toISOString());
    expect(needsAcknowledgement(advanced)).toBe(true);
  });

  it('rolls a repeating reminder forward instead of completing it', () => {
    const scheduled = new Date('2026-08-14T11:00:00.000Z');
    const reminder = createReminder(
      makeInput({ scheduledAt: scheduled.toISOString(), repeat: 'daily' }),
    );

    const advanced = advanceReminder(reminder, now);
    expect(advanced.completed).toBe(false);
    expect(advanced.scheduledAt).toBe(addDays(scheduled, 1).toISOString());
    expect(advanced.updatedAt).toBe(now.toISOString());
  });

  it('keeps rolling forward on every firing', () => {
    const scheduled = new Date('2026-08-14T11:00:00.000Z');
    let reminder = createReminder(
      makeInput({ scheduledAt: scheduled.toISOString(), repeat: 'daily' }),
    );

    for (let occurrence = 0; occurrence < 3; occurrence++) {
      reminder = advanceReminder(reminder, addDays(scheduled, occurrence));
      expect(reminder.completed).toBe(false);
      expect(reminder.scheduledAt).toBe(addDays(scheduled, occurrence + 1).toISOString());
    }
  });
});

describe('formatNotification', () => {
  it('formats title and body', () => {
    const reminder = createReminder(makeInput({ title: 'Hello', body: 'World' }));
    expect(formatNotificationTitle(reminder)).toContain('Hello');
    expect(formatNotificationBody(reminder)).toContain('World');
  });
});

describe('acknowledgement', () => {
  const now = new Date('2026-08-14T12:00:00.000Z');
  const past = new Date('2026-08-14T11:00:00.000Z').toISOString();

  function fired(overrides: Partial<CreateReminderInput> = {}) {
    return advanceReminder(
      createReminder(makeInput({ scheduledAt: past, repeat: 'none', ...overrides })),
      now,
    );
  }

  it('stops counting a reminder once it is acknowledged', () => {
    const reminder = fired();
    expect(countUnacknowledged([reminder])).toBe(1);

    const seen = acknowledgeReminder(reminder, now);
    expect(seen.firedAt).toBeUndefined();
    expect(seen.notifyAttempts).toBeUndefined();
    expect(countUnacknowledged([seen])).toBe(0);
  });

  it('leaves a merely acknowledged one-off pending, so it stays overdue until it is ticked', () => {
    const seen = acknowledgeReminder(fired(), now);
    expect(seen.completed).toBe(false);
  });

  it('returns the same reminder when there is nothing to acknowledge', () => {
    const reminder = createReminder(makeInput());
    expect(acknowledgeReminder(reminder, now)).toBe(reminder);
  });

  it('treats ticking a reminder off as the strongest acknowledgement', () => {
    const done = toggleReminderCompletion(fired());
    expect(done.completed).toBe(true);
    expect(done.firedAt).toBeUndefined();
    expect(needsAcknowledgement(done)).toBe(false);
  });

  it('clears the fired state when the reminder is edited', () => {
    const edited = updateReminder(fired(), { title: 'Renamed' });
    expect(edited.firedAt).toBeUndefined();
    expect(needsAcknowledgement(edited)).toBe(false);
  });

  it('never counts a completed reminder, however it was left', () => {
    expect(needsAcknowledgement({ ...fired(), completed: true })).toBe(false);
  });

  it('counts re-shows so the escalation can stop', () => {
    let reminder = fired();
    expect(reminder.notifyAttempts).toBe(0);

    reminder = recordNotifyAttempt(reminder, now);
    reminder = recordNotifyAttempt(reminder, now);
    expect(reminder.notifyAttempts).toBe(2);
  });
});
