export function tokenFromSensitiveAuthHash(hash: string): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return null;
  const params = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);
  const token = params.get('token');
  return token && token.trim() ? token : null;
}

export function cleanSensitiveAuthTokenUrl(pathname: string, search: string): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  params.delete('token');
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function buildSensitiveAuthTokenRedirectUrl(
  currentUrl: URL,
  isSensitiveTokenPath: (pathname: string) => boolean,
): URL | null {
  if (!isSensitiveTokenPath(currentUrl.pathname)) return null;
  const token = currentUrl.searchParams.get('token');
  if (!token) return null;

  const target = new URL(currentUrl.toString());
  target.searchParams.delete('token');
  target.hash = `token=${encodeURIComponent(token)}`;
  return target;
}

export const tokenFromResetPasswordHash = tokenFromSensitiveAuthHash;
export const cleanResetPasswordUrl = cleanSensitiveAuthTokenUrl;
export const buildResetPasswordTokenRedirectUrl = buildSensitiveAuthTokenRedirectUrl;
