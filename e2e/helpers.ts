/**
 * Shared E2E helpers — login, register, unique-email generation.
 *
 * Import these in any spec file to avoid duplicating auth flows.
 */

import { type Page, expect } from '@playwright/test';

/** Generate a unique email that won't collide across test runs */
export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}+${Date.now()}_${Math.random().toString(36).slice(2, 6)}@hatcher-test.local`;
}

/** Generate a unique username */
export function uniqueUsername(prefix = 'e2e'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Default test password */
export const TEST_PASSWORD = 'TestPass123!';

/**
 * Register a new user and return the credentials.
 * After this call the browser is on /dashboard (logged in).
 */
export async function registerUser(
  page: Page,
  opts?: { email?: string; username?: string; password?: string }
): Promise<{ email: string; username: string; password: string }> {
  const email = opts?.email ?? uniqueEmail();
  const username = opts?.username ?? uniqueUsername();
  const password = opts?.password ?? TEST_PASSWORD;

  await page.goto('/register');
  await expect(page.locator('h1, h2').first()).toBeVisible();

  await page.fill('input[type="email"]', email);
  await page.fill('input[placeholder*="username" i], input[name="username"]', username);

  const passwordInputs = page.locator('input[type="password"]');
  await passwordInputs.nth(0).fill(password);
  await passwordInputs.nth(1).fill(password);

  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|login)/, { timeout: 15_000 });

  // If redirected to login (email-verify flow), log in manually
  if (page.url().includes('/login')) {
    await loginAs(page, email, password);
  }

  await expect(page).toHaveURL(/\/dashboard/);
  return { email, username, password };
}

/**
 * Log in with an existing account.
 * After this call the browser is on /dashboard.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login');
  await expect(page.locator('h1, h2').first()).toBeVisible();

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/dashboard/);
}
