import { expect, test } from '@playwright/test';
import { inflateSync } from 'node:zlib';

test.use({ storageState: { cookies: [], origins: [] } });

const cityPayload = {
  success: true,
  data: {
    agents: [
      {
        id: 'mine-running',
        slug: 'aurora-planner',
        name: 'Aurora Planner',
        avatarUrl: null,
        framework: 'openclaw',
        category: 'productivity',
        tier: 4,
        status: 'running',
        messageCount: 128,
        mine: true,
      },
      {
        id: 'hermes-route',
        slug: 'market-scout',
        name: 'Market Scout',
        avatarUrl: null,
        framework: 'hermes',
        category: 'finance',
        tier: 3,
        status: 'running',
        messageCount: 92,
        mine: false,
      },
      {
        id: 'copy-loop',
        slug: 'copy-loop',
        name: 'Copy Loop',
        avatarUrl: null,
        framework: 'openclaw',
        category: 'marketing',
        tier: 2,
        status: 'sleeping',
        messageCount: 41,
        mine: false,
      },
      {
        id: 'ops-guard',
        slug: 'ops-guard',
        name: 'Ops Guard',
        avatarUrl: null,
        framework: 'hermes',
        category: 'devops',
        tier: 3,
        status: 'running',
        messageCount: 77,
        mine: true,
      },
      {
        id: 'legal-drafter',
        slug: 'legal-drafter',
        name: 'Legal Drafter',
        avatarUrl: null,
        framework: 'openclaw',
        category: 'legal',
        tier: 1,
        status: 'paused',
        messageCount: 8,
        mine: false,
      },
    ],
    counts: {
      total: 5,
      running: 3,
      byFramework: { openclaw: 3, hermes: 2 },
      byCategory: {
        productivity: 1,
        finance: 1,
        marketing: 1,
        devops: 1,
        legal: 1,
      },
    },
    generatedAt: '2026-05-08T08:30:00.000Z',
    viewerId: 'viewer-1',
  },
};

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function hasVisiblePixels(png: Buffer) {
  const idat: Buffer[] = [];
  let width = 0;
  let height = 0;
  let channels = 0;
  let offset = 8;

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;

    if (type === 'IHDR') {
      width = png.readUInt32BE(dataStart);
      height = png.readUInt32BE(dataStart + 4);
      const bitDepth = png[dataStart + 8];
      const colorType = png[dataStart + 9];
      if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
        throw new Error(`Unsupported PNG format: depth ${bitDepth}, color ${colorType}`);
      }
      channels = colorType === 6 ? 4 : 3;
    } else if (type === 'IDAT') {
      idat.push(png.subarray(dataStart, dataStart + length));
    } else if (type === 'IEND') {
      break;
    }

    offset = dataStart + length + 4;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const bpp = channels;
  let rawOffset = 0;
  let previous = new Uint8Array(stride);
  let brightPixels = 0;

  for (let y = 0; y < height; y++) {
    const filter = raw[rawOffset++];
    const current = new Uint8Array(stride);

    for (let i = 0; i < stride; i++) {
      const value = raw[rawOffset++];
      const left = i >= bpp ? current[i - bpp] : 0;
      const up = previous[i] ?? 0;
      const upLeft = i >= bpp ? previous[i - bpp] : 0;

      if (filter === 0) current[i] = value;
      else if (filter === 1) current[i] = (value + left) & 255;
      else if (filter === 2) current[i] = (value + up) & 255;
      else if (filter === 3) current[i] = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) current[i] = (value + paeth(left, up, upLeft)) & 255;
      else throw new Error(`Unsupported PNG filter: ${filter}`);
    }

    for (let x = 0; x < stride; x += channels * 8) {
      const alpha = channels === 4 ? current[x + 3] : 255;
      const luminance = (current[x] ?? 0) + (current[x + 1] ?? 0) + (current[x + 2] ?? 0);
      if (alpha > 8 && luminance > 50) brightPixels++;
      if (brightPixels > 24) return true;
    }

    previous = current;
  }

  return false;
}

test.beforeEach(async ({ page }) => {
  await page.route('**/public/city', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(cityPayload),
    });
  });
});

test.describe('Hatcher City live network', () => {
  test('renders the live network HUD and a nonblank WebGL scene', async ({ page }) => {
    await page.goto('/city', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Live Agent Network' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('5 agents')).toBeVisible();
    await expect(page.getByText('3 active')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create agent' })).toBeVisible();
    await expect(page.locator('#main-content').getByText('My agents')).toBeVisible();
    await expect(page.getByRole('link', { name: /Aurora Planner/ })).toBeVisible();

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    await expect
      .poll(async () => hasVisiblePixels(await canvas.screenshot()), { timeout: 20_000 })
      .toBe(true);
  });

  test('legacy category pages redirect back to the city', async ({ page, request }) => {
    const response = await request.get('/city/development', { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe('/city');

    await page.goto('/city/development', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/city$/);
    await expect(page.getByRole('heading', { name: 'Live Agent Network' })).toBeVisible();
  });
});
