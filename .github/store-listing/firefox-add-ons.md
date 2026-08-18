# Firefox Add-ons listing

## Listing

**Name:** Sticky Reminder

**Summary:**

> Private one-time, daily and weekly reminders with native browser notifications.

**Categories:** Alerts & Updates; Other

**Description:**

> Create reminders from the browser toolbar and receive a native notification when each one is due. Choose a one-time, daily or weekly schedule, add an optional note, and manage everything from a searchable options page. Export or restore a local JSON backup whenever you need one.
>
> All reminder data stays in local extension storage on your device. Sticky Reminder has no account, backend, analytics, advertising or tracking, and it does not request access to websites you visit.
>
> The source code is available under the MIT license.

**Homepage:** <https://sticky-reminder.pages.dev/>

**Support:** <https://github.com/Andersseen/sticky-reminder/issues>

**Privacy policy:** <https://sticky-reminder.pages.dev/privacy>

## Review notes

- The manifest declares
  `browser_specific_settings.gecko.data_collection_permissions.required` as
  `["none"]`.
- The extension makes no network requests and contains no remote code.
- Reminder title, note, time and state are stored only with
  `browser.storage.local`.
- Reproducible build instructions are in the source archive's
  `FIREFOX_REVIEW.md`.
- Submit `sticky-reminder-<version>-firefox.zip` as the add-on and
  `sticky-reminder-<version>-sources.zip` as the corresponding source code.
