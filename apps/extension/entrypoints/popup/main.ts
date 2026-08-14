import '@andersseen/web-components/components/and-button.js';
import '@andersseen/web-components/components/and-card.js';
import '@andersseen/web-components/components/and-icon.js';
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
import { browser } from 'wxt/browser';
import { cancelReminderAlarm, scheduleReminderAlarm } from '../../utils/alarms';
import {
  addReminder,
  loadReminders,
  removeReminder,
  updateStoredReminder,
} from '../../utils/storage';

registerStickyIcons();

type Filter = 'pending' | 'completed';

const EMPTY_COPY: Record<Filter, { icon: string; title: string; description: string }> = {
  pending: {
    icon: 'bell',
    title: 'No reminders yet',
    description: 'Add one above and your browser will nudge you when the time comes.',
  },
  completed: {
    icon: 'check',
    title: 'Nothing done yet',
    description: 'Reminders you tick off collect here.',
  },
};

const container = document.getElementById('reminders') as HTMLElement;
const form = document.querySelector('sr-reminder-form') as SrReminderForm;
const formHeading = document.getElementById('form-heading') as HTMLElement;
const filterBar = document.getElementById('filters') as HTMLElement;
const optionsButton = document.getElementById('open-options') as HTMLElement;

// Only the static chrome animates. A popup is barely taller than its content,
// so scroll-triggered reveals on the list would leave rows that start below the
// fold sitting at opacity 0 until the user scrolls.
new MotionController().scan();

/** Id of the reminder being edited, or null while creating a new one. */
let editingId: string | null = null;
let filter: Filter = 'pending';

function matchesFilter(reminder: Reminder): boolean {
  return filter === 'completed' ? reminder.completed : !reminder.completed;
}

/** Kept in light DOM so the copy is part of the page text, not a shadow root. */
function renderEmptyState(): HTMLElement {
  const { icon, title, description } = EMPTY_COPY[filter];
  const empty = document.createElement('sr-empty-state');
  empty.icon = icon;

  const heading = document.createElement('span');
  heading.slot = 'title';
  heading.textContent = title;
  empty.append(heading, document.createTextNode(description));

  return empty;
}

function renderCounts(reminders: Reminder[]) {
  const counts: Record<Filter, number> = {
    pending: reminders.filter((r) => !r.completed).length,
    completed: reminders.filter((r) => r.completed).length,
  };

  for (const node of filterBar.querySelectorAll<HTMLElement>('[data-count]')) {
    node.textContent = String(counts[node.dataset.count as Filter]);
  }
}

function renderList(reminders: Reminder[]) {
  renderCounts(reminders);

  const visible = listReminders(reminders.filter(matchesFilter));
  if (visible.length === 0) {
    container.replaceChildren(renderEmptyState());
    return;
  }

  // Built as elements rather than an HTML string: reminder titles and notes are
  // user input and must never be parsed as markup.
  container.replaceChildren(
    ...visible.map((reminder) => {
      const item = document.createElement('sr-reminder-item');
      item.reminder = reminder;
      return item;
    }),
  );
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

filterBar.addEventListener('click', (event) => {
  const tab = (event.target as HTMLElement).closest<HTMLElement>('[data-filter]');
  if (!tab || tab.dataset.filter === filter) return;

  filter = tab.dataset.filter as Filter;
  for (const node of filterBar.querySelectorAll<HTMLElement>('[data-filter]')) {
    node.setAttribute('aria-selected', String(node === tab));
  }
  void refreshList();
});

optionsButton.addEventListener('click', () => {
  void browser.runtime.openOptionsPage();
});

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
