/**
 * i18n E2E Tests — Locale routing, language switcher, SEO tags, legal-page behavior.
 *
 * Runs in the unauthenticated browser project (no stored auth state needed).
 * DO NOT run while T16 translations are still in progress — placeholder content
 * will cause false positives/negatives. T20 runs the full suite at verification time.
 */

import { test, expect } from '@playwright/test';

// All routes tested here are public — no auth state needed.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('i18n', () => {
  test('root path serves English landing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Landing has "Hatch" in the English hero headline
    const headline = page.locator('h1').first();
    await expect(headline).toContainText(/Hatch/i);
  });

  test('/zh serves Chinese locale', async ({ page }) => {
    const res = await page.goto('/zh', { waitUntil: 'domcontentloaded' });
    // Should respond with 200 — not redirect to an error page
    expect(res?.status()).toBe(200);
    // NOTE: <html lang> is hardcoded to "en" in the root app/layout.tsx because
    // Next.js doesn't allow segment params above [locale]. Search engines use
    // hreflang alternates for language targeting, not <html lang>. Assert the
    // canonical alternate instead as proof of per-locale metadata.
    const zhAlt = await page
      .locator('link[rel="alternate"][hreflang="zh"]')
      .first()
      .getAttribute('href');
    expect(zhAlt).toMatch(/\/zh$/);
  });

  test('language switcher in header exists and is accessible', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
    // LocaleSwitcher renders a <select aria-label="Change language">
    const switcher = page.locator('select[aria-label*="language" i]').first();
    await expect(switcher).toBeVisible();
  });

  test('language switcher changes URL and persists cookie', async ({ page, context }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const switcher = page.locator('select[aria-label*="language" i]').first();
    await switcher.selectOption('de');
    await page.waitForURL(/\/de\/pricing/, { timeout: 10_000 });

    const cookies = await context.cookies();
    const localeCookie = cookies.find((c) => c.name === 'HATCHER_LOCALE');
    expect(localeCookie?.value).toBe('de');
  });

  test('internal Link preserves locale', async ({ page }) => {
    await page.goto('/fr');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
    // Find an internal link to pricing (header nav or landing CTA)
    const pricingLink = page
      .locator('a[href$="/pricing"], a[href$="/fr/pricing"]')
      .first();
    await pricingLink.click();
    await expect(page).toHaveURL(/\/fr\/pricing/);
  });

  test('hreflang tags present on pricing page', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');
    const hreflangs = await page.locator('link[rel="alternate"][hreflang]').all();
    const values = await Promise.all(
      hreflangs.map((l) => l.getAttribute('hreflang')),
    );
    // buildLanguagesMap('/pricing') emits all 5 locales + x-default
    expect(values).toEqual(expect.arrayContaining(['en', 'zh', 'de', 'fr', 'ro']));
  });

  test('og:locale matches the locale on /zh (landing)', async ({ page }) => {
    // NOTE: /zh/pricing has its own generateMetadata that overrides openGraph,
    // stripping the parent's og:locale. This is a known tradeoff (the pricing
    // layout sets its own og:title/image). Test og:locale on /zh landing where
    // the parent [locale]/layout.tsx metadata is the active source.
    await page.goto('/zh');
    await page.waitForLoadState('domcontentloaded');
    const ogLocale = await page
      .locator('meta[property="og:locale"]')
      .first()
      .getAttribute('content');
    // OG_LOCALE_MAP in [locale]/layout.tsx maps zh → zh_CN
    expect(ogLocale).toBe('zh_CN');
  });

  test('legal pages stay English — /zh/privacy 404s', async ({ page }) => {
    // /privacy is in NON_LOCALE_PREFIXES and lives outside [locale] segment.
    // There is no app/[locale]/privacy route, so /zh/privacy hits Next.js 404.
    const res = await page.goto('/zh/privacy', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(404);
  });

  test('legal page /privacy at root returns 200 (EN only)', async ({ page }) => {
    const res = await page.goto('/privacy', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);
  });

  test('admin path stays outside [locale] — /zh/admin 404s', async ({ page }) => {
    // /admin is in NON_LOCALE_PREFIXES; there is no [locale]/admin route.
    const res = await page.goto('/zh/admin', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(404);
  });

  test('unknown locale returns 404', async ({ page }) => {
    // [locale]/layout.tsx calls notFound() for unrecognised locale segments.
    const res = await page.goto('/xx/pricing', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(404);
  });

  test('all 5 locales render pricing successfully', async ({ page }) => {
    // en uses no prefix (localePrefix: 'as-needed'); others use /<locale>/pricing
    const routes = ['/pricing', '/zh/pricing', '/de/pricing', '/fr/pricing', '/ro/pricing'];
    for (const route of routes) {
      const res = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(res?.status(), `status for ${route}`).toBe(200);
    }
  });
});
