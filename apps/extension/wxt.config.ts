import { defineConfig } from 'wxt';

export default defineConfig({
  // Without this the archive is named after the package (@sticky-reminder/
  // extension collapses to "sticky-reminderextension"), which is what the
  // release then publishes.
  zip: {
    name: 'sticky-reminder',
  },
  manifest: {
    name: 'Sticky Reminder',
    short_name: 'Sticky',
    description:
      'Create reminders in one click and let your browser notify you — daily, weekly or once. Everything stays on your device.',
    version: '0.1.0',
    homepage_url: 'https://andersseen.github.io/sticky-reminder/',
    permissions: ['alarms', 'notifications', 'storage'],
    action: {
      default_title: 'Sticky Reminder — new reminder',
    },
    // Firefox refuses to install an unsigned build without an add-on id; the
    // key is ignored by the Chromium build.
    browser_specific_settings: {
      gecko: {
        id: 'sticky-reminder@andersseen.github.io',
        strict_min_version: '109.0',
      },
    },
  },
});
