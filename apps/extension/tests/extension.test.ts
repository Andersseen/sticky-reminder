import { createReminder } from '@sticky-reminder/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';

vi.mock('wxt/browser', () => ({
  browser: fakeBrowser,
}));

const { alarmNameFor, reminderIdFromAlarmName, scheduleReminderAlarm, syncReminderAlarms } =
  await import('../utils/alarms');
const { loadReminders, saveReminders } = await import('../utils/storage');

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

  it('does not schedule anything for an overdue one-off reminder', async () => {
    const reminder = createReminder({
      title: 'T',
      body: 'B',
      scheduledAt: new Date(Date.now() - 60_000).toISOString(),
      repeat: 'none',
    });
    await scheduleReminderAlarm(reminder);

    expect(await fakeBrowser.alarms.getAll()).toHaveLength(0);
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
});
