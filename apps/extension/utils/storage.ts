import type { Reminder } from '@sticky-reminder/core';
import { browser } from 'wxt/browser';

const LEGACY_STORAGE_KEY = 'reminders';
const SCHEMA_VERSION_KEY = 'stickyReminder.schemaVersion';
const REMINDER_KEY_PREFIX = 'stickyReminder.reminder.';
const CURRENT_SCHEMA_VERSION = 1;

function storageKey(id: string): string {
  return `${REMINDER_KEY_PREFIX}${id}`;
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

/** Storage is user-controlled and survives upgrades, so never trust its shape. */
export function isReminder(value: unknown): value is Reminder {
  if (!value || typeof value !== 'object') return false;
  const reminder = value as Record<string, unknown>;

  return (
    typeof reminder.id === 'string' &&
    reminder.id.length > 0 &&
    typeof reminder.title === 'string' &&
    typeof reminder.body === 'string' &&
    isValidDate(reminder.createdAt) &&
    isValidDate(reminder.updatedAt) &&
    isValidDate(reminder.scheduledAt) &&
    (reminder.repeat === 'none' || reminder.repeat === 'daily' || reminder.repeat === 'weekly') &&
    typeof reminder.completed === 'boolean'
  );
}

/**
 * v0.1.0 stored every reminder in one array. Besides accepting malformed data,
 * that made simultaneous popup/options/background writes overwrite each other.
 * Move each reminder to its own key so unrelated writes are independent.
 */
async function ensureCurrentSchema(): Promise<void> {
  const snapshot = await browser.storage.local.get(null);
  const version = snapshot[SCHEMA_VERSION_KEY];
  if (version === CURRENT_SCHEMA_VERSION) return;
  if (typeof version === 'number' && version > CURRENT_SCHEMA_VERSION) {
    throw new Error(`Unsupported Sticky Reminder storage schema: ${version}`);
  }

  const migrated = new Map<string, Reminder>();
  for (const [key, value] of Object.entries(snapshot)) {
    if (key.startsWith(REMINDER_KEY_PREFIX) && isReminder(value)) {
      migrated.set(value.id, value);
    }
  }

  const legacy = snapshot[LEGACY_STORAGE_KEY];
  if (Array.isArray(legacy)) {
    for (const value of legacy) {
      if (isReminder(value) && !migrated.has(value.id)) migrated.set(value.id, value);
    }
  }

  await browser.storage.local.set({
    [SCHEMA_VERSION_KEY]: CURRENT_SCHEMA_VERSION,
    ...Object.fromEntries([...migrated].map(([id, reminder]) => [storageKey(id), reminder])),
  });
  await browser.storage.local.remove(LEGACY_STORAGE_KEY);
}

export async function loadReminders(): Promise<Reminder[]> {
  await ensureCurrentSchema();
  const result = await browser.storage.local.get(null);
  return Object.entries(result)
    .filter(([key]) => key.startsWith(REMINDER_KEY_PREFIX))
    .map(([, value]) => value)
    .filter(isReminder);
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  await ensureCurrentSchema();
  const snapshot = await browser.storage.local.get(null);
  const desired = new Set(reminders.map((reminder) => storageKey(reminder.id)));
  const obsolete = Object.keys(snapshot).filter(
    (key) => key.startsWith(REMINDER_KEY_PREFIX) && !desired.has(key),
  );

  await browser.storage.local.set({
    [SCHEMA_VERSION_KEY]: CURRENT_SCHEMA_VERSION,
    ...Object.fromEntries(reminders.map((reminder) => [storageKey(reminder.id), reminder])),
  });
  if (obsolete.length > 0) await browser.storage.local.remove(obsolete);
}

export async function addReminder(reminder: Reminder): Promise<void> {
  await ensureCurrentSchema();
  await browser.storage.local.set({ [storageKey(reminder.id)]: reminder });
}

export async function removeReminder(id: string): Promise<void> {
  await ensureCurrentSchema();
  await browser.storage.local.remove(storageKey(id));
}

export async function updateStoredReminder(updated: Reminder): Promise<void> {
  await ensureCurrentSchema();
  await browser.storage.local.set({ [storageKey(updated.id)]: updated });
}
