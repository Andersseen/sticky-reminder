import {
  BELL,
  CHECK,
  CLOSE,
  COMPONENT_ICONS,
  EDIT,
  REFRESH_CW,
  TRASH,
  registerIcons,
} from '@andersseen/icon';

/**
 * Registers only the icons this app renders, plus the curated set the
 * Andersseen components reference internally (chevrons, close buttons…).
 * Registering all 86 would defeat tree-shaking.
 */
export function registerStickyIcons(): void {
  registerIcons({
    ...COMPONENT_ICONS,
    bell: BELL,
    check: CHECK,
    close: CLOSE,
    edit: EDIT,
    'refresh-cw': REFRESH_CW,
    trash: TRASH,
  });
}
