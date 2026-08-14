import '@sticky-reminder/ui';
import '@sticky-reminder/ui/styles';
import {
  type Reminder,
  createReminder,
  formatReminderListItem,
  listReminders,
} from '@sticky-reminder/core';
import type { ReminderFormData } from '@sticky-reminder/ui';
import { scheduleReminderAlarm } from '../../utils/alarms';
import { addReminder, loadReminders, removeReminder } from '../../utils/storage';

function renderList(reminders: Reminder[]) {
  const container = document.getElementById('reminders');
  if (!container) return;

  if (reminders.length === 0) {
    container.innerHTML = '<p class="empty">No reminders yet.</p>';
    return;
  }

  container.innerHTML = listReminders(reminders)
    .map(
      (reminder) => `
        <div class="item" data-id="${reminder.id}">
          <span>${formatReminderListItem(reminder)}</span>
          <button class="delete" aria-label="Delete">×</button>
        </div>
      `,
    )
    .join('');

  for (const button of container.querySelectorAll('.delete')) {
    button.addEventListener('click', async () => {
      const id = (button.closest('.item') as HTMLElement)?.dataset.id;
      if (!id) return;
      await removeReminder(id);
      await refreshList();
    });
  }
}

async function refreshList() {
  const reminders = await loadReminders();
  renderList(reminders);
}

document.addEventListener('sr-submit', async (event) => {
  const data = (event as CustomEvent<ReminderFormData>).detail;
  const reminder = createReminder({
    title: data.title,
    body: data.body,
    scheduledAt: new Date(data.scheduledAt).toISOString(),
    repeat: 'none',
  });

  await addReminder(reminder);
  await scheduleReminderAlarm(reminder);
  await refreshList();

  const form = document.querySelector('sr-reminder-form');
  if (form) {
    (form as HTMLElement).shadowRoot?.querySelector('form')?.reset();
  }
});

refreshList();
