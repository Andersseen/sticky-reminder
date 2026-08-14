import { fileURLToPath } from 'node:url';
import { type BrowserContext, chromium } from '@playwright/test';

const EXTENSION_PATH = fileURLToPath(new URL('../.output/chrome-mv3', import.meta.url));

export interface LoadedExtension {
  context: BrowserContext;
  extensionId: string;
}

/**
 * Launches Chromium with the unpacked build loaded.
 *
 * MV3 service workers only run in a persistent context with an unpacked build,
 * and only on the full Chromium channel — the default download is
 * headless-shell, which cannot load extensions at all.
 */
export async function loadExtension(): Promise<LoadedExtension> {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
  });

  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));

  return { context, extensionId: new URL(worker.url()).host };
}
