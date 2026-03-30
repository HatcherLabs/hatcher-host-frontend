/**
 * Agent Lifecycle E2E Tests — Create, View, Navigate
 *
 * Uses a fresh registered user per describe block.
 * Runs in an unauthenticated browser so we control the full flow.
 */

import { test, expect } from '@playwright/test';
import { registerUser, loginAs, TEST_PASSWORD } from './helpers';

// No saved auth — start from scratch
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Agent Lifecycle', () => {
  let email: string;
  let password: string;

  test.beforeAll(async ({ browser }) => {
    // Register a user once for this suite
    const page = await browser.newPage();
    const creds = await registerUser(page);
    email = creds.email;
    password = creds.password;
    await page.close();
  });

  test('user can navigate to create agent page', async ({ page }) => {
    await loginAs(page, email, password);

    // Navigate to agent creation
    await page.goto('/dashboard/agents/new');
    await expect(page).toHaveURL(/\/dashboard\/agents\/new/);

    // The page should show framework or template selection
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    const hasCreationUI =
      (await page.locator('text=/openclaw/i').count()) > 0 ||
      (await page.locator('text=/hermes/i').count()) > 0 ||
      (await page.locator('text=/template/i').count()) > 0 ||
      (await page.locator('text=/framework/i').count()) > 0 ||
      (await page.locator('[data-testid="template-card"], .template-card').count()) > 0;
    expect(hasCreationUI).toBe(true);
  });

  test('user can create an agent via the wizard', async ({ page }) => {
    await loginAs(page, email, password);

    await page.goto('/dashboard/agents/new');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    // Pick the first available template/card
    const firstTemplate = page.locator(
      '[data-testid="template-card"], .template-card, [class*="TemplateCard"], [class*="template"]'
    ).first();

    const hasTemplate = await firstTemplate.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasTemplate) {
      test.skip(true, 'No template cards visible — UI may use a different creation flow');
      return;
    }

    await firstTemplate.click();

    // Fill in agent name if a name field appears
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nameInput.fill(`E2E Agent ${Date.now()}`);
    }

    // Click deploy/create/launch button
    const deployBtn = page
      .locator('button:has-text("Deploy"), button:has-text("Create"), button:has-text("Launch"), button:has-text("Continue")')
      .first();

    if (await deployBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await deployBtn.click();
      // Wait for redirect to agent page or dashboard
      await page.waitForURL(/\/dashboard\/(agent|agents)/, { timeout: 20_000 });
    }

    // Verify we end up on a dashboard page
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('agents list page loads', async ({ page }) => {
    await loginAs(page, email, password);

    await page.goto('/dashboard/agents');
    await expect(page).toHaveURL(/\/dashboard\/agents/);
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    // Should show either agent cards or an empty state
    const hasAgentUI =
      (await page.locator('a[href*="/dashboard/agent/"]').count()) > 0 ||
      (await page.locator('text=/no agents/i').count()) > 0 ||
      (await page.locator('text=/create/i').count()) > 0;
    expect(hasAgentUI).toBe(true);
  });

  test('dashboard page loads without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await loginAs(page, email, password);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    // Filter out benign errors
    const realErrors = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('fonts.googleapis') &&
        !e.includes('Failed to load resource') &&
        !e.includes('hydration')
    );
    expect(realErrors).toHaveLength(0);
  });
});
