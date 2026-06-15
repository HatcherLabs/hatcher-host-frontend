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
  it('ships the redesign as site version 1.4.0', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { version: string };

    expect(packageJson.version).toBe('1.4.0');
    expect(SITE_VERSION).toBe('1.4.0');
  });

  it('uses cache-busted favicon and manifest icon URLs', () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), 'public/manifest.json'), 'utf8'),
    ) as { icons: Array<{ src: string }> };

    expect(ICON_PATHS.svg).toBe('/icon.svg?v=1.4.0');
    expect(ICON_PATHS.icon192).toBe('/icons/icon-192.png?v=1.4.0');
    expect(ICON_PATHS.icon512).toBe('/icons/icon-512.png?v=1.4.0');
    expect(manifest.icons.map((icon) => icon.src)).toEqual([
      ICON_PATHS.svg,
      ICON_PATHS.icon192,
      ICON_PATHS.icon512,
    ]);
  });

  it('uses the refreshed OG route for social previews instead of the old hero robot image', () => {
    const image = buildSocialPreviewImage('https://hatcher.host');

    expect(SOCIAL_PREVIEW_PATH).toContain('/og?');
    expect(SOCIAL_PREVIEW_PATH).toContain('v=1.4.0');
    expect(SOCIAL_PREVIEW_PATH).not.toContain('hero-agent-infrastructure');
    expect(image).toMatchObject({
      url: expect.stringContaining('https://hatcher.host/og?'),
      width: 1200,
      height: 630,
      alt: 'Hatcher - AI Agent Infrastructure',
    });
    expect(image.url).toContain('v=1.4.0');
  });
});
