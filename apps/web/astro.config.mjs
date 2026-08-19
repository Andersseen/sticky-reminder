import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import { SITE_ORIGIN } from '../../site.config.mjs';

// The site ships to more than one host and they disagree about where it lives.
// GitHub Pages serves a project site from `/<repo>/`, so its workflow passes
// both variables explicitly. Cloudflare Pages, if it is ever set up again,
// builds straight from the repo and serves the root, handing over the
// deployment URL in CF_PAGES_URL — which is what gives every preview build, on
// its own throwaway hostname, correct absolute URLs without configuring
// anything. Setting SITE_URL overrides both. Anything else falls back to the
// address in site.config.mjs, which is the one that is actually live.
const site = process.env.SITE_URL ?? process.env.CF_PAGES_URL ?? SITE_ORIGIN;
// Left at the root unless a deploy says otherwise, so `pnpm dev` and the e2e
// suite keep serving from `/` rather than from the published sub-path.
const base = process.env.SITE_BASE ?? '/';

// One version number for the manifest, the release tag and the site's own
// badge. Read at build time rather than copied, because a second copy goes
// stale silently — the badge sat at v0.2.0 through the whole 0.3.0 release.
const extensionVersion = JSON.parse(
  readFileSync(new URL('../extension/package.json', import.meta.url), 'utf8'),
).version;

export default defineConfig({
  site,
  base,
  outDir: 'dist',
  vite: {
    define: {
      __EXTENSION_VERSION__: JSON.stringify(extensionVersion),
    },
  },
});
