/** Repo-derived constants, so a link only ever has one definition. */
export { SITE_URL } from '../../../../site.config.mjs';

export const REPO_URL = 'https://github.com/Andersseen/sticky-reminder';

/** Injected by astro.config.mjs from the extension's package.json. */
export const EXTENSION_VERSION: string = __EXTENSION_VERSION__;
export const RELEASES_URL = `${REPO_URL}/releases`;
export const LATEST_RELEASE_URL = `${RELEASES_URL}/latest`;
export const ISSUES_URL = `${REPO_URL}/issues`;

export const SITE_NAME = 'Sticky Reminder';
export const SITE_DESCRIPTION =
  'A browser extension for reminders that actually reach you: one click to create, a native notification when the time comes, daily or weekly repeats, and every reminder stored on your own device.';

export const CHROME_STORE_URL = import.meta.env.PUBLIC_CHROME_STORE_URL?.trim() || null;
export const FIREFOX_STORE_URL = import.meta.env.PUBLIC_FIREFOX_STORE_URL?.trim() || null;
export const EDGE_STORE_URL = import.meta.env.PUBLIC_EDGE_STORE_URL?.trim() || null;

/**
 * Prefixes a path with the deployment base. GitHub Pages serves this site from
 * a sub-path, while Cloudflare Pages and dev serve it from the root, so no
 * internal link can be written as a plain absolute path.
 */
export function url(path = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}
