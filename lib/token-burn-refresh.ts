const REFRESH_TOKEN_ENV = 'TOKEN_BURN_REFRESH_TOKEN';

export function isAuthorizedBurnRefreshRequest(
  authorization: string | null,
  refreshToken = process.env[REFRESH_TOKEN_ENV],
): boolean {
  if (!refreshToken) return false;
  return authorization === `Bearer ${refreshToken}`;
}
