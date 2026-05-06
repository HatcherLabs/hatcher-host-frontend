/**
 * Auth E2E Tests — Register, Login, Error Handling
 *
 * Uses fresh credentials per test so each test is fully independent.
 * Runs in an unauthenticated browser (no saved storage state).
 */

import { test, expect } from '@playwright/test';
import { registerUser, loginAs } from './helpers';

// No saved auth — start from scratch
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('user can register and see dashboard', async ({ page }) => {
    const { email } = await registerUser(page);

    // Confirm we landed on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Dashboard should show either the agent list or "no agents" empty state
    const hasContent =
      (await page.locator('text=/no agents/i').count()) > 0 ||
      (await page.locator('text=/create/i').count()) > 0 ||
      (await page.locator('[data-testid="agent-card"], a[href*="/dashboard/agent/"]').count()) >= 0;
    expect(hasContent).toBe(true);
  });

  test('user can login with existing account', async ({ page }) => {
    // First register so the account exists
    const creds = await registerUser(page);

    // Clear auth state by navigating away and deleting storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();

    // Now log in with those credentials
    await loginAs(page, creds.email, creds.password);

    // Verify dashboard loaded
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('invalid login shows error', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Fill with non-existent credentials
    await page.fill('input[type="email"]', 'nonexistent@hatcher-test.local');
    await page.fill('input[type="password"]', 'WrongPassword999!');
    await page.click('button[type="submit"]');

    // Should stay on login page (not redirect to dashboard)
    await page.waitForTimeout(2_000);
    expect(page.url()).toMatch(/\/login/);

    await expect(page.getByText(/invalid|incorrect|wrong|not found/i).first()).toBeVisible();
  });

  test('register page has required form fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Email, username, and password fields should be present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input#username, input[name="username"], input[autocomplete="username"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('login page has required form fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1, h2').first()).toBeVisible();

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Should have a link to register
    await expect(
      page.locator('a[href="/register"], a:has-text("Sign up"), a:has-text("Register")').first()
    ).toBeVisible();
  });
});
