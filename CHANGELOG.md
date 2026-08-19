# Changelog

All notable changes are documented here. Versions follow Semantic Versioning.

## [0.4.0] — 2026-08-19

### Added

- Reminders now track whether they were actually answered, not just fired. One
  that rings unanswered keeps a count on the toolbar badge, is re-shown if it
  timed out unseen (up to three times), and is presented again when the browser
  restarts.
- **Mark as done** and **Snooze 10 minutes** buttons on the notification itself,
  plus `requireInteraction` so Chromium keeps it on screen. Browsers that
  implement neither — Firefox — fall back to a plain notification automatically.
- A warning on the options page when the browser is blocking notifications
  outright, and an "Unanswered" counter beside the existing stats.
- `site.config.mjs`: one definition of the site's address, read by the Astro
  config, the site's link helpers and the extension manifest.

### Changed

- **Breaking behaviour:** a one-off reminder is no longer completed the moment
  its notification fires. It stays pending — and therefore overdue — until the
  user ticks it off or uses the notification's Done button. A notification
  nobody saw used to move itself to Done silently.
- Every published link now points at `https://andersseen.github.io/sticky-reminder/`.
  The previous address, `sticky-reminder.pages.dev`, had stopped resolving, which
  left the README, the store listings and the shipped `homepage_url` pointing at
  a dead domain.
- The repeat badge is neutral rather than rose, which in a list where rose means
  overdue made every repeating reminder read as an alert.
- The site's version badge is read from the extension's `package.json` at build
  time instead of being hand-copied; it had been stuck at v0.2.0.

### Fixed

- The sidebar's footer line no longer paints across the reminder list, and the
  bottom of the panel is no longer cut off below the viewport.
- The sidebar no longer clips its own content when dragged narrower than 320px.
- The hero's browser mock on the site laid its sidebar out as two side-by-side
  columns and cropped the result to a few characters per line.
- Reminder dates no longer truncate mid-year ("19 Aug 20…") in narrow columns.
- Reading reminders in response to a storage change no longer stamps the schema
  version as a side effect, which could strand a legacy record mid-migration.

## [0.3.0] — 2026-08-19

### Added

- Native browser sidebar experience for Chromium and Firefox builds.
- Notification diagnostics button in Options to verify browser/OS notifications.
- Manual Chromium launcher for local extension testing without loading unpacked
  builds by hand.
- Unit coverage script and CI coverage enforcement.

### Changed

- Shared reminder UI logic between popup and sidebar so both stay in sync.
- Public install page now documents Edge, sidebar usage and developer flow.
- Extension E2E now covers natural alarm notifications and diagnostic
  notifications.

## [0.2.0] — 2026-08-18

### Added

- Export and validated merge-import of local JSON backups.
- Public privacy policy and ready-to-submit Chrome Web Store and Firefox Add-ons
  listing material.
- Reproducible source archive, checksums and complete release verification.

### Changed

- Reminder storage now uses one key per record, preventing unrelated concurrent
  writes from overwriting each other.
- Existing `v0.1.0` storage migrates automatically on first load.
- Missed one-time reminders recover when the browser starts again, and orphaned
  reminder alarms are removed.
- Build and test dependencies were upgraded and the production audit is clean.

## [0.1.0] — 2026-08-17

- Initial browser extension with one-time, daily and weekly reminders, native
  notifications, popup capture and a searchable options page.

[0.3.0]: https://github.com/Andersseen/sticky-reminder/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Andersseen/sticky-reminder/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Andersseen/sticky-reminder/releases/tag/v0.1.0
