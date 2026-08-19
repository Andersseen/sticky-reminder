import { countUnacknowledged } from '@sticky-reminder/core';
import { browser } from 'wxt/browser';
import { peekReminders } from './storage';

/** Same red the list uses for an overdue reminder. */
const BADGE_BACKGROUND = '#dc2626';
/** Two digits is all the toolbar renders legibly. */
const BADGE_CAP = 99;

interface BadgeApi {
  setBadgeText(details: { text: string }): Promise<void> | void;
  setBadgeBackgroundColor?(details: { color: string }): Promise<void> | void;
}

/** MV3 calls it `action`; the Firefox MV2 build still calls it `browserAction`. */
function badgeApi(): BadgeApi | null {
  const api = browser as unknown as { action?: BadgeApi; browserAction?: BadgeApi };
  return api.action ?? api.browserAction ?? null;
}

/**
 * The part of a reminder that survives the notification disappearing. A toast
 * is gone in seconds whether or not anyone was at the screen; a count on the
 * toolbar icon stays until the reminder is answered, which is what makes an
 * ignored notification recoverable rather than lost.
 */
export async function refreshBadge(): Promise<number> {
  const api = badgeApi();
  if (!api) return 0;

  // Deliberately the non-migrating read: this runs on every storage change,
  // and a read that writes would answer its own event forever.
  const count = countUnacknowledged(await peekReminders());
  await api.setBadgeText({ text: count > 0 ? String(Math.min(count, BADGE_CAP)) : '' });
  await api.setBadgeBackgroundColor?.({ color: BADGE_BACKGROUND });

  return count;
}
