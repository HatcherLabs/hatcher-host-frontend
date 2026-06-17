import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ICON_PATHS,
  SITE_VERSION,
  SOCIAL_PREVIEW_PATH,
  buildSocialPreviewImage,
} from '../lib/site-assets';

describe('site version and public preview assets', () => {
  it('ships metadata with the package site version', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { version: string };

    expect(SITE_VERSION).toBe(packageJson.version);
  });

  it('uses cache-busted favicon and manifest icon URLs', () => {
    const versionQuery = `v=${SITE_VERSION}`;
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), 'public/manifest.json'), 'utf8'),
    ) as { icons: Array<{ src: string }> };

    expect(ICON_PATHS.svg).toBe(`/icon.svg?${versionQuery}`);
    expect(ICON_PATHS.icon192).toBe(`/icons/icon-192.png?${versionQuery}`);
    expect(ICON_PATHS.icon512).toBe(`/icons/icon-512.png?${versionQuery}`);
    expect(manifest.icons.map((icon) => icon.src)).toEqual([
      ICON_PATHS.svg,
      ICON_PATHS.icon192,
      ICON_PATHS.icon512,
    ]);
  });

  it('uses the refreshed OG route for social previews instead of the old hero robot image', () => {
    const image = buildSocialPreviewImage('https://hatcher.host');

    expect(SOCIAL_PREVIEW_PATH).toContain('/og?');
    expect(SOCIAL_PREVIEW_PATH).toContain(`v=${SITE_VERSION}`);
    expect(SOCIAL_PREVIEW_PATH).not.toContain('hero-agent-infrastructure');
    expect(image).toMatchObject({
      url: expect.stringContaining('https://hatcher.host/og?'),
      width: 1200,
      height: 630,
      alt: 'Hatcher - AI Agent Infrastructure',
    });
    expect(image.url).toContain(`v=${SITE_VERSION}`);
  });
});
