import { createReminder } from '@sticky-reminder/core';
import { describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';

vi.mock('wxt/browser', () => ({
  browser: fakeBrowser,
}));

const { alarmNameFor, reminderIdFromAlarmName, scheduleReminderAlarm } = await import(
  '../utils/alarms'
);
const { loadReminders, saveReminders } = await import('../utils/storage');

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
});
