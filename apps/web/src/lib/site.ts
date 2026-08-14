/** Repo-derived constants, so a link only ever has one definition. */
export const REPO_URL = 'https://github.com/Andersseen/sticky-reminder';
export const RELEASES_URL = `${REPO_URL}/releases`;
export const LATEST_RELEASE_URL = `${RELEASES_URL}/latest`;
export const ISSUES_URL = `${REPO_URL}/issues`;

export const SITE_NAME = 'Sticky Reminder';
export const SITE_DESCRIPTION =
  'A browser extension for reminders that actually reach you: one click to create, a native notification when the time comes, daily or weekly repeats, and every reminder stored on your own device.';

/**
 * Prefixes a path with the deployment base. GitHub Pages serves this site from
 * a sub-path, dev serves it from the root, so no internal link can be written
 * as a plain absolute path.
 */
export function url(path = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}
