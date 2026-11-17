import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const CACHED_CHROME =
  '/home/mahou-dev/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const executablePath = existsSync(CACHED_CHROME) ? CACHED_CHROME : undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4299',
    trace: 'on-first-retry',
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    command: 'npx ng serve --host 127.0.0.1 --port 4299',
    url: 'http://127.0.0.1:4299',
    reuseExistingServer: !process.env['CI'],
    timeout: 120000,
  },
});
