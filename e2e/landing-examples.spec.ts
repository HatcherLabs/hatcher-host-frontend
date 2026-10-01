import { test, expect } from '@playwright/test';
import en from '../messages/en.json';
import ro from '../messages/ro.json';
import { AGENT_EXAMPLE_IDS } from '../lib/agent-examples';

test.beforeEach(async ({ page }) => {
  // These tests only exercise the UI; no account, agent, or AI call is created.
  await page.route('**/auth/session', (route) => route.fulfill({
    json: { success: true, data: { authenticated: false, user: null } },
  }));
  await page.route('**/models/pricing', (route) => route.fulfill({
    json: { success: true, data: { models: [] } },
  }));
  // A simulated session has no real API credentials. Stub the authenticated
  // navigation reads too, so a live API's 401 does not expire the test session.
  await page.route('**/agents', (route) => route.request().method() === 'GET'
    ? route.fulfill({ json: { success: true, data: [] } })
    : route.abort());
  await page.route('**/notifications/unread-count', (route) => route.fulfill({
    json: { success: true, data: { count: 0 } },
  }));
  await page.route('**/agents/parse-intent', (route) => route.abort());
});

test('example survives the sign-in and registration links', async ({ page }) => {
  await page.goto('/');
  // React streaming can briefly retain a hidden copy in its S:1 container.
  // Exercise the user-visible link while still rejecting duplicate visible UI.
  await page.locator('#examples a[href="/create?example=personal"]:visible').click();
  await expect(page).toHaveURL(/\/login\?return=/);
  expect(new URL(page.url()).searchParams.get('return')).toBe('/create?example=personal');
  const registration = page.locator('a[href*="/register?return="]');
  await registration.click();
  await expect(page).toHaveURL(/\/register\?return=/);
  expect(new URL(page.url()).searchParams.get('return')).toBe('/create?example=personal');
  await page.locator('a[href*="/login?return="]').click();
  expect(new URL(page.url()).searchParams.get('return')).toBe('/create?example=personal');
});

for (const id of AGENT_EXAMPLE_IDS) {
  test(`${id}: example opens an editable request without submitting it`, async ({ page }) => {
    await page.route('**/auth/session', (route) => route.fulfill({
      json: { success: true, data: {
        authenticated: true,
        user: { id: 'example-ui-test', email: 'example@hatcher.test', username: 'Example', tier: 'free', isAdmin: false },
      } },
    }));
    const generationRequests: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && /\/agents(?:\/|$)/.test(new URL(request.url()).pathname)) {
        generationRequests.push(request.url());
      }
    });
    await page.goto('/');
    await page.locator(`#examples a[href="/create?example=${id}"]:visible`).click();
    const input = page.locator('textarea').first();
    await expect(input).toHaveValue(en.landingV3.examples.items[id].prompt);
    await input.fill('My own task, edited before continuing.');
    await expect(input).toHaveValue('My own task, edited before continuing.');
    expect(generationRequests).toEqual([]);
  });
}

test('Romanian example keeps the locale and translated request', async ({ page }) => {
  await page.route('**/auth/session', (route) => route.fulfill({
    json: { success: true, data: {
      authenticated: true,
      user: { id: 'example-ui-test', email: 'example@hatcher.test', username: 'Example', tier: 'free', isAdmin: false },
    } },
  }));
  await page.goto('/ro');
  await page.locator('#examples a[href="/ro/create?example=email"]:visible').click();
  await expect(page).toHaveURL(/\/ro\/create\?example=email/);
  await expect(page.locator('textarea').first()).toHaveValue(ro.landingV3.examples.items.email.prompt);
});

test('unknown examples return to an ordinary blank creation page', async ({ page }) => {
  await page.goto('/create?example=https://invalid.example');
  await expect(page).toHaveURL(/\/login\?return=/);
  expect(new URL(page.url()).searchParams.get('return')).toBe('/create');
});
