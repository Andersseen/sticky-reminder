import type { Reminder } from '@sticky-reminder/core';
import { browser } from 'wxt/browser';

const STORAGE_KEY = 'reminders';

export async function loadReminders(): Promise<Reminder[]> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as Reminder[] | undefined) ?? [];
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: reminders });
}

export async function addReminder(reminder: Reminder): Promise<void> {
  const reminders = await loadReminders();
  reminders.push(reminder);
  await saveReminders(reminders);
}

export async function removeReminder(id: string): Promise<void> {
  const reminders = await loadReminders();
  await saveReminders(reminders.filter((r) => r.id !== id));
}

export async function updateStoredReminder(updated: Reminder): Promise<void> {
  const reminders = await loadReminders();
  await saveReminders(reminders.map((r) => (r.id === updated.id ? updated : r)));
}
