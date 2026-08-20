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

// Registering has to be a side effect of *importing*, not something a page does
// on its own line, and this module has to be imported before the `and-*`
// definitions it feeds.
//
// `and-icon` reads the registry exactly once, in `componentWillLoad`, and never
// looks again: a name that is missing at that moment renders as an empty box
// forever. Defining the element upgrades every `<and-icon>` already parsed into
// the page, so the registry has to be full before the definition runs — and
// "before" here means the module graph, not the source line. Vite gives
// popup.html and sidepanel.html two entry scripts, the shared chunk that
// defines the components and then the page's own chunk, so a call made from
// page code lands one script tag too late and every icon on those two pages
// came out blank.
registerStickyIcons();
