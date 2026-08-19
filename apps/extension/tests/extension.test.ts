import { createReminder } from '@sticky-reminder/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

vi.mock('wxt/browser', () => ({
  browser: fakeBrowser,
}));

const {
  alarmNameFor,
  cancelFollowUps,
  cancelReminderAlarm,
  parseAlarmName,
  renotifyAlarmName,
  reminderIdFromAlarmName,
  scheduleFollowUp,
  scheduleReminderAlarm,
  snoozeAlarmName,
  syncReminderAlarms,
} = await import('../utils/alarms');
const { TEST_NOTIFICATION_ID, sendTestNotification, showReminderNotification } = await import(
  '../utils/notifications'
);
const { refreshBadge } = await import('../utils/badge');
const {
  addReminder,
  createReminderBackup,
  importReminderBackup,
  isReminder,
  loadReminders,
  parseReminderBackup,
  peekReminders,
  saveReminders,
} = await import('../utils/storage');

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

  it('creates and parses a versioned portable backup', () => {
    const reminder = createReminder({
      title: 'Portable',
      body: '',
      scheduledAt: new Date(Date.now() + 60_000).toISOString(),
      repeat: 'weekly',
    });
    const exportedAt = new Date('2026-08-18T12:00:00.000Z');
    const backup = createReminderBackup([reminder], exportedAt);

    expect(parseReminderBackup(JSON.parse(JSON.stringify(backup)))).toEqual(backup);
    expect(backup.exportedAt).toBe(exportedAt.toISOString());
  });

  it('rejects unsupported or partially invalid backups', () => {
    expect(() => parseReminderBackup({ format: 'other', version: 1 })).toThrow(/supported/);
    expect(() =>
      parseReminderBackup({
        format: 'sticky-reminder-backup',
        version: 1,
        exportedAt: new Date().toISOString(),
        reminders: [{ id: 'broken' }],
      }),
    ).toThrow(/invalid reminder/);
  });

  it('merges imported reminders and replaces matching ids', async () => {
    const current = createReminder({
      title: 'Current',
      body: '',
      scheduledAt: new Date(Date.now() + 60_000).toISOString(),
      repeat: 'none',
    });
    const extra = createReminder({
      title: 'Extra',
      body: '',
      scheduledAt: new Date(Date.now() + 120_000).toISOString(),
      repeat: 'daily',
    });
    await saveReminders([current]);

    const result = await importReminderBackup(
      createReminderBackup([{ ...current, title: 'Restored' }, extra]),
    );

    expect(result).toEqual({ imported: 2, total: 2 });
    expect((await loadReminders()).map((reminder) => reminder.title).sort()).toEqual([
      'Extra',
      'Restored',
    ]);
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

describe('notifications', () => {
  it('sends a deterministic test notification', async () => {
    await expect(sendTestNotification(new Date('2026-08-18T12:34:00.000Z'))).resolves.toBe(
      TEST_NOTIFICATION_ID,
    );

    const notifications = await fakeBrowser.notifications.getAll();
    expect(Object.keys(notifications)).toEqual([TEST_NOTIFICATION_ID]);
  });

  it('replaces a previous test notification instead of piling them up', async () => {
    await sendTestNotification(new Date('2026-08-18T12:34:00.000Z'));
    await sendTestNotification(new Date('2026-08-18T12:35:00.000Z'));

    expect(Object.keys(await fakeBrowser.notifications.getAll())).toEqual([TEST_NOTIFICATION_ID]);
  });
});

describe('follow-up alarms', () => {
  const base = {
    title: 'Ship it',
    body: '',
    scheduledAt: new Date(Date.now() + 60_000).toISOString(),
    repeat: 'none' as const,
  };

  it('tells the three alarm namespaces apart', () => {
    expect(parseAlarmName(alarmNameFor(createReminder(base)))?.kind).toBe('due');
    expect(parseAlarmName(renotifyAlarmName('abc'))).toEqual({ kind: 'renotify', id: 'abc' });
    expect(parseAlarmName(snoozeAlarmName('abc'))).toEqual({ kind: 'snooze', id: 'abc' });
    expect(parseAlarmName('something-else')).toBeNull();
  });

  it('clears both follow-ups when the reminder is answered', async () => {
    await scheduleFollowUp(renotifyAlarmName('abc'), 1000);
    await scheduleFollowUp(snoozeAlarmName('abc'), 1000);
    expect((await fakeBrowser.alarms.getAll()).length).toBe(2);

    await cancelFollowUps('abc');
    expect(await fakeBrowser.alarms.getAll()).toEqual([]);
  });

  it('sweeps follow-ups belonging to a reminder that no longer exists', async () => {
    const reminder = createReminder(base);
    await addReminder(reminder);
    await scheduleFollowUp(renotifyAlarmName(reminder.id), 1000);
    await scheduleFollowUp(snoozeAlarmName('deleted-one'), 1000);

    await syncReminderAlarms();

    const names = (await fakeBrowser.alarms.getAll()).map((alarm) => alarm.name);
    expect(names).toContain(renotifyAlarmName(reminder.id));
    expect(names).not.toContain(snoozeAlarmName('deleted-one'));
  });

  it('takes the follow-ups down with the reminder alarm', async () => {
    const reminder = createReminder(base);
    await scheduleReminderAlarm(reminder);
    await scheduleFollowUp(renotifyAlarmName(reminder.id), 1000);

    await cancelReminderAlarm(reminder.id);
    expect(await fakeBrowser.alarms.getAll()).toEqual([]);
  });

  it('does not re-fire a one-off that already fired and is waiting to be answered', async () => {
    const fired = {
      ...createReminder({ ...base, scheduledAt: new Date(Date.now() - 60_000).toISOString() }),
      firedAt: new Date().toISOString(),
    };

    await scheduleReminderAlarm(fired);
    expect(await fakeBrowser.alarms.getAll()).toEqual([]);
  });
});

describe('badge', () => {
  it('counts only the reminders that fired without being answered', async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const make = (title: string) =>
      createReminder({ title, body: '', scheduledAt: future, repeat: 'none' });

    await saveReminders([
      { ...make('waiting'), firedAt: new Date().toISOString() },
      { ...make('answered and done'), firedAt: new Date().toISOString(), completed: true },
      make('not due yet'),
    ]);

    await expect(refreshBadge()).resolves.toBe(1);
    await expect(fakeBrowser.action.getBadgeText({})).resolves.toBe('1');
  });

  it('clears the badge when nothing is waiting', async () => {
    await saveReminders([]);
    await expect(refreshBadge()).resolves.toBe(0);
    await expect(fakeBrowser.action.getBadgeText({})).resolves.toBe('');
  });
});

describe('reminder notifications', () => {
  it('shows one notification per reminder, keyed by its id', async () => {
    const reminder = createReminder({
      title: 'Call the dentist',
      body: '',
      scheduledAt: new Date().toISOString(),
      repeat: 'none',
    });

    await showReminderNotification(reminder);
    await showReminderNotification({ ...reminder, notifyAttempts: 1 });

    expect(Object.keys(await fakeBrowser.notifications.getAll())).toEqual([reminder.id]);
  });
});

/**
 * Last on purpose: it trips the module-level capability probe in
 * notifications.ts, and the probe is deliberately sticky for the life of the
 * background script.
 */
describe('rich notification fallback', () => {
  it('retries without the options Firefox rejects, so the reminder still arrives', async () => {
    const reminder = createReminder({
      title: 'Renew the domain',
      body: '',
      scheduledAt: new Date().toISOString(),
      repeat: 'none',
    });

    const create = fakeBrowser.notifications.create.bind(fakeBrowser.notifications);
    const attempts: Record<string, unknown>[] = [];
    const spy = vi
      .spyOn(fakeBrowser.notifications, 'create')
      // biome-ignore lint/suspicious/noExplicitAny: the overloads are irrelevant here.
      .mockImplementation(((id: string, options: Record<string, unknown>) => {
        attempts.push(options);
        return 'buttons' in options
          ? Promise.reject(new Error('Type error for parameter options: unexpected property'))
          : // biome-ignore lint/suspicious/noExplicitAny: same.
            (create as any)(id, options);
      }) as any);

    await showReminderNotification(reminder);

    expect(attempts).toHaveLength(2);
    expect(attempts[0]).toHaveProperty('buttons');
    expect(attempts[1]).not.toHaveProperty('buttons');
    expect(attempts[1]).not.toHaveProperty('requireInteraction');
    expect(Object.keys(await fakeBrowser.notifications.getAll())).toEqual([reminder.id]);

    // Probed once: the second reminder goes straight to the plain call.
    attempts.length = 0;
    await showReminderNotification(reminder);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).not.toHaveProperty('buttons');

    spy.mockRestore();
  });
});

describe('peekReminders', () => {
  const legacy = {
    id: 'legacy-1',
    title: 'Written by v0.1.0',
    body: '',
    scheduledAt: new Date(Date.now() + 60_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    repeat: 'none' as const,
    completed: false,
  };

  it('reads without stamping the schema, so a later migration still runs', async () => {
    await fakeBrowser.storage.local.set({ reminders: [legacy] });

    // The badge asks this question on every storage change. If asking it wrote
    // the schema version, `loadReminders` would take its early return and this
    // record would never be migrated out of the legacy array.
    await expect(peekReminders()).resolves.toEqual([]);
    expect(await fakeBrowser.storage.local.get(null)).not.toHaveProperty(
      'stickyReminder.schemaVersion',
    );

    await expect(loadReminders()).resolves.toEqual([legacy]);
  });

  it('sees migrated reminders without touching storage', async () => {
    await saveReminders([legacy]);
    const before = await fakeBrowser.storage.local.get(null);

    await expect(peekReminders()).resolves.toEqual([legacy]);
    expect(await fakeBrowser.storage.local.get(null)).toEqual(before);
  });
});
