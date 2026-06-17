import { describe, expect, it } from 'vitest';
import {
  isWalletTrustRevokedError,
  isWalletUserCancellationError,
} from '@/lib/wallet-errors';

describe('wallet error classification', () => {
  it('detects Phantom trust-revoked errors without treating user rejection as reconnectable', () => {
    expect(isWalletTrustRevokedError(new Error('The requested account has not been authorized'))).toBe(true);
    expect(isWalletTrustRevokedError(new Error('Unauthorized for this operation'))).toBe(true);
    expect(isWalletTrustRevokedError(new Error('User rejected the request'))).toBe(false);
  });

  it('detects wallet popup cancellations', () => {
    expect(isWalletUserCancellationError(new Error('User rejected the request'))).toBe(true);
    expect(isWalletUserCancellationError(new Error('Request cancelled'))).toBe(true);
    expect(isWalletUserCancellationError(new Error('The requested account has not been authorized'))).toBe(false);
  });
});
