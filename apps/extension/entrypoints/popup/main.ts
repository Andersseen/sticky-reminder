import '@andersseen/web-components/components/and-card.js';
import './style.css';
import { MotionController } from '@andersseen/motion';
import {
  type Reminder,
  createReminder,
  listReminders,
  toggleReminderCompletion,
  updateReminder,
} from '@sticky-reminder/core';
import {
  type ReminderFormData,
  type SrReminderForm,
  registerStickyIcons,
} from '@sticky-reminder/ui';
import { cancelReminderAlarm, scheduleReminderAlarm } from '../../utils/alarms';
import {
  addReminder,
  loadReminders,
  removeReminder,
  updateStoredReminder,
} from '../../utils/storage';

registerStickyIcons();

const container = document.getElementById('reminders') as HTMLElement;
const form = document.querySelector('sr-reminder-form') as SrReminderForm;
const formHeading = document.getElementById('form-heading') as HTMLElement;
const motion = new MotionController({ root: container });

/** Id of the reminder being edited, or null while creating a new one. */
let editingId: string | null = null;

function renderList(reminders: Reminder[]) {
  if (reminders.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No reminders yet.';
    container.replaceChildren(empty);
    return;
  }

  // Built as elements rather than an HTML string: reminder titles and notes are
  // user input and must never be parsed as markup.
  container.replaceChildren(
    ...listReminders(reminders).map((reminder) => {
      const item = document.createElement('sr-reminder-item');
      item.reminder = reminder;
      item.setAttribute('and-motion', 'fade-in');
      return item;
    }),
  );
  motion.scan();
}

async function refreshList() {
  renderList(await loadReminders());
}

function startCreating() {
  editingId = null;
  form.reset();
  form.submitLabel = 'Remind me';
  form.cancelable = false;
  formHeading.textContent = 'New reminder';
}

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` in local time, not an ISO instant. */
function toLocalInputValue(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

async function startEditing(id: string) {
  const reminder = (await loadReminders()).find((r) => r.id === id);
  if (!reminder) return;

  editingId = id;
  form.value = {
    title: reminder.title,
    body: reminder.body,
    scheduledAt: toLocalInputValue(reminder.scheduledAt),
    repeat: reminder.repeat,
  };
  form.submitLabel = 'Save changes';
  form.cancelable = true;
  formHeading.textContent = 'Edit reminder';
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Alarms are keyed by reminder id, so rescheduling means clearing first. */
async function rescheduleAlarm(reminder: Reminder) {
  await cancelReminderAlarm(reminder.id);
  await scheduleReminderAlarm(reminder);
}

form.addEventListener('sr-submit', async (event) => {
  const data = (event as CustomEvent<ReminderFormData>).detail;

  const scheduledAt = new Date(data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return;

  if (editingId) {
    const existing = (await loadReminders()).find((r) => r.id === editingId);
    if (!existing) return;

    const updated = updateReminder(existing, { ...data, scheduledAt: scheduledAt.toISOString() });
    await updateStoredReminder(updated);
    await rescheduleAlarm(updated);
  } else {
    const reminder = createReminder({ ...data, scheduledAt: scheduledAt.toISOString() });
    await addReminder(reminder);
    await scheduleReminderAlarm(reminder);
  }

  startCreating();
  await refreshList();
});

form.addEventListener('sr-cancel', startCreating);

container.addEventListener('sr-reminder-toggle', async (event) => {
  const { id } = (event as CustomEvent<{ id: string }>).detail;
  const reminder = (await loadReminders()).find((r) => r.id === id);
  if (!reminder) return;

  const toggled = toggleReminderCompletion(reminder);
  await updateStoredReminder(toggled);
  // A completed reminder resolves to no next alarm, so this clears it; marking
  // it pending again puts the alarm back.
  await rescheduleAlarm(toggled);
  await refreshList();
});

container.addEventListener('sr-reminder-edit', (event) => {
  void startEditing((event as CustomEvent<{ id: string }>).detail.id);
});

container.addEventListener('sr-reminder-delete', async (event) => {
  const { id } = (event as CustomEvent<{ id: string }>).detail;
  await cancelReminderAlarm(id);
  await removeReminder(id);
  if (editingId === id) startCreating();
  await refreshList();
});

void refreshList();
