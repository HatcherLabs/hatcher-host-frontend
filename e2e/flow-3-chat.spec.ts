/**
 * Flow 3 — Chat with Agent → Send Message → Receive Response
 *
 * Navigates to the chat tab of an existing agent and sends a test message.
 * Verifies the message appears in the chat history.
 */

import { test, expect } from '@playwright/test';

test('chat: send message and see it in chat history', async ({ page }) => {
  // ── Navigate to agents list ──────────────────────────────────
  await page.goto('/dashboard/agents');
  await page.waitForLoadState('networkidle', { timeout: 10_000 });

  // Find first agent
  const agentLink = page.locator('a[href*="/dashboard/agent/"]').first();
  const hasAgent = await agentLink.isVisible({ timeout: 5_000 }).catch(() => false);

  if (!hasAgent) {
    test.skip(true, 'No agents available — run flow-1 first or seed test data');
    return;
  }

  await agentLink.click();
  await page.waitForURL(/\/dashboard\/agent\//, { timeout: 10_000 });

  // ── Switch to Chat tab ───────────────────────────────────────
  const chatTab = page.locator('button:has-text("Chat"), [role="tab"]:has-text("Chat")');
  await expect(chatTab).toBeVisible({ timeout: 8_000 });
  await chatTab.click();

  await page.waitForLoadState('networkidle', { timeout: 5_000 });

  // ── Send a message ───────────────────────────────────────────
  const testMessage = 'Hello from E2E test';

  const chatInput = page.locator(
    'textarea[placeholder*="message" i], input[placeholder*="message" i], [data-testid="chat-input"]'
  ).first();
  await expect(chatInput).toBeVisible({ timeout: 10_000 });
  await chatInput.fill(testMessage);

  // Submit via Enter key or send button
  const sendBtn = page.locator(
    'button[type="submit"]:near(textarea), button:has-text("Send"), [data-testid="send-button"]'
  ).first();

  if (await sendBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await sendBtn.click();
  } else {
    await chatInput.press('Enter');
  }

  // ── Verify message appears in the chat ──────────────────────
  // The sent message should show up in the conversation list
  await expect(
    page.locator(`text="${testMessage}"`).first()
  ).toBeVisible({ timeout: 15_000 });
});
