import { describe, expect, it } from 'vitest';
import { isAuthorizedBurnRefreshRequest } from '../lib/token-burn-refresh';

describe('token burn route refresh authorization', () => {
  it('does not allow public refresh bypass without a server token', () => {
    expect(isAuthorizedBurnRefreshRequest(null, undefined)).toBe(false);
    expect(isAuthorizedBurnRefreshRequest('Bearer anything', undefined)).toBe(false);
  });

  it('requires the exact server refresh bearer token', () => {
    expect(isAuthorizedBurnRefreshRequest('Bearer burn-refresh-secret', 'burn-refresh-secret')).toBe(true);
    expect(isAuthorizedBurnRefreshRequest('Bearer wrong', 'burn-refresh-secret')).toBe(false);
    expect(isAuthorizedBurnRefreshRequest('burn-refresh-secret', 'burn-refresh-secret')).toBe(false);
  });
});
