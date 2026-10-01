import { test, expect } from '@playwright/test';
import en from '../messages/en.json';
import ro from '../messages/ro.json';
import { previewResponse, previewAgent, previewDraft } from './fixtures/simple-experience';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'api.hatcher.host' || url.port === '3111') {
      await route.fulfill({ json: previewResponse(url.pathname, route.request().method()) });
    } else await route.continue();
  });
  await page.routeWebSocket(/.*/, (socket) => socket.close());
});

test('creation uses suggested settings, keeps editing available, and opens chat after explicit confirmation', async ({ page }) => {
  const writes: { path: string; body: unknown }[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST') writes.push({ path: new URL(r.url()).pathname, body: r.postDataJSON() });
  });
  await page.goto('/create?example=personal');
  await page.getByRole('button', { name: en.chatToHatch.send, exact: true }).click();
  const name = page.getByLabel(en.chatToHatch.labelName, { exact: true });
  await expect(name).toHaveValue(previewDraft.name);
  const advanced = page.locator('details').filter({ has: page.locator('summary', { hasText: en.simpleExperience.advanced }) });
  await expect(advanced).not.toHaveAttribute('open');
  await expect(page.getByText(en.simpleExperience.beforeCreate)).toBeVisible();
  await name.fill('');
  await expect(page.getByRole('button', { name: en.chatToHatch.hatchBtn, exact: true })).toBeDisabled();
  await name.fill('My daily helper');
  await advanced.locator('summary').first().click();
  await expect(page.getByLabel(en.chatToHatch.labelModel, { exact: false }).last()).toBeVisible();
  await advanced.locator('summary').first().click();
  expect(writes.filter((r) => r.path === '/agents')).toHaveLength(0);
  await page.getByRole('button', { name: en.chatToHatch.hatchBtn, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/agent/${previewAgent.id}\\?tab=chat&from=hatch`));
  expect(writes.find((r) => r.path === '/agents')?.body).toMatchObject({
    name: 'My daily helper', framework: previewDraft.framework,
    config: { model: previewDraft.model, personality: previewDraft.personality, systemPrompt: previewDraft.systemPrompt },
  });
  expect(writes.filter((r) => r.path.endsWith('/start'))).toHaveLength(1);
});

test('easy mode has a simple home, editable chat examples and saved Advanced preference', async ({ page }) => {
  const chatWrites: string[] = [];
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/chat')) chatWrites.push(r.url()); });
  await page.goto(`/dashboard/agent/${previewAgent.id}`);
  await expect(page.getByTestId('simple-agent-overview')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Easy', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('simple-agent-overview').getByRole('button', { name: en.simpleExperience.chat }).click();
  await page.getByRole('button', { name: en.simpleExperience.promptPlan }).click();
  await expect(page.getByTestId('agent-chat-root').locator('textarea')).toHaveValue(en.simpleExperience.promptPlan);
  expect(chatWrites).toEqual([]);
  await page.getByRole('button', { name: 'Advanced', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Advanced', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /(?:Show|Hide) thinking/ })).toBeVisible();
});

test('an advanced tab deep link remains available in easy mode', async ({ page }) => {
  await page.goto(`/dashboard/agent/${previewAgent.id}?tab=config`);
  await expect(page.getByRole('button', { name: 'Easy', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/tab=config/);
  await expect(page.getByRole('button', { name: 'Config', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'General Identity and positioning' })).toBeVisible();
});

test('switching back to Easy updates the URL and keeps chat open after reload', async ({ page }) => {
  await page.goto(`/dashboard/agent/${previewAgent.id}?tab=config`);
  await page.getByRole('button', { name: 'Advanced', exact: true }).click();
  await page.getByRole('button', { name: 'Easy', exact: true }).click();
  await expect(page).toHaveURL(/tab=chat/);
  await page.reload();
  await expect(page.getByTestId('agent-chat-root')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Easy', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('legacy creation links reach chat and Romanian suggestions stay translated', async ({ page }) => {
  await page.goto(`/ro/dashboard/agent/${previewAgent.id}?from=hatch`);
  await expect(page).toHaveURL(/tab=chat/);
  await expect(page.getByRole('button', { name: ro.simpleExperience.promptEmail })).toBeVisible();
});

test('pricing explains usage and keeps technical specifications expandable', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByRole('heading', { name: en.simpleExperience.costTitle })).toBeVisible();
  const details = page.locator('details').filter({ has: page.locator('summary', { hasText: en.simpleExperience.technicalDetails }) });
  await expect(details).toHaveCount(4);
  await expect(details.first()).not.toHaveAttribute('open');
  await details.first().locator('summary').click();
  await expect(details.first()).toHaveAttribute('open');
});

test('account billing retains the balance and explains plan versus usage', async ({ page }) => {
  await page.goto('/dashboard/billing');
  await expect(page.getByRole('heading', { name: en.simpleExperience.costTitle })).toBeVisible();
  await expect(page.getByText('500', { exact: true }).first()).toBeVisible();
});

test('the mobile Romanian dashboard offers chat without a blocking tour', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/ro/dashboard/agent/${previewAgent.id}`);
  await page.getByTestId('simple-agent-overview').getByRole('button', { name: ro.simpleExperience.chat }).click();
  await page.getByRole('button', { name: ro.simpleExperience.promptEmail }).click();
  await expect(page.getByTestId('agent-chat-root').locator('textarea')).toHaveValue(ro.simpleExperience.promptEmail);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the agent list keeps search usable and extra filters closed initially', async ({ page }) => {
  await page.goto('/dashboard/agents');
  const search = page.getByPlaceholder(en.dashboard.agents.searchPlaceholder);
  await expect(search).toBeVisible();
  expect((await search.locator('..').boundingBox())!.height).toBeGreaterThanOrEqual(36);
  const filters = page.locator('details').filter({ has: page.locator('summary', { hasText: en.simpleExperience.filters }) });
  await expect(filters).not.toHaveAttribute('open');
  await search.fill('no-such-agent');
  await expect(page.locator('article').filter({ hasText: previewAgent.name })).toHaveCount(0);
  await search.fill('Daily');
  await expect(page.locator('article').filter({ hasText: previewAgent.name })).toHaveCount(1);
  await filters.locator('summary').click();
  await expect(page.getByLabel('Framework filter')).toBeVisible();
});
