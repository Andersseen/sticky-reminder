import './style.css';
import { MotionController } from '@andersseen/motion';
import { type Reminder, listReminders, toggleReminderCompletion } from '@sticky-reminder/core';
import { registerStickyIcons } from '@sticky-reminder/ui';
import { cancelReminderAlarm, scheduleReminderAlarm } from '../../utils/alarms';
import { loadReminders, removeReminder, updateStoredReminder } from '../../utils/storage';

registerStickyIcons();

const container = document.getElementById('reminders') as HTMLElement;
const motion = new MotionController({ root: container });

function renderList(reminders: Reminder[]) {
  if (reminders.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No reminders yet. Open the popup to create one.';
    container.replaceChildren(empty);
    return;
  }

  container.replaceChildren(
    ...listReminders(reminders).map((reminder) => {
      const item = document.createElement('sr-reminder-item');
      item.reminder = reminder;
      // Editing needs the form, which only the popup has.
      item.editable = false;
      item.setAttribute('and-motion', 'fade-in');
      return item;
    }),
  );
  motion.scan();
}

async function refreshList() {
  renderList(await loadReminders());
}

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
