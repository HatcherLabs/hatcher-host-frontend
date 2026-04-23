import { test, expect } from '@playwright/test';

test.describe('City V2 Phase 1 — skeleton', () => {
  test('renders WebGL canvas at /city?v=2', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));

    await page.goto('/city?v=2');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    // Give the renderer ~500ms to produce a frame, then confirm a WebGL
    // context was created.
    await page.waitForTimeout(500);
    const hasGL = await page.evaluate(() => {
      const c = document.querySelector('canvas') as HTMLCanvasElement | null;
      if (!c) return false;
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      return !!gl;
    });
    expect(hasGL).toBe(true);

    // Non-asset failures (e.g. undefined refs, bad imports) would leak to
    // pageerror — asset 404s live in the Network tab and are fine pre-T5.
    expect(consoleErrors).toEqual([]);
  });

  test('legacy /city still loads without v flag', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));

    await page.goto('/city');
    // With API running locally the canvas appears; without it, the
    // legacy loading screen is shown. Either is "no regression" — what
    // we care about is that no JS exceptions escape while rendering.
    await page.waitForTimeout(1000);
    expect(consoleErrors).toEqual([]);
  });

  test('quality toggle is visible and clickable', async ({ page }) => {
    await page.goto('/city?v=2');
    await expect(page.getByRole('button', { name: 'HIGH' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'LOW' })).toBeVisible();
    await page.getByRole('button', { name: 'LOW' }).click();
    // Canvas remounts on quality change — still visible
    await expect(page.locator('canvas').first()).toBeVisible();
  });
});
