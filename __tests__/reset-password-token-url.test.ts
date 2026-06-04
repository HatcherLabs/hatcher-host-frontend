import { describe, expect, it } from 'vitest';
import {
  buildResetPasswordTokenRedirectUrl,
  buildSensitiveAuthTokenRedirectUrl,
  cleanResetPasswordUrl,
  cleanSensitiveAuthTokenUrl,
  tokenFromResetPasswordHash,
  tokenFromSensitiveAuthHash,
} from '../lib/reset-password-token-url';

describe('reset password token URL handling', () => {
  it('extracts reset tokens from URL fragments', () => {
    expect(tokenFromResetPasswordHash('#token=abc123')).toBe('abc123');
    expect(tokenFromResetPasswordHash('#token=abc%20123')).toBe('abc 123');
    expect(tokenFromResetPasswordHash('#step=reset')).toBeNull();
    expect(tokenFromSensitiveAuthHash('#token=verify-token')).toBe('verify-token');
  });

  it('removes reset tokens from query strings while preserving other params', () => {
    expect(cleanResetPasswordUrl('/reset-password', '?token=secret')).toBe('/reset-password');
    expect(cleanResetPasswordUrl('/reset-password', '?token=secret&next=login')).toBe(
      '/reset-password?next=login',
    );
    expect(cleanSensitiveAuthTokenUrl('/verify-email', '?token=secret&utm=email')).toBe(
      '/verify-email?utm=email',
    );
  });

  it('builds a middleware redirect that moves token query into fragment', () => {
    const target = buildResetPasswordTokenRedirectUrl(
      new URL('https://hatcher.host/ro/reset-password?token=secret-token&utm=email'),
      (pathname) => pathname === '/ro/reset-password',
    );

    expect(target?.toString()).toBe(
      'https://hatcher.host/ro/reset-password?utm=email#token=secret-token',
    );
  });

  it('builds the same middleware redirect for email verification links', () => {
    const target = buildSensitiveAuthTokenRedirectUrl(
      new URL('https://hatcher.host/en/verify-email?token=verify-token&utm=email'),
      (pathname) => pathname === '/en/verify-email',
    );

    expect(target?.toString()).toBe(
      'https://hatcher.host/en/verify-email?utm=email#token=verify-token',
    );
  });
});
