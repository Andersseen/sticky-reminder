import '@andersseen/web-components/components/and-card.js';
import '@andersseen/web-components/components/and-icon.js';
import './style.css';
import { MotionController } from '@andersseen/motion';
import { type Reminder, listReminders, toggleReminderCompletion } from '@sticky-reminder/core';
import { isOverdue, registerStickyIcons } from '@sticky-reminder/ui';
import { cancelReminderAlarm, scheduleReminderAlarm } from '../../utils/alarms';
import { loadReminders, removeReminder, updateStoredReminder } from '../../utils/storage';

registerStickyIcons();

type Filter = 'all' | 'pending' | 'completed';

const container = document.getElementById('reminders') as HTMLElement;
const filterBar = document.getElementById('filters') as HTMLElement;
const search = document.getElementById('search') as HTMLInputElement;

// The static chrome animates once; list rows do not, so a row that renders
// below the fold is never left waiting at opacity 0 for a scroll.
new MotionController().scan();

let filter: Filter = 'all';
let query = '';

/** Set when the page was opened from a notification, cleared once scrolled to. */
let highlightId = new URLSearchParams(window.location.search).get('reminder');

function matches(reminder: Reminder): boolean {
  if (filter === 'pending' && reminder.completed) return false;
  if (filter === 'completed' && !reminder.completed) return false;
  if (query === '') return true;

  return `${reminder.title} ${reminder.body}`.toLowerCase().includes(query);
}

function renderEmptyState(): HTMLElement {
  const empty = document.createElement('sr-empty-state');
  empty.icon = query === '' ? 'bell' : 'search';

  const heading = document.createElement('span');
  heading.slot = 'title';
  heading.textContent = query === '' ? 'No reminders yet' : 'No matches';
  empty.append(
    heading,
    document.createTextNode(
      query === ''
        ? 'Open the popup from the toolbar to create your first one.'
        : `Nothing here matches “${search.value.trim()}”.`,
    ),
  );

  return empty;
}

function renderStats(reminders: Reminder[]) {
  const pending = reminders.filter((r) => !r.completed);
  const stats: Record<string, number> = {
    all: reminders.length,
    total: reminders.length,
    pending: pending.length,
    overdue: pending.filter((r) => isOverdue(new Date(r.scheduledAt))).length,
    completed: reminders.filter((r) => r.completed).length,
  };

  for (const node of document.querySelectorAll<HTMLElement>('[data-stat], [data-count]')) {
    const key = node.dataset.stat ?? node.dataset.count;
    if (key) node.textContent = String(stats[key] ?? 0);
  }
}

function renderList(reminders: Reminder[]) {
  renderStats(reminders);

  const visible = listReminders(reminders.filter(matches));
  if (visible.length === 0) {
    container.replaceChildren(renderEmptyState());
    return;
  }

  container.replaceChildren(
    ...visible.map((reminder) => {
      const item = document.createElement('sr-reminder-item');
      item.reminder = reminder;
      // Editing needs the form, which only the popup has.
      item.editable = false;
      item.dataset.id = reminder.id;
      return item;
    }),
  );
  revealHighlighted();
}

/**
 * Clicking a notification opens this page with `?reminder=<id>`; without this
 * the user lands on an undifferentiated list and has to find the row again.
 */
function revealHighlighted() {
  if (!highlightId) return;

  const item = container.querySelector<HTMLElement>(`[data-id="${CSS.escape(highlightId)}"]`);
  if (!item) return;

  item.classList.add('is-highlighted');
  item.scrollIntoView({ behavior: 'smooth', block: 'center' });
  highlightId = null;
}

async function refreshList() {
  renderList(await loadReminders());
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

search.addEventListener('input', () => {
  query = search.value.trim().toLowerCase();
  void refreshList();
});

container.addEventListener('sr-reminder-toggle', async (event) => {
  const { id } = (event as CustomEvent<{ id: string }>).detail;
  const reminder = (await loadReminders()).find((r) => r.id === id);
  if (!reminder) return;

  const toggled = toggleReminderCompletion(reminder);
  await updateStoredReminder(toggled);
  await cancelReminderAlarm(id);
  await scheduleReminderAlarm(toggled);
  await refreshList();
});

container.addEventListener('sr-reminder-delete', async (event) => {
  const { id } = (event as CustomEvent<{ id: string }>).detail;
  await cancelReminderAlarm(id);
  await removeReminder(id);
  await refreshList();
});

void refreshList();
