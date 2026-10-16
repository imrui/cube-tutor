import { defineConfig, devices } from '@playwright/test';

// Software WebGL for headless Chromium; WebKit doesn't take these flags.
const chromiumLaunch = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: 2,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1365, height: 1000 }, launchOptions: chromiumLaunch } },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions: chromiumLaunch } },
    // WebKit, so iPhone-Safari-only regressions (such as late stylesheet application) show up in CI.
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
