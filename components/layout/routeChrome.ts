import { locales } from '@/i18n/config';

const LOCALE_PREFIX_RE = new RegExp(`^/(${locales.join('|')})(/.*|$)`);

// Routes that own the full viewport or ship their own page chrome.
const IMMERSIVE_PATTERNS: RegExp[] = [
  /^\/agent\/[^/]+\/room(?:-legacy)?(?:\/|$)/,
  /^\/city(?:\/|$)/,
  /^\/chat-to-hatch(?:\/|$)/,
  /^\/$/,
  /^\/(?:explore|features|pricing|frameworks|token|roadmap|blog|changelog|help|support|affiliate|security|whitepaper)(?:\/|$)/,
  /^\/(?:login|register|forgot-password|reset-password|verify-email)(?:\/|$)/,
  /^\/(?:privacy|terms|cookies|impressum)(?:\/|$)/,
];

export function stripLocaleForChrome(pathname: string): string {
  const match = pathname.match(LOCALE_PREFIX_RE);
  if (!match) return pathname;
  return match[2] || '/';
}

export function isImmersiveChromePath(pathname: string): boolean {
  const normalized = stripLocaleForChrome(pathname);
  return IMMERSIVE_PATTERNS.some((re) => re.test(normalized));
}
