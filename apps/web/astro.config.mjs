import { defineConfig } from 'astro/config';

// GitHub Pages serves a project site from `/<repo>/`, while dev and the E2E run
// serve it from the root. The deploy workflow sets both variables; anything
// else falls back to the root so internal links keep working locally.
const site = process.env.SITE_URL ?? 'https://andersseen.github.io';
const base = process.env.SITE_BASE ?? '/';

export default defineConfig({
  site,
  base,
  outDir: 'dist',
});
