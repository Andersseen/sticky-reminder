import {
  advanceReminder,
  formatNotificationBody,
  formatNotificationTitle,
} from '@sticky-reminder/core';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import {
  reminderIdFromAlarmName,
  scheduleReminderAlarm,
  syncReminderAlarms,
} from '../utils/alarms';
import { loadReminders, updateStoredReminder } from '../utils/storage';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    void syncReminderAlarms();
  });

  browser.runtime.onStartup.addListener(() => {
    void syncReminderAlarms();
  });

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

    // Repeating reminders roll forward to their next occurrence and get a fresh
    // alarm; one-off reminders are marked completed and schedule nothing.
    const advanced = advanceReminder(reminder);
    await updateStoredReminder(advanced);
    await scheduleReminderAlarm(advanced);
  });

  browser.notifications.onClicked.addListener((notificationId) => {
    browser.tabs.create({ url: `options.html?reminder=${notificationId}` });
  });
});
