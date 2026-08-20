// Must stay above the component imports: it fills the icon registry, and
// defining an `and-*` element renders every icon inside it against whatever the
// registry holds at that instant.
import '@sticky-reminder/ui/icons';
import '@andersseen/web-components/components/and-badge.js';
import '@andersseen/web-components/components/and-button.js';
import '@andersseen/web-components/components/and-card.js';
import '@andersseen/web-components/components/and-icon.js';
import '@andersseen/web-components/components/and-skeleton.js';
import '@andersseen/web-components/components/and-tabs-content.js';
import '@andersseen/web-components/components/and-tabs-list.js';
import '@andersseen/web-components/components/and-tabs-trigger.js';
import '@andersseen/web-components/components/and-tabs.js';
import '@andersseen/web-components/components/and-tooltip.js';
// Defines <sr-reminder-form>, <sr-reminder-item> and <sr-empty-state>. The page
// only ever names them in markup, so without this nothing pulls them in.
import '@sticky-reminder/ui';
import { MotionController } from '@andersseen/motion';
import {
  type Reminder,
  createReminder,
  listReminders,
  toggleReminderCompletion,
  updateReminder,
} from '@sticky-reminder/core';
import type { ReminderFormData, SrReminderForm } from '@sticky-reminder/ui';
import { browser } from 'wxt/browser';
import { cancelReminderAlarm, scheduleReminderAlarm } from '../../utils/alarms';
import {
  addReminder,
  loadReminders,
  removeReminder,
  updateStoredReminder,
} from '../../utils/storage';

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

const form = document.querySelector('sr-reminder-form') as SrReminderForm;
const formHeading = document.getElementById('form-heading') as HTMLElement;
const tabs = document.getElementById('filters') as HTMLElement;
const optionsButton = document.getElementById('open-options') as HTMLElement;
const sidePanelButton = document.getElementById('open-sidebar') as HTMLElement | null;
const sidePanelTip = document.getElementById('open-sidebar-tip') as HTMLElement | null;

/** The panel `and-tabs` is currently showing. Its id is generated, so: by value. */
function panel(name: Filter = filter): HTMLElement {
  return tabs.querySelector(`and-tabs-content[value="${name}"]`) as HTMLElement;
}

/**
 * Fills the panel on screen and empties the others. Only one filter is visible
 * at a time, and a hidden panel left holding its last render keeps rows for
 * reminders that may since have been edited or deleted.
 */
function fillPanel(...nodes: Node[]) {
  const active = panel();
  for (const content of tabs.querySelectorAll<HTMLElement>('and-tabs-content')) {
    content.replaceChildren(...(content === active ? nodes : []));
  }
}

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

  for (const node of tabs.querySelectorAll<HTMLElement>('[data-count]')) {
    node.textContent = String(counts[node.dataset.count as Filter]);
  }
}

/**
 * Reading storage is fast but not instant, and an empty panel in the meantime
 * reads as "you have no reminders" — the one thing the list must never say
 * while it still has no idea. Sized to a row so nothing jumps when the real
 * ones land.
 */
function renderLoading() {
  fillPanel(
    ...Array.from({ length: 2 }, () => {
      const skeleton = document.createElement('and-skeleton');
      skeleton.height = '62px';
      return skeleton;
    }),
  );
}

function renderList(reminders: Reminder[]) {
  renderCounts(reminders);

  const visible = listReminders(reminders.filter(matchesFilter));
  if (visible.length === 0) {
    fillPanel(renderEmptyState());
    return;
  }

  // Built as elements rather than an HTML string: reminder titles and notes are
  // user input and must never be parsed as markup.
  fillPanel(
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

function canOpenSidePanel(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.sidePanel?.open);
}

async function openSidePanel() {
  if (!canOpenSidePanel()) return;

  const currentWindow = await browser.windows.getCurrent();
  const { id: windowId } = currentWindow;
  if (typeof windowId !== 'number') return;

  await chrome.sidePanel.open({ windowId });
  window.close();
}

// `and-tabs` owns the selection, the roving tabindex and the arrow keys; all
// that is left is to fill the panel it just switched to.
tabs.addEventListener('andTabChange', (event) => {
  filter = (event as CustomEvent<Filter>).detail;
  void refreshList();
});

optionsButton.addEventListener('click', () => {
  void browser.runtime.openOptionsPage();
});

if (sidePanelButton && canOpenSidePanel()) {
  // The tooltip wraps the button, so it is the tooltip that has to appear.
  sidePanelTip?.removeAttribute('hidden');
  sidePanelButton.addEventListener('click', () => {
    void openSidePanel();
  });
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

tabs.addEventListener('sr-reminder-toggle', async (event) => {
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

tabs.addEventListener('sr-reminder-edit', (event) => {
  void startEditing((event as CustomEvent<{ id: string }>).detail.id);
});

tabs.addEventListener('sr-reminder-delete', async (event) => {
  const { id } = (event as CustomEvent<{ id: string }>).detail;
  await cancelReminderAlarm(id);
  await removeReminder(id);
  if (editingId === id) startCreating();
  await refreshList();
});

renderLoading();
void refreshList();
