# Contributing

Thanks for looking. Issues, fixes and reviews are all welcome.

## Getting set up

```bash
pnpm install
pnpm build          # the extension tests import core from its build output
pnpm dev            # extension (WXT) and site (Astro) dev servers
```

Node 20+ and pnpm 10 are required — the exact pnpm version is pinned in
`package.json` under `packageManager`.

## The layout

| Path | What lives there |
|------|------------------|
| `apps/extension` | The browser extension: popup, options page, background worker |
| `apps/web` | The site published to Cloudflare Pages and GitHub Pages |
| `packages/core` | Reminder logic — pure TypeScript, no browser APIs |
| `packages/ui` | The two app-specific Web Components and the shared stylesheet |

Two rules keep that split honest:

- **`packages/core` never imports a browser API.** Scheduling maths belongs
  there and is unit-tested without a browser; anything touching
  `browser.alarms` or `browser.storage` belongs in `apps/extension/utils`.
- **`packages/ui` holds only what is specific to this app.** Buttons, inputs,
  cards and icons come from the Andersseen packages.

## Before you open a PR

```bash
pnpm lint
pnpm test
pnpm test:e2e                          # the site
cd apps/extension && pnpm test:e2e     # the real extension in Chromium
```

Formatting is Biome, run through a pre-commit hook, so a stray format is not
something you need to fix by hand.

For anything visible, attach a before/after screenshot — light and dark, since
the design tokens ship both.

## Working with the design system

The UI is built on `@andersseen/web-components`. Three constraints come up
often enough to be worth knowing before you start:

- `@andersseen/layout` and `@andersseen/motion` are global stylesheet rules, so
  they work in page markup but **not** inside a shadow root. Components style
  themselves from the tokens instead.
- Several components put utility classes on their own host element. Those
  classes come from `@andersseen/web-components/elements.css`, which is
  imported once by `@sticky-reminder/ui/styles` — and, like every page-level
  sheet, it does not cross a shadow boundary. A component used inside another
  component's shadow root has to be styled from that root.
- Scroll-triggered `and-motion` reveals belong on static page chrome, not on
  list rows. A row rendered below the fold would sit at opacity 0 until
  something scrolled it into view.

## Commits

Conventional commits (`feat:`, `fix:`, `chore:`…). One logical change per PR
keeps review quick.
