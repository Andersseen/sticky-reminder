/**
 * Where the site actually lives.
 *
 * This is imported by the Astro config, the site's own link helpers and the
 * extension manifest, because a published `homepage_url` that points somewhere
 * dead is worse than one that points at a plain URL: it ships to the stores and
 * cannot be corrected without a new review. Change it here and everything that
 * links to the site follows.
 *
 * Plain ESM with no dependencies on purpose — three different build tools load
 * this file, and only some of them can resolve TypeScript at config time.
 */

/** Origin serving the site. */
export const SITE_ORIGIN = 'https://andersseen.github.io';

/** Path the site is mounted at, with both slashes. GitHub Pages project sites live under /<repo>/. */
export const SITE_BASE = '/sticky-reminder/';

/** The address to give a human. */
export const SITE_URL = `${SITE_ORIGIN}${SITE_BASE}`;
