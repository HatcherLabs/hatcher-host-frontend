import { test, expect } from '@playwright/test';

const ADDRESS = '0x1111111111111111111111111111111111111111';
const OWNER = '0x' + '33'.repeat(20);
const SIGNATURE = '0x' + '44'.repeat(65);
const CHALLENGE_ID = 'aa'.repeat(32);
// Synthetic fixture: this exercises the real SDK popup transport, not a real wallet.
const MESSAGE = 'localhost wants you to sign in to Hatcher\nNonce: ' + CHALLENGE_ID;

test('Incentiv connect → sign → cookie session; desktop and mobile layout', async ({ page, context }, testInfo) => {
  const origin = new URL(String(testInfo.project.use.baseURL)).origin;
  let verified = false;
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await context.route(url => url.pathname.includes('/auth/'), async route => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } });
      return;
    }
    const path = new URL(route.request().url()).pathname;
    let data: unknown = {};
    if (path.endsWith('/auth/incentiv/config')) data = { enabled: true, chainId: 24101, portal: 'https://portal.incentiv.io' };
    else if (path.endsWith('/auth/providers')) data = { google: false, apple: false };
    else if (path.endsWith('/auth/browser-admission')) data = { enabled: false };
    else if (path.endsWith('/auth/session')) data = { authenticated: false, user: null };
    else if (path.endsWith('/auth/incentiv/challenge')) {
      expect(route.request().postDataJSON()).toEqual({ address: ADDRESS });
      data = { challengeId: CHALLENGE_ID, message: MESSAGE, address: ADDRESS, expiresAt: new Date(Date.now() + 300000).toISOString() };
    } else if (path.endsWith('/auth/incentiv/verify')) {
      expect(route.request().postDataJSON()).toEqual({ challengeId: CHALLENGE_ID, owner: OWNER, signature: SIGNATURE });
      verified = true; data = { authenticated: true };
    }
    await route.fulfill({ headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }, json: { success: true, data } });
  });
  await context.route('https://portal.incentiv.io/dapp?**', async route => {
    const encoded = new URL(route.request().url()).searchParams.get('data')!;
    const input = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    const result = input.intent === 'CONNECT' ? { type: 'CONNECT_RESOLVED', address: ADDRESS } :
      { type: 'SIGN_RESOLVED', payload: input.payload, signature: SIGNATURE, owner: OWNER };
    if (input.intent === 'SIGN') expect(input.payload).toBe(MESSAGE);
    await route.fulfill({ contentType: 'text/html', body: '<script>window.opener.postMessage(' + JSON.stringify(result) + ', ' + JSON.stringify(origin) + ');</script>' });
  });
  await context.route(url => url.pathname === '/incentiv-test-success', route => route.fulfill({ contentType: 'text/html', body: '<h1>Signed in fixture</h1>' }));
  await page.goto('/de/login?return=/incentiv-test-success');
  const connect = page.getByRole('button', { name: 'Continue with Incentiv' });
  await expect(connect).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('incentiv-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(connect).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('incentiv-mobile.png'), fullPage: true });
  await connect.click();
  await expect(page.getByRole('button', { name: 'Sign in with wallet' })).toBeEnabled();
  await page.getByRole('button', { name: 'Sign in with wallet' }).click();
  await expect(page.getByRole('heading', { name: 'Signed in fixture' })).toBeVisible();
  expect(verified).toBe(true);
  expect(pageErrors).toEqual([]);
});

test('a rejected signature leaves the user signed out and allows retry', async ({ page, context }, testInfo) => {
  const origin = new URL(String(testInfo.project.use.baseURL)).origin;
  let verificationCalls = 0;
  await context.route(url => url.pathname.includes('/auth/'), async route => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } });
      return;
    }
    const path = new URL(route.request().url()).pathname;
    let data: unknown = {};
    if (path.endsWith('/incentiv/config')) data = { enabled: true };
    else if (path.endsWith('/browser-admission')) data = { enabled: false };
    else if (path.endsWith('/session')) data = { authenticated: false, user: null };
    else if (path.endsWith('/incentiv/challenge')) data = { challengeId: CHALLENGE_ID, message: MESSAGE, address: ADDRESS, expiresAt: new Date(Date.now() + 300000).toISOString() };
    else if (path.endsWith('/incentiv/verify')) verificationCalls++;
    await route.fulfill({ headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }, json: { success: true, data } });
  });
  await context.route('https://portal.incentiv.io/dapp?**', async route => {
    const input = JSON.parse(Buffer.from(new URL(route.request().url()).searchParams.get('data')!, 'base64url').toString());
    const result = input.intent === 'CONNECT' ? { type: 'CONNECT_RESOLVED', address: ADDRESS } : { type: 'REJECTED', reason: 'Cancelled by user' };
    await route.fulfill({ contentType: 'text/html', body: '<script>window.opener.postMessage(' + JSON.stringify(result) + ', ' + JSON.stringify(origin) + ');</script>' });
  });
  await page.goto('/de/login');
  await page.getByRole('button', { name: 'Continue with Incentiv' }).click();
  await page.getByRole('button', { name: 'Sign in with wallet' }).click();
  await expect(page.locator('p[role=alert]')).toContainText('rejected');
  await expect(page.getByRole('button', { name: 'Continue with Incentiv' })).toBeEnabled();
  expect(verificationCalls).toBe(0);
});
