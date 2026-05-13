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
const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:3001';

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

  // ── 3. Create a custom agent through the API ────────────────
  const createResponse = await page.request.post(`${API_BASE_URL}/agents`, {
    data: {
      name: AGENT_NAME,
      description: 'Created by the registration flow E2E test',
      framework: 'openclaw',
      template: 'custom',
      config: {
        model: 'deepseek/deepseek-v4-flash',
        provider: 'openrouter',
        skills: ['web_search'],
        systemPrompt: 'You are a concise test agent.',
      },
    },
  });
  expect(createResponse.status()).toBe(201);

  // ── 4. Verify agent appears somewhere in dashboard ───────────
  await page.goto('/dashboard/agents');
  await expect(page.getByText(AGENT_NAME)).toBeVisible({ timeout: 10_000 });
});
