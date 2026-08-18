import { defineConfig } from 'wxt';

export default defineConfig({
  // Without this the archive is named after the package (@sticky-reminder/
  // extension collapses to "sticky-reminderextension"), which is what the
  // release then publishes.
  zip: {
    name: 'sticky-reminder',
    // release.yml creates the review archive from the exact Git commit. WXT's
    // default starts here and would omit the two workspace packages it bundles.
    zipSources: false,
  },
  manifest: {
    name: 'Sticky Reminder',
    short_name: 'Sticky',
    description:
      'Create reminders in one click and let your browser notify you — daily, weekly or once. Everything stays on your device.',
    // `version` is deliberately absent: WXT falls back to this package's
    // `package.json`, which keeps one number for the manifest, the zip
    // filenames and the release tag. Bump it there and nowhere else — a second
    // copy here silently wins and ships a build whose version contradicts the
    // tag it was released under.
    homepage_url: 'https://sticky-reminder.pages.dev/',
    permissions: ['alarms', 'notifications', 'storage'],
    action: {
      default_title: 'Sticky Reminder — new reminder',
    },
    // Firefox refuses to install an unsigned build without an add-on id; the
    // key is ignored by the Chromium build. The id is an identity, never a URL
    // that gets fetched, and Firefox treats a change to it as a different
    // add-on — so it deliberately names nothing that can move, hosting least of
    // all. Changing it after a release strands everyone who already installed.
    browser_specific_settings: {
      gecko: {
        id: 'sticky-reminder@andersseen',
        strict_min_version: '109.0',
        // Firefox requires every new AMO submission to declare transmitted
        // data. Reminder content never leaves the local browser.
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  },
});
