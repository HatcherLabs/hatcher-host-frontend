import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for Hatcher frontend.
 * Runs against the local dev server (or a running Next.js instance).
 *
 * To run: npx playwright test
 * To run with UI: npx playwright test --ui
 */

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // sequential to avoid shared-state issues in test DB
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10_000,
  },

  projects: [
    // Setup project: creates authenticated state once, reused by other tests
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Reuse saved auth state for tests that need it
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.spec\.ts/,
      // Exclude tests that manage their own auth or are fully public
      testIgnore: /.*\/(landing|navigation|auth|agent-lifecycle|i18n)\.spec\.ts/,
    },
    {
      name: 'chromium-public',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\/(landing|navigation|auth|agent-lifecycle|i18n)\.spec\.ts/,
    },
  ],

  // Auto-start Next.js dev server when running locally
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
