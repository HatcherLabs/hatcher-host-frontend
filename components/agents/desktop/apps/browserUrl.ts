/**
 * Address-bar input → safe iframe URL for the desktop Browser app.
 *
 * Only http(s) may ever reach the iframe. Anything else (javascript:, data:,
 * file:, blob:, about:, ftp:, unparseable garbage) returns null and the UI
 * shows an inline "invalid address" error instead of navigating.
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/** Leading URL scheme per RFC 3986 (`scheme ":"`). */
const SCHEME_REGEX = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * Normalize free-form address input to an http(s) URL, or null if invalid.
 *
 * - Trims surrounding whitespace.
 * - Prepends `https://` when no scheme is present.
 * - Rejects every non-http(s) scheme.
 * - Canonicalizes via the WHATWG URL parser (idempotent on its own output).
 *
 * The final check runs on the PARSED protocol, not the raw string: the URL
 * parser strips tabs/newlines, so a smuggled scheme can never bypass the
 * string-level check and still come out as a non-http(s) URL.
 */
export function normalizeBrowserUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const scheme = SCHEME_REGEX.exec(trimmed)?.[0];
  if (scheme && !ALLOWED_PROTOCOLS.has(scheme.toLowerCase())) return null;

  let parsed: URL;
  try {
    parsed = new URL(scheme ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
  // Degenerate hosts ('', '...') parse fine but can never resolve — treat
  // them as invalid input rather than loading a dead iframe.
  if (!/[a-zA-Z0-9]/.test(parsed.hostname)) return null;
  return parsed.href;
}

/**
 * Address-bar intent for the combined address+search bar: 'url' when the
 * input reads as a web address, 'search' for everything else (including
 * empty/garbage input — the UI guards empty queries itself).
 *
 * 'url' means: an explicit http(s) scheme, OR a schemeless input whose
 * normalized hostname contains a dot ("example.com", "hatcher.host/docs").
 * Dotless words ("rust", "how to center a div") are searches — navigating
 * to https://rust/ would only produce a dead iframe.
 *
 * Pure classifier so it is unit-testable: the Browser app navigates 'url'
 * input in-frame and hands 'search' input to an external engine in a NEW
 * TAB — Google, DuckDuckGo (html+lite) and Bing all send
 * X-Frame-Options/frame-ancestors, so an embedded results page can never
 * render (verified 2026-07-30).
 */
export function classifyBrowserInput(input: string): 'url' | 'search' {
  const trimmed = input.trim();
  if (!trimmed) return 'search';

  const normalized = normalizeBrowserUrl(trimmed);
  // Not navigable (no scheme+host that parses to http(s)) → search intent.
  if (!normalized) return 'search';

  // Explicit http(s) scheme is always an address, dot or not (e.g.
  // http://localhost:3000). Non-http(s) schemes never normalize, so they
  // cannot reach this branch.
  if (SCHEME_REGEX.test(trimmed)) return 'url';

  return new URL(normalized).hostname.includes('.') ? 'url' : 'search';
}
