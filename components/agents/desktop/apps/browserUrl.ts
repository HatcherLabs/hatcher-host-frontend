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
