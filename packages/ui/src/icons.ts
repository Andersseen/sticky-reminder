import {
  ARROW_RIGHT,
  BELL,
  CHECK,
  CLOSE,
  CODE,
  COMPONENT_ICONS,
  DOWNLOAD,
  EDIT,
  EXTERNAL_LINK,
  GITHUB,
  LIST,
  LOCK,
  MOON,
  REFRESH_CW,
  SEARCH,
  SETTINGS,
  STAR,
  SUN,
  TRASH,
  ZAP,
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
    'arrow-right': ARROW_RIGHT,
    bell: BELL,
    check: CHECK,
    close: CLOSE,
    code: CODE,
    download: DOWNLOAD,
    edit: EDIT,
    'external-link': EXTERNAL_LINK,
    github: GITHUB,
    list: LIST,
    lock: LOCK,
    moon: MOON,
    'refresh-cw': REFRESH_CW,
    search: SEARCH,
    settings: SETTINGS,
    star: STAR,
    sun: SUN,
    trash: TRASH,
    zap: ZAP,
  });
}
