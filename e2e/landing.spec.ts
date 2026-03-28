/**
 * Flow 5 — Landing Page → All Sections Render → No Console Errors
 *
 * Verifies the homepage loads all key sections and has no JS console errors.
 * Runs in the public (unauthenticated) browser project.
 */

import { test, expect } from '@playwright/test';

test('landing page: all key sections render', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 15_000 });

  // Hero section
  await expect(page.locator('h1').first()).toBeVisible();

  // Navigation bar
  await expect(page.locator('nav, header').first()).toBeVisible();

  // Pricing / features mention on landing
  const hasPricingSection =
    (await page.locator('text=Free').count()) > 0 ||
    (await page.locator('a[href="/pricing"]').count()) > 0;
  expect(hasPricingSection).toBe(true);

  // CTA button (Get Started / Deploy / Launch)
  const ctaBtn = page.locator(
    'a:has-text("Get Started"), a:has-text("Deploy"), a:has-text("Launch"), button:has-text("Get Started")'
  ).first();
  await expect(ctaBtn).toBeVisible({ timeout: 8_000 });

  // Footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await expect(page.locator('footer').first()).toBeVisible({ timeout: 5_000 });

  // No JS errors
  expect(
    consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('fonts.googleapis') &&
        !e.includes('Failed to load resource')
    )
  ).toHaveLength(0);
});

test('landing page: key nav links are present', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 15_000 });

  // Pricing link in nav
  await expect(page.locator('a[href="/pricing"]').first()).toBeVisible();

  // Login / Sign up link
  const authLink = page
    .locator('a[href="/login"], a[href="/register"], a:has-text("Sign in"), a:has-text("Log in")')
    .first();
  await expect(authLink).toBeVisible();
});

test('landing page: page title is set', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/); // Any non-empty title
});
