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
│   └── ui/          # Web Components shared library
```

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

- **Unit tests**: Vitest workspace across `packages/*` and `apps/*`.
- **E2E tests**: Playwright against the web site and extension pages.
- **CI**: GitHub Actions runs lint, tests, build and e2e.
