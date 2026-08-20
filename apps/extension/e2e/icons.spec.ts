import { type BrowserContext, expect, test } from '@playwright/test';
import { loadExtension } from './extension';

/**
 * `and-icon` reads the global icon registry once, when it upgrades, and never
 * looks again — a name missing at that instant renders as an empty box for the
 * life of the page. Registration therefore has to win a race against the
 * component definitions, and which side wins is decided by how Vite chunks the
 * entrypoints: popup.html and sidepanel.html get two entry scripts, and a
 * `registerStickyIcons()` call made from page code ran in the second one, one
 * script tag after every `and-*` element had already rendered. Both pages
 * shipped with every icon blank, the toolbar's two icon-only buttons included.
 *
 * Asserted end to end rather than in a unit test because the bug lives entirely
 * in the built output's module order; the source read correctly.
 */

let context: BrowserContext;
let extensionId: string;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  test.setTimeout(120_000);
  ({ context, extensionId } = await loadExtension());
});

test.afterAll(async () => {
  await context?.close();
});

interface RenderedIcon {
  name: string | null;
  rendered: boolean;
}

/** Every `and-icon` on the page, shadow roots included, and whether it drew. */
const COLLECT_ICONS = `(() => {
  const icons = [];
  const walk = (root) => {
    for (const element of root.querySelectorAll('*')) {
      if (element.localName === 'and-icon') {
        icons.push({
          name: element.getAttribute('name'),
          rendered: Boolean(element.shadowRoot?.querySelector('svg')),
        });
      }
      if (element.shadowRoot) walk(element.shadowRoot);
    }
  };
  walk(document);
  return icons;
})()`;

for (const page of ['popup', 'sidepanel', 'options'] as const) {
  test(`every icon on ${page}.html renders`, async () => {
    const tab = await context.newPage();

    // The registry warns once per missing name, which catches icons inside a
    // component that has not rendered yet and so escapes the DOM sweep.
    const missing: string[] = [];
    tab.on('console', (message) => {
      if (message.text().includes('is not registered')) missing.push(message.text());
    });

    await tab.goto(`chrome-extension://${extensionId}/${page}.html`);
    await expect(tab.locator('.sr-topbar')).toBeVisible();

    const icons: RenderedIcon[] = await tab.evaluate(COLLECT_ICONS);
    expect(icons.length).toBeGreaterThan(0);
    expect(icons.filter((icon) => !icon.rendered)).toEqual([]);
    expect(missing).toEqual([]);

    await tab.close();
  });
}

test('the popup toolbar buttons draw their icons', async () => {
  const tab = await context.newPage();
  await tab.goto(`chrome-extension://${extensionId}/popup.html`);

  // Sized rather than merely present: an unregistered icon still leaves an
  // `and-icon` element in the DOM, just an empty one, which is exactly how the
  // two icon-only buttons came out looking blank.
  for (const id of ['open-sidebar', 'open-options']) {
    const box = await tab.locator(`#${id} and-icon svg`).boundingBox();
    expect(box?.width, `${id} has no drawn icon`).toBeGreaterThan(0);
  }

  await tab.close();
});
