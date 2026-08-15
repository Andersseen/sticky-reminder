import { defineConfig } from 'astro/config';

// The site ships to two hosts that disagree about where it lives. GitHub Pages
// serves a project site from `/<repo>/`, so its workflow passes both variables
// explicitly. Cloudflare Pages builds straight from the repo and serves the
// root, handing over the deployment URL in CF_PAGES_URL — which is what gives
// every preview build, on its own throwaway hostname, correct absolute URLs
// without configuring anything. Setting SITE_URL in the Cloudflare dashboard
// overrides it, which is how the production deploy names its real domain.
// Anything else falls back to the root so links keep working locally.
const site =
  process.env.SITE_URL ?? process.env.CF_PAGES_URL ?? 'https://sticky-reminder.pages.dev';
const base = process.env.SITE_BASE ?? '/';

export default defineConfig({
  site,
  base,
  outDir: 'dist',
});
