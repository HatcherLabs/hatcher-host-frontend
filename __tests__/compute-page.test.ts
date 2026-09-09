import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  computeNetworkStats,
  deviceClasses,
  executionModes,
} from '../app/[locale]/compute/compute-data';
import { FOOTER_COLUMNS, NAV_GROUPS } from '@/components/marketing/v3/links';

const pageSource = readFileSync(
  new URL('../app/[locale]/compute/page.tsx', import.meta.url),
  'utf8',
);
const experienceSource = readFileSync(
  new URL('../app/[locale]/compute/ComputeExperience.tsx', import.meta.url),
  'utf8',
);
const betaApplicationSource = readFileSync(
  new URL('../app/[locale]/compute/ComputeBetaApplication.tsx', import.meta.url),
  'utf8',
);
const englishMessages = JSON.parse(
  readFileSync(new URL('../messages/en.json', import.meta.url), 'utf8'),
) as { compute: { beta: Record<string, unknown> } };
const routeChromeSource = readFileSync(
  new URL('../components/layout/routeChrome.ts', import.meta.url),
  'utf8',
);
const sitemapSource = readFileSync(
  new URL('../app/sitemap.ts', import.meta.url),
  'utf8',
);

describe('Hatcher Compute public page', () => {
  it('publishes an honest provider-alpha zero state', () => {
    expect(computeNetworkStats.status).toBe('provider-alpha');
    expect(computeNetworkStats.metrics).toHaveLength(4);
    expect(computeNetworkStats.metrics.every((metric) => metric.value === null)).toBe(true);
    expect(JSON.stringify(computeNetworkStats)).not.toMatch(/\$\d|\d+\s*USDC/i);
  });

  it('covers every execution mode and useful weak-device class', () => {
    expect(executionModes.map((mode) => mode.id)).toEqual([
      'single-node',
      'distributed-tasks',
      'model-sharded-mesh',
    ]);
    expect(deviceClasses.map((device) => device.id)).toEqual([
      'cpu-integrated',
      'vram-4-8',
      'vram-12-24',
      'multi-gpu',
    ]);
    expect(deviceClasses[0].work).toContain('verification');
  });

  it('uses the marketing shell without nesting a second main landmark', () => {
    expect(pageSource).toContain('<MarketingShell>');
    expect(pageSource).not.toContain('<main');
    expect(experienceSource).toContain('useTranslations');
  });

  it('is reachable from public chrome and discoverable by crawlers', () => {
    expect(
      NAV_GROUPS.flatMap((group) => group.items),
    ).toContainEqual(expect.objectContaining({ key: 'compute', href: '/compute' }));
    expect(
      FOOTER_COLUMNS.some((column) =>
        column.items.some((item) => item.href === '/compute'),
      ),
    ).toBe(true);
    expect(routeChromeSource).toContain('compute');
    expect(sitemapSource).toContain('{ path: "/compute"');
  });

  it('keeps earnings language conditional and non-investment-oriented', () => {
    expect(experienceSource).toContain('estimateUnavailable');
    expect(experienceSource).toContain('estimateDisclaimer');
    expect(experienceSource).not.toMatch(/passive income|guaranteed profit|APY/i);
  });

  it('offers a privacy-aware closed beta application for providers and builders', () => {
    expect(experienceSource).toContain('<ComputeBetaApplication />');
    expect(experienceSource).toContain('href="#compute-beta"');
    expect(betaApplicationSource).toContain('api.applyToComputeBeta');
    expect(betaApplicationSource).toContain('participation: "provider"');
    expect(betaApplicationSource).toContain('updatesOptIn: false');
    expect(betaApplicationSource).toContain('href="/privacy"');
    expect(JSON.stringify(englishMessages.compute.beta)).toMatch(/No USDC moves in demo mode/);
    expect(JSON.stringify(englishMessages.compute.beta)).toMatch(/no earnings are promised/i);
  });
});
