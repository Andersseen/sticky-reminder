# Security

## Scope

Sticky Reminder runs entirely in your browser. It requests three permissions —
`alarms`, `notifications` and `storage` — holds reminders in local storage, and
makes no network requests. There is no server, no account and no telemetry, so
there is no backend to report a vulnerability in.

That leaves a small but real surface worth reporting:

- reminder text escaping into markup or script anywhere in the popup, the
  options page or the site
- a way for a web page to read or write reminders
- anything in the released ZIPs that is not built from this repository

## Reporting

Open a [private security advisory](https://github.com/Andersseen/sticky-reminder/security/advisories/new).
Please do not open a public issue for a vulnerability first.

Expect an acknowledgement within a few days. Fixes ship in the next release,
and the advisory is published once the release is out.

## Supported versions

The latest release is the supported one. There are no backports.
