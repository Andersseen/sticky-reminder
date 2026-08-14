import { formatNotificationBody, formatNotificationTitle } from '@sticky-reminder/core';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/sandbox';
import { reminderIdFromAlarmName } from '../utils/alarms';
import { loadReminders, updateStoredReminder } from '../utils/storage';

export default defineBackground(() => {
  browser.alarms.onAlarm.addListener(async (alarm) => {
    const id = reminderIdFromAlarmName(alarm.name);
    if (!id) return;

    const reminders = await loadReminders();
    const reminder = reminders.find((r) => r.id === id);
    if (!reminder) return;

    await browser.notifications.create(id, {
      type: 'basic',
      iconUrl: '/icon/128.png',
      title: formatNotificationTitle(reminder),
      message: formatNotificationBody(reminder),
    });

    reminder.completed = true;
    await updateStoredReminder(reminder);
  });

  browser.notifications.onClicked.addListener((notificationId) => {
    browser.tabs.create({ url: `options.html?reminder=${notificationId}` });
  });
});
