// Must stay above the component imports: it fills the icon registry, and
// defining an `and-*` element renders every icon inside it against whatever the
// registry holds at that instant.
import '@sticky-reminder/ui/icons';
import '@andersseen/web-components/components/and-alert.js';
import '@andersseen/web-components/components/and-badge.js';
import '@andersseen/web-components/components/and-card.js';
import '@andersseen/web-components/components/and-button.js';
import '@andersseen/web-components/components/and-icon.js';
import '@andersseen/web-components/components/and-input.js';
import '@andersseen/web-components/components/and-skeleton.js';
import '@andersseen/web-components/components/and-tabs-content.js';
import '@andersseen/web-components/components/and-tabs-list.js';
import '@andersseen/web-components/components/and-tabs-trigger.js';
import '@andersseen/web-components/components/and-tabs.js';
import './style.css';
import { MotionController } from '@andersseen/motion';
import {
  type Reminder,
  countUnacknowledged,
  listReminders,
  toggleReminderCompletion,
} from '@sticky-reminder/core';
import { isOverdue } from '@sticky-reminder/ui';
import { cancelReminderAlarm, scheduleReminderAlarm, syncReminderAlarms } from '../../utils/alarms';
import {
  notificationSettingsHint,
  notificationsAllowed,
  sendTestNotification,
} from '../../utils/notifications';
import {
  createReminderBackup,
  importReminderBackup,
  loadReminders,
  removeReminder,
  updateStoredReminder,
} from '../../utils/storage';

type Filter = 'all' | 'pending' | 'completed';

const tabs = document.getElementById('filters') as HTMLElement;
const search = document.getElementById('search') as HTMLElement & { value: string };
const exportBackup = document.getElementById('export-backup') as HTMLElement;
const importBackup = document.getElementById('import-backup') as HTMLElement;
const backupFile = document.getElementById('backup-file') as HTMLInputElement;
const backupStatus = document.getElementById('backup-status') as HTMLElement;
const searchTerm = () => search.value ?? '';
const testNotification = document.getElementById('test-notification') as HTMLElement;
const notificationStatus = document.getElementById('notification-status') as HTMLElement;
const permissionWarning = document.getElementById('permission-warning') as HTMLElement;
const waitingStat = document.querySelector('.stat-waiting') as HTMLElement;

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

const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

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
        : `Nothing here matches “${searchTerm().trim()}”.`,
    ),
  );

  return empty;
}

function renderStats(reminders: Reminder[]) {
  const pending = reminders.filter((r) => !r.completed);
  const waiting = countUnacknowledged(reminders);
  const stats: Record<string, number> = {
    all: reminders.length,
    total: reminders.length,
    pending: pending.length,
    overdue: pending.filter((r) => isOverdue(new Date(r.scheduledAt))).length,
    completed: reminders.filter((r) => r.completed).length,
    waiting,
  };

  for (const node of document.querySelectorAll<HTMLElement>('[data-stat], [data-count]')) {
    const key = node.dataset.stat ?? node.dataset.count;
    if (key) node.textContent = String(stats[key] ?? 0);
  }

  // A permanent "Not answered: 0" would be noise; it only earns a slot when
  // there is something in it.
  waitingStat.hidden = waiting === 0;
}

/** Sized to a row, so the list does not claim to be empty before it has read. */
function renderLoading() {
  fillPanel(
    ...Array.from({ length: 3 }, () => {
      const skeleton = document.createElement('and-skeleton');
      skeleton.height = '68px';
      return skeleton;
    }),
  );
}

function renderList(reminders: Reminder[]) {
  renderStats(reminders);

  const visible = listReminders(reminders.filter(matches));
  if (visible.length === 0) {
    fillPanel(renderEmptyState());
    return;
  }

  fillPanel(
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

  const item = panel().querySelector<HTMLElement>(`[data-id="${CSS.escape(highlightId)}"]`);
  if (!item) return;

  item.classList.add('is-highlighted');
  item.scrollIntoView({ behavior: 'smooth', block: 'center' });
  highlightId = null;
}

async function refreshList() {
  renderList(await loadReminders());
}

/**
 * `and-alert` announces itself the moment it mounts, which is why both of these
 * start hidden rather than as an empty alert sitting on the page: they only
 * exist once there is something to say about an action the user just took.
 */
function setAlert(alert: HTMLElement, message: string, error = false) {
  alert.textContent = message;
  alert.setAttribute('variant', error ? 'destructive' : 'default');
  alert.hidden = false;
}

function setBackupStatus(message: string, error = false) {
  setAlert(backupStatus, message, error);
}

function setNotificationStatus(message: string, error = false) {
  setAlert(notificationStatus, message, error);
}

exportBackup.addEventListener('click', async () => {
  const backup = createReminderBackup(await loadReminders());
  const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `sticky-reminder-backup-${backup.exportedAt.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(href);
  setBackupStatus(`Exported ${backup.reminders.length} reminders.`);
});

importBackup.addEventListener('click', () => backupFile.click());

testNotification.addEventListener('click', async () => {
  try {
    await sendTestNotification();
    // The browser taking it is as far as the extension can see. If nothing
    // appeared on screen, the desktop dropped it after that point, and the
    // whole of the fix is one switch the extension cannot reach — so say which
    // one rather than leaving the user to conclude reminders are broken.
    setNotificationStatus(
      `Sent. If nothing appeared, the browser accepted it and your desktop discarded it. ${notificationSettingsHint()}`,
    );
  } catch {
    setNotificationStatus('Could not send a notification. Check browser permissions.', true);
  }
});

backupFile.addEventListener('change', async () => {
  const file = backupFile.files?.[0];
  backupFile.value = '';
  if (!file) return;

  try {
    if (file.size > MAX_BACKUP_BYTES) throw new Error('The backup is larger than 5 MB.');
    const result = await importReminderBackup(JSON.parse(await file.text()));
    await syncReminderAlarms();
    await refreshList();
    setBackupStatus(`Imported ${result.imported}; ${result.total} reminders now stored.`);
  } catch (error) {
    setBackupStatus(
      error instanceof Error ? error.message : 'The backup could not be imported.',
      true,
    );
  }
});

// `and-tabs` owns the selection, the roving tabindex and the arrow keys; all
// that is left is to fill the panel it just switched to.
tabs.addEventListener('andTabChange', (event) => {
  filter = (event as CustomEvent<Filter>).detail;
  void refreshList();
});

// `and-input` renders a real input but reports through its own event, and the
// native one does not cross out of the component.
search.addEventListener('andInputChange', (event) => {
  query = (event as CustomEvent<string>).detail.trim().toLowerCase();
  void refreshList();
});

tabs.addEventListener('sr-reminder-toggle', async (event) => {
  const { id } = (event as CustomEvent<{ id: string }>).detail;
  const reminder = (await loadReminders()).find((r) => r.id === id);
  if (!reminder) return;

  const toggled = toggleReminderCompletion(reminder);
  await updateStoredReminder(toggled);
  await cancelReminderAlarm(id);
  await scheduleReminderAlarm(toggled);
  await refreshList();
});

tabs.addEventListener('sr-reminder-delete', async (event) => {
  const { id } = (event as CustomEvent<{ id: string }>).detail;
  await cancelReminderAlarm(id);
  await removeReminder(id);
  await refreshList();
});

/**
 * A reminder the browser is not allowed to show is worth saying out loud
 * before someone trusts it with something that matters, rather than leaving
 * them to discover it by the notification that never arrived.
 */
async function checkNotificationPermission() {
  permissionWarning.hidden = (await notificationsAllowed()) !== false;
}

renderLoading();
void refreshList();
void checkNotificationPermission();
