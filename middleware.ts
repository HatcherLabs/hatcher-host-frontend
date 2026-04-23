// ============================================================
// Next.js Middleware — next-intl locale routing + landing pageview beacon (C13)
// ============================================================
//
// Chain order:
//   1. next-intl middleware — detects/rewrites locale prefix, sets HATCHER_LOCALE cookie
//   2. Beacon logic — fires a fire-and-forget POST /analytics/pageview to the API
//      for every navigation to a public landing page.
//
// Beacon design choices (preserved from original):
//   - Runs only on a curated allowlist of public routes. The check is done on the
//     LOCALE-STRIPPED pathname so /zh/pricing, /de/pricing etc. all match /pricing.
//   - `keepalive: true` so the request survives the page-transition boundary.
//   - `.catch(() => {})` — beacon failures never delay or break page load.
//   - Forwards `x-forwarded-for` + `cf-connecting-ip` headers so the API can hash
//     the visitor's IP (not the Next.js server's IP) into the HyperLogLog bucket.
// ============================================================

import createMiddleware from 'next-intl/middleware';
import type { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { locales } from './i18n/config';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// next-intl middleware instance — runs first to handle locale detection/rewrites.
const intlMiddleware = createMiddleware(routing);

// Regex matching any supported locale prefix at the start of the pathname.
// Derived from locales in i18n/config.ts at compile time.
const LOCALE_PREFIX_REGEX = new RegExp(`^/(${locales.join('|')})(/.*|$)`);

function stripLocalePrefix(pathname: string): string {
  const match = pathname.match(LOCALE_PREFIX_REGEX);
  if (!match) return pathname;
  // match[2] is the remainder after the locale segment, or empty string for bare /zh
  return match[2] || '/';
}

// Only these exact prefixes fire the beacon. Everything else passes through
// untouched. The root path `/` is handled separately (most common landing entry).
const PUBLIC_PREFIXES = [
  '/frameworks',
  '/token',
  '/pricing',
  '/roadmap',
  '/docs',
  '/features',
  '/blog',
  '/changelog',
  '/help',
  '/impressum',
  '/privacy',
  '/terms',
  '/cookies',
  '/status',
  '/shortcuts',
] as const;

function isTrackablePath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default function middleware(req: NextRequest): NextResponse {
  // Step 1: Run next-intl first so it can handle locale detection/rewrites/redirects
  // and set the HATCHER_LOCALE cookie.
  const response = intlMiddleware(req);

  // Step 2: Beacon logic — operate on the locale-stripped pathname so
  // /zh/pricing, /de/pricing, etc. all match just like /pricing does.
  const unprefixed = stripLocalePrefix(req.nextUrl.pathname);

  if (isTrackablePath(unprefixed)) {
    // Forward visitor IP + referrer so the API can hash them into its
    // HLL unique-visitor bucket. We don't await — fire and forget.
    const ipForward =
      req.headers.get('cf-connecting-ip')
      || req.headers.get('x-forwarded-for')
      || '';
    const referrer = req.headers.get('referer') || undefined;

    // `keepalive` lets the request survive even if the page transition
    // aborts the fetch context. Any failure (network, CORS, 5xx) is
    // swallowed — beacon must never impact page-load UX.
    void fetch(`${API_URL}/analytics/pageview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ipForward ? { 'x-forwarded-for': ipForward } : {}),
      },
      body: JSON.stringify({ path: unprefixed, referrer }),
      keepalive: true,
    }).catch(() => {
      /* swallow — beacon failures must never surface */
    });
  }

  return response;
}

// Route matcher — Next.js runs this middleware ONLY for paths that match.
// Excludes: API routes, _next static/image, _vercel, and any path with a
// file extension (covers /*.png, /*.svg, /*.css, /*.js, etc.).
// next-intl requires a broad matcher; the beacon allowlist handles further
// filtering internally via isTrackablePath().
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
