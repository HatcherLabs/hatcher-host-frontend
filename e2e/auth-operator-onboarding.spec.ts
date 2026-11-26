import { test, expect, type Page } from '@playwright/test';

const user = {
  id: 'fixture-owner', username: 'user_0123456789abcdef', email: 'fixture@example.test',
  emailVerified: true, tier: 'free', isAdmin: false, walletAddress: null, avatarUrl: null,
  needsUsername: true, createdAt: '2026-10-01T00:00:00Z', agentCount: 0,
};
async function fixture(page: Page, needsUsername = true) {
  let profile = { ...user, needsUsername };
  let writes = 0;
  await page.route('**/api/hatcher/**', async route => {
    const url = new URL(route.request().url());
    const pathname = url.pathname.replace('/api/hatcher', '');
    let data: unknown = {};
    if (pathname === '/auth/session' || pathname === '/auth/me') {
      if (route.request().method() === 'PATCH') {
        writes++;
        const input = route.request().postDataJSON();
        if (input.username === 'taken_name') return route.fulfill({ status: 400, json: { success: false, error: 'Username is already taken' } });
        profile = { ...profile, username: input.username, needsUsername: false };
      }
      data = pathname === '/auth/session' ? { authenticated: true, user: profile } : profile;
    } else if (pathname === '/auth/providers') data = { google: true, apple: true };
    else if (pathname === '/oauth/authorize/request') data = {
      client: { id: 'hmc_fixture', name: 'Fixture Assistant' }, scopes: ['hatcher:account:read', 'hatcher:mail:write'],
      account: { email: user.email, emailVerified: true }, redirectUri: 'https://client.example/callback',
    };
    else if (pathname === '/oauth/connections' && route.request().method() === 'GET') data = {
      serverUrl: 'https://api.hatcher.host/mcp',
      connections: [{ clientId: 'hmc_fixture', name: 'Fixture Assistant', scopes: ['hatcher:mail:write'], connectedAt: user.createdAt }],
    };
    else if (pathname === '/oauth/connections/hmc_fixture') data = { disconnected: true };
    else if (pathname === '/agents') data = [];
    else if (pathname.includes('/actions')) data = { actions: [], grants: [], summary: { pending: 0, activeGrants: 0 } };
    await route.fulfill({ json: { success: true, data } });
  });
  return { writes: () => writes };
}
for (const width of [1280, 390]) {
  test('social username onboarding preserves OAuth destination at width ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    const state = await fixture(page);
    const destination = '/en/oauth/authorize?client_id=hmc_fixture&redirect_uri=https%3A%2F%2Fclient.example%2Fcallback&response_type=code&code_challenge=challenge&code_challenge_method=S256&state=keep-me';
    await page.goto(destination);
    const dialog = page.getByRole('dialog', { name: 'Choose your username' });
    await expect(dialog).toBeVisible({ timeout: 60_000 });
    await page.screenshot({ path: 'test-results/username-' + width + '.png' });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Username', { exact: true }).fill('taken_name');
    await dialog.getByRole('button', { name: 'Save and continue', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('already taken');
    await dialog.getByLabel('Username', { exact: true }).fill('chosen_name');
    await dialog.getByRole('button', { name: 'Save and continue', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(page.url()).toContain('state=keep-me');
    expect(state.writes()).toBe(2);
    await page.reload();
    await expect(page.getByRole('dialog', { name: 'Choose your username' })).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
test('connections show granted permissions and disconnect only after confirmation', async ({ page }) => {
  await fixture(page, false);
  let revoked = 0;
  await page.route('**/oauth/connections/hmc_fixture', async route => {
    expect(route.request().method()).toBe('DELETE');
    revoked++;
    await route.fulfill({ json: { success: true, data: { disconnected: true } } });
  });
  await page.goto('/en/dashboard/settings/connections');
  await expect(page.getByRole('heading', { name: 'Use Hatcher in your AI assistant' })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('Fixture Assistant', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
  expect(revoked).toBe(0);
  await page.getByRole('button', { name: 'Disconnect', exact: true }).last().click();
  await expect.poll(() => revoked).toBe(1);
});
test('configured Apple sign-in retains the requested MCP consent destination', async ({ page }) => {
  await fixture(page, false);
  await page.route('**/auth/session', route => route.fulfill({ status: 401, json: { success: false, error: 'Unauthorized' } }));
  await page.route('**/auth/me', route => route.fulfill({ status: 401, json: { success: false, error: 'Unauthorized' } }));
  await page.route('**/auth/apple/web/start?**', route => route.fulfill({ contentType: 'text/plain', body: 'Apple login redirect intercepted for test' }));
  const returnPath = '/oauth/authorize?client_id=hmc_fixture&state=keep-me';
  await page.goto('/en/login?return=' + encodeURIComponent(returnPath));
  await page.getByRole('button', { name: 'Continue with Apple' }).click({ timeout: 60_000 });
  await expect.poll(() => new URL(page.url()).searchParams.get('return')).toBe(returnPath);
  expect(new URL(page.url()).pathname).toContain('/auth/apple/web/start');
});
