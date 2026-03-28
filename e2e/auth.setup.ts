/**
 * Auth setup — runs once before all authenticated test suites.
 * Registers a test user (if not exists) and saves browser storage state
 * so individual tests don't need to log in repeatedly.
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth/user.json');

// Unique enough for a test run; real test DB should be wiped between CI runs
const TEST_EMAIL = `e2e+${Date.now()}@hatcher-test.local`;
const TEST_PASSWORD = 'TestPass123!';
const TEST_USERNAME = `e2e_${Date.now()}`;

setup('register and save auth state', async ({ page }) => {
  // ── Register ────────────────────────────────────────────────
  await page.goto('/register');
  await expect(page).toHaveTitle(/Hatcher|Register/i);

  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[placeholder*="username" i], input[name="username"]', TEST_USERNAME);

  // Password fields — fill both password + confirm
  const passwordInputs = page.locator('input[type="password"]');
  await passwordInputs.nth(0).fill(TEST_PASSWORD);
  await passwordInputs.nth(1).fill(TEST_PASSWORD);

  await page.click('button[type="submit"]');

  // After register should redirect to /dashboard or /login
  await page.waitForURL(/\/(dashboard|login)/, { timeout: 15_000 });

  // If redirected to login (email-verify style), log in manually
  if (page.url().includes('/login')) {
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  }

  // Persist the auth session (JWT stored in localStorage/cookie)
  await page.context().storageState({ path: AUTH_FILE });
});
