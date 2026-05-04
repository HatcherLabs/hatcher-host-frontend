/**
 * Flow 1 — Registration → Login → Create Agent → See Agent in Dashboard
 *
 * This test re-exercises the full new-user journey end-to-end.
 * It uses a fresh unique email so it never collides with the setup user.
 */

import { test, expect } from '@playwright/test';

// Override storage state for this file — we want an unauthenticated browser
test.use({ storageState: { cookies: [], origins: [] } });

const EMAIL = `flow1+${Date.now()}@hatcher-test.local`;
const PASSWORD = 'TestPass123!';
const USERNAME = `flow1_${Date.now()}`;
const AGENT_NAME = `E2E Agent ${Date.now()}`;

test('register → login → create agent → agent appears in dashboard', async ({ page }) => {
  // ── 1. Register ─────────────────────────────────────────────
  await page.goto('/register');
  await expect(page.locator('h1, h2').first()).toBeVisible();

  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[placeholder*="username" i], input[name="username"]', USERNAME);

  const passwordInputs = page.locator('input[type="password"]');
  await passwordInputs.nth(0).fill(PASSWORD);
  await passwordInputs.nth(1).fill(PASSWORD);

  await page.click('button[type="submit"]');

  // Should end up on dashboard or login
  await page.waitForURL(/\/(dashboard|login)/, { timeout: 15_000 });

  // ── 2. Login (if register didn't auto-login) ─────────────────
  if (page.url().includes('/login')) {
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  }

  // Confirm dashboard loaded
  await expect(page).toHaveURL(/\/dashboard/);

  // ── 3. Navigate to "Create Agent" ───────────────────────────
  await page.goto('/create/template');
  await expect(page).toHaveURL(/\/create\/template/);

  // Template selection page — pick the first available template
  const firstTemplate = page.locator('[data-testid="template-card"], .template-card, [class*="TemplateCard"]').first();
  // If there's a grid of cards, click the first one
  await firstTemplate.click({ timeout: 10_000 });

  // Fill in agent name if there's a name field on the creation form
  const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
  if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await nameInput.fill(AGENT_NAME);
  }

  // Submit / deploy button
  const deployBtn = page.locator('button:has-text("Deploy"), button:has-text("Create"), button:has-text("Launch")').first();
  if (await deployBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await deployBtn.click();
    // Wait for redirect to agent page or dashboard
    await page.waitForURL(/\/dashboard\/(agent|agents)/, { timeout: 20_000 });
  }

  // ── 4. Verify agent appears somewhere in dashboard ───────────
  await page.goto('/dashboard/agents');
  // The agents list page should show at least one agent card
  await expect(page.locator('[data-testid="agent-card"], [class*="agent-card"], [class*="AgentCard"]').first())
    .toBeVisible({ timeout: 10_000 });
});
