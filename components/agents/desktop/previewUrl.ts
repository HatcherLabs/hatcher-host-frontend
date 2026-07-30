/**
 * Frontend-origin proxy URL for the sandboxed app-preview iframe. Points at
 * this app's own preview proxy route (never the API origin directly) — the
 * route forwards no cookies or auth headers, since the token in the path is
 * itself the credential for the unauthenticated upstream preview endpoint.
 */
export function buildPreviewProxyUrl(agentId: string, token: string, path = 'index.html'): string {
  const cleanPath = path.replace(/^\/+/, '');
  return `/api/agents/${encodeURIComponent(agentId)}/preview/t/${encodeURIComponent(token)}/${cleanPath}`;
}
