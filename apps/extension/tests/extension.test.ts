import { createReminder } from '@sticky-reminder/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

vi.mock('wxt/browser', () => ({
  browser: fakeBrowser,
}));

const { alarmNameFor, reminderIdFromAlarmName, scheduleReminderAlarm, syncReminderAlarms } =
  await import('../utils/alarms');
const { addReminder, isReminder, loadReminders, saveReminders } = await import('../utils/storage');

beforeEach(() => {
  fakeBrowser.reset();
});

describe('storage', () => {
  it('loads and saves reminders', async () => {
    const reminder = createReminder({
      title: 'T',
      body: 'B',
      scheduledAt: new Date(Date.now() + 60_000).toISOString(),
      repeat: 'none',
    });
    await saveReminders([reminder]);
    const loaded = await loadReminders();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe('T');
  });

  it('migrates the legacy array without keeping malformed records', async () => {
    const reminder = createReminder({
      title: 'Legacy',
      body: '',
      scheduledAt: new Date(Date.now() + 60_000).toISOString(),
      repeat: 'none',
    });
    await fakeBrowser.storage.local.set({ reminders: [reminder, { id: 'broken' }] });

    expect(await loadReminders()).toEqual([reminder]);
    expect((await fakeBrowser.storage.local.get('reminders')).reminders).toBeUndefined();
  });

  it('keeps simultaneous additions because each reminder has its own key', async () => {
    const a = createReminder({
      title: 'A',
      body: '',
      scheduledAt: new Date(Date.now() + 60_000).toISOString(),
      repeat: 'none',
    });
    const b = createReminder({
      title: 'B',
      body: '',
      scheduledAt: new Date(Date.now() + 120_000).toISOString(),
      repeat: 'none',
    });

    await Promise.all([addReminder(a), addReminder(b)]);
    expect((await loadReminders()).map((reminder) => reminder.title).sort()).toEqual(['A', 'B']);
  });

  it('rejects records with invalid dates or fields', () => {
    expect(isReminder({ id: 'broken' })).toBe(false);
    expect(
      isReminder({
        id: 'x',
        title: 'T',
        body: '',
        scheduledAt: 'not-a-date',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        repeat: 'none',
        completed: false,
      }),
    ).toBe(false);
  });
});

describe('alarms', () => {
  it('creates and parses alarm names', () => {
    const reminder = createReminder({
      title: 'T',
      body: 'B',
      scheduledAt: new Date(Date.now() + 60_000).toISOString(),
      repeat: 'none',
    });
    const name = alarmNameFor(reminder);
    expect(name).toBe(`reminder-${reminder.id}`);
    expect(reminderIdFromAlarmName(name)).toBe(reminder.id);
    expect(reminderIdFromAlarmName('other')).toBeNull();
  });

  it('schedules a reminder alarm', async () => {
    const reminder = createReminder({
      title: 'T',
      body: 'B',
      scheduledAt: new Date(Date.now() + 60_000).toISOString(),
      repeat: 'none',
    });
    await saveReminders([reminder]);
    await scheduleReminderAlarm(reminder);
    const alarms = await fakeBrowser.alarms.getAll();
    expect(alarms).toHaveLength(1);
    expect(alarms[0].name).toBe(alarmNameFor(reminder));
  });

  it('schedules a future occurrence for an overdue repeating reminder', async () => {
    const reminder = createReminder({
      title: 'Standup',
      body: 'B',
      scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      repeat: 'daily',
    });
    await scheduleReminderAlarm(reminder);

    const alarms = await fakeBrowser.alarms.getAll();
    expect(alarms).toHaveLength(1);
    expect(alarms[0].scheduledTime).toBeGreaterThan(Date.now());
  });

  it('schedules an overdue one-off immediately so it is not lost', async () => {
    const before = Date.now();
    const reminder = createReminder({
      title: 'T',
      body: 'B',
      scheduledAt: new Date(Date.now() - 60_000).toISOString(),
      repeat: 'none',
    });
    await scheduleReminderAlarm(reminder);

    const alarms = await fakeBrowser.alarms.getAll();
    expect(alarms).toHaveLength(1);
    expect(alarms[0].scheduledTime).toBeGreaterThanOrEqual(before);
  });
});

describe('syncReminderAlarms', () => {
  it('recreates alarms for pending reminders only', async () => {
    const pending = createReminder({
      title: 'Pending',
      body: 'B',
      scheduledAt: new Date(Date.now() + 60_000).toISOString(),
      repeat: 'none',
    });
    const done = {
      ...createReminder({
        title: 'Done',
        body: 'B',
        scheduledAt: new Date(Date.now() + 60_000).toISOString(),
        repeat: 'none',
      }),
      completed: true,
    };
    await saveReminders([pending, done]);

    await syncReminderAlarms();

    const alarms = await fakeBrowser.alarms.getAll();
    expect(alarms.map((alarm) => alarm.name)).toEqual([alarmNameFor(pending)]);
  });

  it('clears reminder alarms whose stored reminder no longer exists', async () => {
    await fakeBrowser.alarms.create('reminder-orphan', { when: Date.now() + 60_000 });
    await fakeBrowser.alarms.create('unrelated', { when: Date.now() + 60_000 });

    await syncReminderAlarms();

    expect((await fakeBrowser.alarms.getAll()).map((alarm) => alarm.name)).toEqual(['unrelated']);
  });
});
