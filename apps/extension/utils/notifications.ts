import { browser } from 'wxt/browser';

export const TEST_NOTIFICATION_ID = 'sticky-reminder-test-notification';

export async function sendTestNotification(now = new Date()): Promise<string> {
  await browser.notifications.clear(TEST_NOTIFICATION_ID);
  await browser.notifications.create(TEST_NOTIFICATION_ID, {
    type: 'basic',
    iconUrl: '/icon/128.png',
    title: 'Sticky Reminder test',
    message: `Notifications are working. Sent at ${now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}.`,
  });

  return TEST_NOTIFICATION_ID;
}
