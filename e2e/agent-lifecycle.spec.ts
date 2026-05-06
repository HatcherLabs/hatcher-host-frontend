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

  test('user can complete the current template wizard to launch review', async ({ page }) => {
    await loginAs(page, email, password);

    await page.goto('/create/template');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    await expect(page.getByRole('heading', { name: /what kind of agent/i })).toBeVisible();
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByRole('heading', { name: /what type of agent/i })).toBeVisible();
    await page.getByRole('button', { name: /custom agent/i }).click();

    await expect(page.getByRole('heading', { name: /personalize your agent/i })).toBeVisible();
    const agentName = `E2E Wizard ${Date.now()}`;
    await page.locator('#agent-name').fill(agentName);
    await page.locator('#agent-description').fill('Current wizard smoke test');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByRole('heading', { name: /ready to launch/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /launch your agent/i })).toBeVisible();
    await expect(page.getByText(agentName)).toBeVisible();
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
