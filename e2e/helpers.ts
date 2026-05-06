/**
 * Shared E2E helpers — login, register, unique-email generation.
 *
 * Import these in any spec file to avoid duplicating auth flows.
 */

import { type Page, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

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

function markEmailVerified(email: string): void {
  const databaseUrl = process.env.E2E_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('E2E_DATABASE_URL or DATABASE_URL is required to verify test accounts');
  }

  const quotedEmail = `'${email.replace(/'/g, "''")}'`;
  execFileSync(
    'psql',
    [
      databaseUrl,
      '-v',
      'ON_ERROR_STOP=1',
      '-q',
      '-c',
      `UPDATE users SET email_verified = true, email_verify_token = NULL WHERE email = ${quotedEmail};`,
    ],
    { stdio: 'pipe' },
  );
}

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
  await page.fill('input#username, input[name="username"], input[autocomplete="username"]', username);

  const passwordInputs = page.locator('input[type="password"]');
  await passwordInputs.nth(0).fill(password);
  await passwordInputs.nth(1).fill(password);

  await page.click('button[type="submit"]');
  await page.waitForURL(/\/verify-email/, { timeout: 15_000 });

  // Local E2E has no inbox. Exercise the UI registration flow, then flip
  // the verification bit directly so authenticated flows can continue.
  markEmailVerified(email);
  await loginAs(page, email, password);

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
  const submit = page.locator('button[type="submit"]').first();
  await expect(submit).toBeEnabled();
  try {
    await submit.click({ timeout: 5_000 });
  } catch (error) {
    if (!/\/dashboard/.test(page.url())) throw error;
  }

  if (!/\/dashboard/.test(page.url())) {
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  }
  await expect(page).toHaveURL(/\/dashboard/);
}
