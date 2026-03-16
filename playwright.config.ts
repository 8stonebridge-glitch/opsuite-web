import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global.setup.ts',
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4010',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'PLAYWRIGHT_TEST=1 NEXT_PUBLIC_PLAYWRIGHT_TEST=1 npx next dev --webpack --hostname localhost --port 4010',
    url: 'http://localhost:4010/sign-in',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
