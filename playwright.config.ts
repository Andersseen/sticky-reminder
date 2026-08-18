import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  // Without this the suite hits a dead port: nothing else starts the site.
  webServer: {
    command: 'pnpm --filter @sticky-reminder/web dev',
    // Astro 7 auto-detects coding agents and otherwise detaches its dev server,
    // which makes Playwright think the foreground process exited prematurely.
    env: { ASTRO_DEV_BACKGROUND: '0' },
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
