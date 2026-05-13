/**
 * Agent Lifecycle E2E Tests — Create, View, Navigate
 *
 * Uses a fresh registered user per describe block.
 * Runs in an unauthenticated browser so we control the full flow.
 */

import { test, expect, type Page } from '@playwright/test';
import { registerUser, loginAs, TEST_PASSWORD } from './helpers';

// No saved auth — start from scratch
test.use({ storageState: { cookies: [], origins: [] } });

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:3001';

async function createPausedAgent(page: Page, name: string): Promise<string> {
  const response = await page.request.post(`${API_BASE_URL}/agents`, {
    data: {
      name,
      description: 'Created by the agent lifecycle E2E test',
      framework: 'openclaw',
      template: 'custom',
      config: {
        model: 'deepseek/deepseek-v4-flash',
        provider: 'openrouter',
        skills: ['web_search', 'calculator'],
        systemPrompt: 'You are a concise test agent.',
      },
    },
  });

  expect(response.status()).toBe(201);
  const body = (await response.json()) as {
    success: boolean;
    data?: { id?: string };
    error?: string;
  };
  expect(body, body.error).toMatchObject({ success: true });
  expect(body.data?.id).toBeTruthy();
  return body.data!.id!;
}

async function deleteAgent(page: Page, agentId: string): Promise<void> {
  const response = await page.request.delete(`${API_BASE_URL}/agents/${agentId}`);
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { success: boolean; error?: string };
  expect(body, body.error).toMatchObject({ success: true });
}

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
    await page.goto('/create');
    await expect(page).toHaveURL(/\/create/);

    // The page should show Chat-to-Hatch
    await page.waitForLoadState('networkidle', { timeout: 10_000 });
    await expect(page.getByText(/Hatcher Assistant/i)).toBeVisible();
    await expect(page.locator('textarea').first()).toBeVisible();
  });

  test('legacy template route redirects to Chat-to-Hatch', async ({ page }) => {
    await loginAs(page, email, password);

    await page.goto('/create/template');
    await expect(page).toHaveURL(/\/chat-to-hatch/);
    await expect(page.getByText(/Hatcher Assistant/i)).toBeVisible();
  });

  test('user can create and delete a custom agent through the backend', async ({ page }) => {
    await loginAs(page, email, password);

    const agentName = `E2E API Agent ${Date.now()}`;
    let agentId: string | null = null;

    try {
      agentId = await createPausedAgent(page, agentName);

      await page.goto('/dashboard/agents');
      await expect(page).toHaveURL(/\/dashboard\/agents/);
      await expect(page.getByText(agentName)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/paused/i).first()).toBeVisible();
    } finally {
      if (agentId) {
        await deleteAgent(page, agentId);
      }
    }
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
