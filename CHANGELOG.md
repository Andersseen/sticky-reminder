# Changelog

All notable changes are documented here. Versions follow Semantic Versioning.

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

[0.2.0]: https://github.com/Andersseen/sticky-reminder/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Andersseen/sticky-reminder/releases/tag/v0.1.0

