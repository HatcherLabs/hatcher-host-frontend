/**
 * Auth setup — runs once before all authenticated test suites.
 * Registers a test user (if not exists) and saves browser storage state
 * so individual tests don't need to log in repeatedly.
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { registerUser } from './helpers';

const AUTH_FILE = path.join(__dirname, '.auth/user.json');

// Unique enough for a test run; real test DB should be wiped between CI runs
const TEST_EMAIL = `e2e+${Date.now()}@hatcher-test.local`;
const TEST_PASSWORD = 'TestPass123!';
const TEST_USERNAME = `e2e_${Date.now()}`;

setup('register and save auth state', async ({ page }) => {
  await page.goto('/register');
  await expect(page).toHaveTitle(/Hatcher|Register/i);
  await registerUser(page, {
    email: TEST_EMAIL,
    username: TEST_USERNAME,
    password: TEST_PASSWORD,
  });

  // Persist the auth session (JWT stored in localStorage/cookie)
  await page.context().storageState({ path: AUTH_FILE });
});
