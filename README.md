<div align="center">

<img src=".github/assets/banner.png" alt="Sticky Reminder — reminders that actually reach you" width="100%">

<p>
  <a href="https://github.com/Andersseen/sticky-reminder/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Andersseen/sticky-reminder/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/Andersseen/sticky-reminder/actions/workflows/deploy-github-pages.yml"><img alt="GitHub Pages deploy" src="https://github.com/Andersseen/sticky-reminder/actions/workflows/deploy-github-pages.yml/badge.svg"></a>
  <a href="https://github.com/Andersseen/sticky-reminder/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/Andersseen/sticky-reminder?sort=semver&color=6366f1"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-6366f1"></a>
  <img alt="Manifest V3" src="https://img.shields.io/badge/manifest-v3-6366f1">
</p>

<p>
  <b><a href="https://sticky-reminder.pages.dev/">Website</a></b> ·
  <b><a href="https://sticky-reminder.pages.dev/download">Install</a></b> ·
  <b><a href="https://sticky-reminder.pages.dev/privacy">Privacy</a></b> ·
  <b><a href="https://github.com/Andersseen/sticky-reminder/releases/latest">Releases</a></b> ·
  <b><a href="CONTRIBUTING.md">Contributing</a></b>
</p>

</div>

**Sticky Reminder** is a browser extension for reminders that reach you: write one in
a click, get a native notification when it is due, and repeat it daily or weekly if
it should come back. Every reminder is stored on your own device — no account, no
server, no network requests at all.

The repo is a pnpm + Turborepo monorepo holding the extension, its website, and the
two packages both are built from.

---

## Screenshots

<table>
<tr>
<td width="50%"><img src=".github/assets/popup-light.png" alt="The popup in light mode: a new-reminder form above a list of upcoming reminders"></td>
<td width="50%"><img src=".github/assets/popup-dark.png" alt="The same popup in dark mode"></td>
</tr>
<tr>
<td colspan="2"><img src=".github/assets/options-dark.png" alt="The options page: counters for total, upcoming, overdue and done, a filter bar, a search field and the full reminder list"></td>
</tr>
</table>

## What it does

| | |
|---|---|
| **One-click capture** | The popup opens on the form. Title, optional note, a time — or a shortcut: in an hour, this evening, tomorrow at nine. |
| **Native notifications** | Reminders fire through the browser's own notification system, so they arrive whether or not the tab that created them still exists. |
| **Daily and weekly repeats** | A repeating reminder rolls forward the moment it fires, and skips the periods it slept through instead of firing a backlog. |
| **Overdue at a glance** | Late reminders turn red and say how late. Search, filter and counters live on the options page. |
| **Local only** | `alarms`, `notifications` and `storage`. No host permissions, so the extension cannot read a single page you visit. |

## Install

Grab the build for your browser from the [latest release](https://github.com/Andersseen/sticky-reminder/releases/latest):

- **Chrome / Edge / Brave / Arc** — unzip `sticky-reminder-*-chrome.zip`, open `chrome://extensions`, turn on Developer mode, then **Load unpacked**.
- **Firefox** — open `about:debugging#/runtime/this-firefox` and **Load Temporary Add-on** with `sticky-reminder-*-firefox.zip`.

The [download page](https://sticky-reminder.pages.dev/download) walks
through both. Releases also include the source archive required for Firefox
review and SHA-256 checksums for every download.

## Repository layout

```
sticky-reminder/
├── apps/
│   ├── extension/   # The extension — WXT, popup, options page, background worker
│   └── web/         # The site — Astro, deployed to Cloudflare Pages and GitHub Pages
└── packages/
    ├── core/        # Reminder logic: pure TypeScript, no browser APIs
    └── ui/          # The two app-specific Web Components (Lit) + shared stylesheet
```

The split is enforced by one rule in each direction: `packages/core` never touches
a browser API — scheduling maths is unit-tested without a browser — and anything
that does touch `browser.alarms` or `browser.storage` lives in
`apps/extension/utils`.

```mermaid
flowchart LR
  P["Popup<br/>create · edit · filter"] --> S[("browser.storage.local")]
  O["Options page<br/>search · stats"] --> S
  P --> A[["browser.alarms"]]
  A -- fires --> B["Background worker"]
  B --> N(["Notification"])
  B -- "advanceReminder()" --> S
  B --> A
  C{{"@sticky-reminder/core"}} -.-> P
  C -.-> O
  C -.-> B
```

## Getting started

```bash
pnpm install
pnpm build          # the extension tests import core from its build output
pnpm dev            # extension (WXT) + site (Astro) dev servers
```

| Script | What it does |
|--------|--------------|
| `pnpm dev` | Start every dev server |
| `pnpm build` | Build every workspace |
| `pnpm lint` | Typecheck and lint with Biome |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | Site E2E (Playwright) |
| `pnpm store:assets` | Rebuild the exact-size store screenshots and promo tile from the extension |
| `pnpm clean` | Remove build artifacts |

Extension-only:

```bash
cd apps/extension
pnpm dev             # WXT dev server with hot reload
pnpm zip             # sticky-reminder-<version>-chrome.zip in .output/
pnpm zip:firefox     # the Firefox build
pnpm test:e2e        # loads the unpacked build into a real Chromium
```

## Design system

The UI is built on the Andersseen packages rather than hand-rolled primitives:

| Package | Role |
|---------|------|
| `@andersseen/web-components` | `and-button`, `and-input`, `and-select`, `and-card`, `and-badge`, `and-icon`… |
| `@andersseen/layout` | Attribute-driven layout: `and-layout="vertical gap:md"` |
| `@andersseen/icon` | Tree-shaken icon registry — see `registerStickyIcons()` |
| `@andersseen/motion` | `and-motion="fade-in"`, scanned by `MotionController` |

`packages/ui` holds only what is specific to this app (`sr-reminder-form`,
`sr-reminder-item`, `sr-empty-state`). Four constraints are worth knowing before
touching the UI:

- **Shadow roots are the boundary.** `@andersseen/layout` and `@andersseen/motion`
  are global stylesheet rules, so they work in page markup but not inside a Lit
  shadow root. Components style themselves from the design tokens instead.
- **Some components style their own host.** `and-card` renders as
  `rounded-lg border bg-card p-4` on the custom element itself, and a component
  cannot style its own host that way — those classes come from
  `@andersseen/web-components/elements.css`. Without it, cards render as bare,
  unpadded blocks. It is imported once, by `@sticky-reminder/ui/styles`, together
  with `tokens.css`.
- **The same applies one level down.** A library component used *inside* another
  component's shadow root (`and-badge` inside `sr-reminder-item`) is out of reach
  of that stylesheet too, and is restyled from the tokens in the component itself.
- **Motion is for static chrome.** `and-motion` reveals are scroll-triggered, so a
  list row rendered below the fold would sit at opacity 0 until something scrolled
  it into view. Lists render without it.

## Testing

- **Unit** — Vitest across `packages/*` and `apps/*`. Run `pnpm build` first: the
  extension tests import `@sticky-reminder/core` from its build output.
- **E2E** — `pnpm test:e2e` starts the Astro site and drives it. The extension
  suite (`cd apps/extension && pnpm test:e2e`) loads the unpacked build into a
  real Chromium and exercises alarms, storage and notifications.

## Automation

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| [`ci.yml`](.github/workflows/ci.yml) | push and PR to `main` | Lint, unit tests, both browser builds, then both E2E suites |
| [`deploy-github-pages.yml`](.github/workflows/deploy-github-pages.yml) | push to `main` touching the site | Builds the site with the `/sticky-reminder/` base path and publishes it to GitHub Pages |
| [`release.yml`](.github/workflows/release.yml) | a `v*` tag | Audits, lints, tests and zips both browser builds, then publishes them with Firefox review sources and checksums |

Cloudflare Pages is not in that table on purpose: it watches the repository
itself and builds without going through Actions.

### Deploying the site

The site goes out to two hosts from the same source, differing only in where they
serve it from: Cloudflare Pages serves the root of its own hostname, GitHub Pages
serves a project sub-path. `SITE_URL` and `SITE_BASE` carry that difference into
the Astro build, so no internal link may be written as a plain absolute path —
`url()` in [`src/lib/site.ts`](apps/web/src/lib/site.ts) prefixes them.

**Cloudflare Pages** is connected through the dashboard (Workers & Pages →
Create → Pages → Connect to Git). It needs no GitHub secrets, and it builds every
branch, so pull requests get a preview URL for free. The settings:

| Field | Value |
|-------|-------|
| Root directory | *(repository root)* |
| Build command | `pnpm build --filter=@sticky-reminder/web` |
| Build output directory | `apps/web/dist` |

Nothing else is required. `pnpm` comes from the `packageManager` field, Node from
[`.node-version`](.node-version), and the deployment origin from Cloudflare's own
`CF_PAGES_URL` — which is per-deployment, so previews get correct absolute URLs
on their throwaway hostnames without any configuration. Two variables are worth
setting once the site is real:

| Variable | Scope | What it changes |
|----------|-------|-----------------|
| `SITE_URL` | Production only | Overrides `CF_PAGES_URL` with the real domain. Leave it off Preview, or every preview will claim to be production |

`https://sticky-reminder.pages.dev` is the site's published address, so it is the
one that gets indexed: the GitHub Pages build points `<link rel="canonical">`
there rather than at itself. Should that ever flip, the `SITE_CANONICAL`
repository variable overrides it without touching the workflow.

[`apps/web/public/_headers`](apps/web/public/_headers) adds caching and security
headers on top, which only Cloudflare acts on.

### Cutting a release

Bump only `apps/extension/package.json`: WXT uses it for both manifests and the
archive names, and the release workflow rejects a tag that disagrees with it.
Then tag the exact commit and push that tag:

```bash
git tag v0.1.1 && git push origin v0.1.1
```

## License

[MIT](LICENSE) © Andersseen
