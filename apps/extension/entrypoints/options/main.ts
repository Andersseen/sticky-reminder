import '@sticky-reminder/ui';
import '@sticky-reminder/ui/styles';
import { formatReminderListItem, listReminders } from '@sticky-reminder/core';
import { loadReminders, removeReminder } from '../../utils/storage';

async function render() {
  const reminders = await loadReminders();
  const container = document.getElementById('reminders');
  if (!container) return;

  if (reminders.length === 0) {
    container.innerHTML = '<p>No reminders.</p>';
    return;
  }

  container.innerHTML = `
    <ul>
      ${listReminders(reminders)
        .map(
          (r) => `
          <li data-id="${r.id}">
            ${formatReminderListItem(r)}
            <button class="delete">Delete</button>
          </li>
        `,
        )
        .join('')}
    </ul>
  `;

  for (const button of container.querySelectorAll('.delete')) {
    button.addEventListener('click', async () => {
      const id = (button.closest('li') as HTMLElement)?.dataset.id;
      if (!id) return;
      await removeReminder(id);
      await render();
    });
  }
}

render();
