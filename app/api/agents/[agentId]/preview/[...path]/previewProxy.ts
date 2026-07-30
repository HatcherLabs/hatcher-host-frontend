/**
 * Pure helpers behind the agent preview proxy route (`route.ts` next to this
 * file). Kept in a separate module because Next.js route files only allow a
 * fixed set of named exports (GET/POST/runtime/dynamic/...) — anything else
 * exported from `route.ts` fails the build's route-type validation.
 */

/**
 * Upstream preview URL: `<API_BASE>/agents/<agentId>/preview/<...path>`. The
 * path segments already include `t/<token>/...` — the token in the path is
 * the credential, so the route forwards no auth headers and no cookies. Pure
 * so the URL mapping (segment join, no double slashes) is unit-testable
 * without a request harness.
 */
export function buildPreviewUpstreamUrl(apiBase: string, agentId: string, pathSegments: string[]): URL {
  const suffix = pathSegments
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return new URL(`/agents/${encodeURIComponent(agentId)}/preview${suffix ? `/${suffix}` : ''}`, apiBase);
}

/**
 * Response headers for the proxied body. Only `content-type` is copied from
 * upstream — every other upstream header (including any `x-frame-options`)
 * is dropped by construction, never forwarded. HTML documents get a
 * sandboxed CSP so agent-authored pages render with an opaque origin: no
 * cookies, no access to the parent DOM. `frame-ancestors 'self'` matches
 * the sitewide SAMEORIGIN framing policy (next.config.mjs sets
 * `X-Frame-Options: SAMEORIGIN` on this path like everywhere else) — the
 * route-level directive is redundant defense in depth kept on purpose:
 * our own pages — the desktop Preview window — may iframe the proxy,
 * third-party sites may not. This is the security boundary — do not
 * weaken it.
 */
export function buildPreviewResponseHeaders(contentType: string | null): Headers {
  const headers = new Headers();
  if (contentType) headers.set('content-type', contentType);
  headers.set('cache-control', 'no-store');
  const mimeType = (contentType ?? '').toLowerCase().split(';', 1)[0]?.trim();
  if (mimeType === 'text/html') {
    headers.set('content-security-policy', "sandbox allow-scripts allow-forms; frame-ancestors 'self'");
  }
  return headers;
}
