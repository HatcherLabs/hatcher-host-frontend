/**
 * Navigation E2E Tests — Verify key public pages load correctly.
 *
 * These tests run in an unauthenticated browser and check that
 * major marketing/info pages render their expected content.
 */

import { test, expect } from '@playwright/test';

// No auth needed for public pages
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Public Page Navigation', () => {
  test('landing page loads with hero section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    // Hero heading
    await expect(page.locator('h1').first()).toBeVisible();

    // Nav bar
    await expect(page.locator('nav, header').first()).toBeVisible();

    // CTA button
    const ctaBtn = page.locator(
      'a:has-text("Get Started"), a:has-text("Deploy"), button:has-text("Get Started")'
    ).first();
    await expect(ctaBtn).toBeVisible({ timeout: 8_000 });
  });

  test('pricing page shows all 4 tiers', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    await expect(page.locator('text=Free').first()).toBeVisible();
    await expect(page.locator('text=Starter').first()).toBeVisible();
    await expect(page.locator('text=Pro').first()).toBeVisible();
    await expect(page.locator('text=Business').first()).toBeVisible();

    // Price values
    await expect(page.locator('text=$9.99').first()).toBeVisible();
    await expect(page.locator('text=$19.99').first()).toBeVisible();
  });

  test('templates page loads with search', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    await expect(page.locator('text=Agent Templates').first()).toBeVisible();

    // Search input should be present
    const searchInput = page.locator(
      'input[placeholder*="search" i], input[type="search"], [data-testid="search"]'
    ).first();
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
  });

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    await expect(page.locator('text=Terms of Service').first()).toBeVisible();
  });

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    await expect(page.locator('text=Privacy Policy').first()).toBeVisible();
  });

  test('help page loads', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    await expect(page.locator('text=Help Center').first()).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('frameworks page loads', async ({ page }) => {
    await page.goto('/frameworks');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    // Should mention at least one framework
    const hasFramework =
      (await page.locator('text=/openclaw/i').count()) > 0 ||
      (await page.locator('text=/hermes/i').count()) > 0 ||
      (await page.locator('text=/elizaos/i').count()) > 0 ||
      (await page.locator('text=/milady/i').count()) > 0;
    expect(hasFramework).toBe(true);
  });

  test('status page loads', async ({ page }) => {
    await page.goto('/status');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});
