# Firefox review build

The submitted extension is generated from this source archive. It has no
runtime network requests, telemetry, remote code or environment variables.

## Requirements

- Node.js 22.12 or newer
- pnpm 10.30.1

## Reproduce the submitted ZIP

From the extracted source archive:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm build --filter=@sticky-reminder/extension
pnpm --dir apps/extension zip:firefox
```

The installable archive is written to:

```text
apps/extension/.output/sticky-reminder-<version>-firefox.zip
```

The build uses WXT and Vite. `packages/core` and `packages/ui` are local pnpm
workspace dependencies and are included in this source archive.
