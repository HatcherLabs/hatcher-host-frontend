export const SITE_VERSION = '1.4.34';
export const DEFAULT_SITE_URL = 'https://hatcher.host';

export const ICON_PATHS = {
  svg: `/icon.svg?v=${SITE_VERSION}`,
  icon192: `/icons/icon-192.png?v=${SITE_VERSION}`,
  icon512: `/icons/icon-512.png?v=${SITE_VERSION}`,
} as const;

export const MANIFEST_PATH = `/manifest.json?v=${SITE_VERSION}`;

const socialPreviewParams = new URLSearchParams({
  title: 'Hatcher',
  subtitle:
    'Managed AI agent infrastructure for hosted models, wallets, tools, rooms, and production runtime controls.',
  tag: 'Agent Cloud',
  v: SITE_VERSION,
});

export const SOCIAL_PREVIEW_PATH = `/og?${socialPreviewParams.toString()}`;

export function absoluteSiteUrl(path: string, siteUrl = DEFAULT_SITE_URL): string {
  return new URL(path, siteUrl).toString();
}

export function buildSocialPreviewImage(siteUrl = DEFAULT_SITE_URL) {
  return {
    url: absoluteSiteUrl(SOCIAL_PREVIEW_PATH, siteUrl),
    width: 1200,
    height: 630,
    alt: 'Hatcher - AI Agent Infrastructure',
  };
}
