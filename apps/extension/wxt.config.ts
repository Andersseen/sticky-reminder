import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Sticky Reminder',
    description: 'Create sticky reminders that notify you when the time comes.',
    version: '1.0.0',
    permissions: ['alarms', 'notifications', 'storage'],
  },
});
