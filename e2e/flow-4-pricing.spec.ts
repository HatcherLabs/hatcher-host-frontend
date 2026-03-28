/**
 * Flow 4 — Pricing Page → Select Tier → Redirects to Stripe Checkout
 *
 * Verifies pricing page renders all tiers and that clicking upgrade
 * triggers a Stripe checkout redirect (or navigates to billing page).
 */

import { test, expect } from '@playwright/test';

test('pricing page renders all tiers', async ({ page }) => {
  await page.goto('/pricing');
  await page.waitForLoadState('networkidle', { timeout: 10_000 });

  // All three tier cards should be visible
  await expect(page.locator('text=Free').first()).toBeVisible();
  await expect(page.locator('text=Basic').first()).toBeVisible();
  await expect(page.locator('text=Pro').first()).toBeVisible();

  // Price values present
  await expect(page.locator('text=$9.99').first()).toBeVisible();
  await expect(page.locator('text=$19.99').first()).toBeVisible();
});

test('pricing page: clicking upgrade tier triggers checkout redirect', async ({ page }) => {
  await page.goto('/pricing');
  await page.waitForLoadState('networkidle', { timeout: 10_000 });

  // Intercept navigation to Stripe or billing
  const navigationPromise = page.waitForURL(
    (url) =>
      url.href.includes('checkout.stripe.com') ||
      url.href.includes('/dashboard/billing') ||
      url.href.includes('/login'), // unauthenticated users redirected to login
    { timeout: 15_000 }
  );

  // Click the Basic tier upgrade/subscribe button
  const upgradeBtn = page
    .locator('button:has-text("Get Basic"), button:has-text("Upgrade"), button:has-text("Subscribe"), a:has-text("Get Basic")')
    .first();
  await expect(upgradeBtn).toBeVisible({ timeout: 8_000 });
  await upgradeBtn.click();

  // Should redirect somewhere meaningful
  await navigationPromise;

  const currentUrl = page.url();
  const isValidRedirect =
    currentUrl.includes('checkout.stripe.com') ||
    currentUrl.includes('/dashboard/billing') ||
    currentUrl.includes('/login');

  expect(isValidRedirect).toBe(true);
});
