# Sticky Reminder

Monorepo for the **Sticky Reminder** browser extension and its marketing site.

## Structure

```
sticky-reminder/
├── apps/
│   ├── extension/   # Browser extension (WXT + Web Components + Lit)
│   └── web/         # Marketing site (Astro + Web Components)
├── packages/
│   ├── core/        # Pure TypeScript reminder logic
│   └── ui/          # App-specific Web Components (Lit)
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
`sr-reminder-item`). Two constraints are worth knowing:

- `@andersseen/layout` and `@andersseen/motion` are **global stylesheet** rules,
  so they work in page markup but not inside a Lit shadow root. Components style
  themselves from the design tokens instead.
- `@andersseen/web-components/tokens.css` must be loaded once per page; it is
  re-exported through `@sticky-reminder/ui/styles`.

## Getting started

```bash
pnpm install
pnpm build
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:e2e` | Run E2E tests (Playwright) |
| `pnpm clean` | Remove all build artifacts |

## Extension

```bash
cd apps/extension
pnpm dev     # Starts WXT dev server
pnpm build   # Build extension
pnpm zip     # Build zipped extension artifact
```

## Web

```bash
cd apps/web
pnpm dev     # Astro on localhost:4321
pnpm build
```

## Testing

- **Unit tests**: Vitest workspace across `packages/*` and `apps/*`. Run
  `pnpm build` first — the extension tests import `@sticky-reminder/core` from
  its build output.
- **E2E tests**: `pnpm test:e2e` starts the Astro site and drives it. The
  extension suite (`cd apps/extension && pnpm test:e2e`) loads the unpacked
  build into a real Chromium and exercises alarms, storage and notifications.
- **CI**: GitHub Actions runs lint, tests, build and e2e.
