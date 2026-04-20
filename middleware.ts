// ============================================================
// Next.js Middleware — landing pageview beacon (C13)
// ============================================================
//
// Fires a fire-and-forget POST /analytics/pageview to the API for every
// navigation to a public landing page. The backend increments a daily
// counter + a HyperLogLog of unique-visitor IP hashes in Redis, surfaced
// on the admin panel as "Landing Traffic". Zero PII persisted.
//
// Design choices:
//   - Runs only on a curated allowlist of public routes. `/dashboard/*`,
//     `/admin/*`, `/login`, `/register`, `/verify-email`, `/forgot-password`,
//     `/reset-password`, `/settings/*`, `/og/*`, and any `_next`, API, or
//     static asset are explicitly excluded by the `config.matcher` below.
//   - `keepalive: true` so the request survives the page-transition boundary
//     (browsers abort in-flight fetches on navigation otherwise).
//   - `.catch(() => {})` — we never want a beacon failure to delay or
//     break a page load. The middleware returns `NextResponse.next()`
//     synchronously; the fetch is intentionally not awaited.
//   - Forwards `x-forwarded-for` + `cf-connecting-ip` headers so the API
//     can hash the *visitor's* IP (not the Next.js server's IP) into
//     the HyperLogLog bucket. This matches how the existing live-stats
//     tracker computes unique-visitors.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Only these exact prefixes fire the beacon. Everything else passes
// through `NextResponse.next()` untouched. The root path `/` is handled
// separately (it's the most common landing entry).
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

export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;

  if (isTrackablePath(pathname)) {
    // Forward visitor IP + referrer so the API can hash them into its
    // HLL unique-visitor bucket. We don't await — fire and forget.
    const ipForward =
      request.headers.get('cf-connecting-ip')
      || request.headers.get('x-forwarded-for')
      || '';
    const referrer = request.headers.get('referer') || undefined;

    // `keepalive` lets the request survive even if the page transition
    // aborts the fetch context. Any failure (network, CORS, 5xx) is
    // swallowed — beacon must never impact page-load UX.
    void fetch(`${API_URL}/analytics/pageview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ipForward ? { 'x-forwarded-for': ipForward } : {}),
      },
      body: JSON.stringify({ path: pathname, referrer }),
      keepalive: true,
    }).catch(() => {
      /* swallow — beacon failures must never surface */
    });
  }

  return NextResponse.next();
}

// Route matcher — Next.js runs this middleware ONLY for paths that match.
// We exclude `_next`, API routes, file assets (anything with a `.`), and
// all known non-public routes. This is belt-and-braces alongside the
// `isTrackablePath()` allowlist above.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, robots.txt, sitemap.xml, manifest.webmanifest
     * - dashboard (authenticated area)
     * - admin (admin panel)
     * - login, register, forgot-password, reset-password, verify-email
     * - settings (authenticated area)
     * - agent, create, skill, support (authenticated areas)
     * - og (OG image generation)
     * - any path with a file extension (covers /*.png, /*.svg, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|dashboard|admin|login|register|forgot-password|reset-password|verify-email|settings|agent|create|skill|support|og|.*\\..*).*)',
  ],
};
