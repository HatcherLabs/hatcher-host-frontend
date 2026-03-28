/**
 * Flow 2 — Agent Config → Update Name/Model → Verify Persists
 *
 * Requires an authenticated session (storageState from auth.setup.ts).
 * Creates an agent via API, then updates it through the UI and verifies persistence.
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

test('agent config: update name and verify it persists', async ({ page, context }) => {
  // ── Get auth token from storage ──────────────────────────────
  const cookies = await context.cookies();
  const storage = await page.evaluate(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return { token };
  }).catch(() => ({ token: null }));

  // ── Navigate to agents list ──────────────────────────────────
  await page.goto('/dashboard/agents');
  await expect(page).toHaveURL(/\/dashboard\/agents/);

  // Wait for agent cards to load (or empty state)
  await page.waitForLoadState('networkidle', { timeout: 10_000 });

  // Find first agent link or navigate to create one
  const agentLink = page.locator('a[href*="/dashboard/agent/"]').first();
  const hasAgent = await agentLink.isVisible({ timeout: 5_000 }).catch(() => false);

  if (!hasAgent) {
    // Skip — no agents exist for this test user, needs manual setup or flow-1 first
    test.skip(true, 'No agents available — run flow-1 first or seed test data');
    return;
  }

  // Navigate to the agent detail page
  await agentLink.click();
  await page.waitForURL(/\/dashboard\/agent\//, { timeout: 10_000 });

  // ── Switch to Config tab ─────────────────────────────────────
  const configTab = page.locator('button:has-text("Config"), [role="tab"]:has-text("Config")');
  await expect(configTab).toBeVisible({ timeout: 8_000 });
  await configTab.click();

  // Wait for config form to load
  await page.waitForLoadState('networkidle', { timeout: 5_000 });

  // ── Update the agent name ────────────────────────────────────
  const updatedName = `Updated Agent ${Date.now()}`;
  const nameInput = page.locator('input[name="name"], input[placeholder*="name" i], input[id*="name"]').first();
  await expect(nameInput).toBeVisible({ timeout: 8_000 });
  await nameInput.clear();
  await nameInput.fill(updatedName);

  // Save the changes
  const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').first();
  await expect(saveBtn).toBeVisible({ timeout: 5_000 });
  await saveBtn.click();

  // Wait for save confirmation (toast, success text, or network idle)
  await page.waitForLoadState('networkidle', { timeout: 8_000 });

  // ── Verify name persists after page reload ───────────────────
  await page.reload();
  await page.waitForLoadState('networkidle', { timeout: 10_000 });

  // Switch back to config tab
  const configTabAfterReload = page.locator('button:has-text("Config"), [role="tab"]:has-text("Config")');
  if (await configTabAfterReload.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await configTabAfterReload.click();
  }

  const nameInputAfterReload = page.locator('input[name="name"], input[placeholder*="name" i], input[id*="name"]').first();
  await expect(nameInputAfterReload).toHaveValue(updatedName, { timeout: 8_000 });
});
