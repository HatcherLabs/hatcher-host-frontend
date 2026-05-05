import { describe, expect, it } from 'vitest';
import { loginHrefForReturn, sanitizeLocalReturnPath } from '@/lib/safe-redirect';

describe('safe redirects', () => {
  it('keeps local return paths with query strings', () => {
    expect(sanitizeLocalReturnPath('/dashboard/billing?upgrade=pro')).toBe(
      '/dashboard/billing?upgrade=pro',
    );
  });

  it('rejects external and protocol-relative return paths', () => {
    expect(sanitizeLocalReturnPath('https://example.com')).toBe('/dashboard');
    expect(sanitizeLocalReturnPath('//example.com')).toBe('/dashboard');
  });

  it('rejects auth routes with or without locale prefixes', () => {
    expect(sanitizeLocalReturnPath('/login')).toBe('/dashboard');
    expect(sanitizeLocalReturnPath('/ro/register')).toBe('/dashboard');
  });

  it('builds encoded login return links from sanitized paths', () => {
    expect(loginHrefForReturn('/dashboard/billing?upgrade=starter')).toBe(
      '/login?return=%2Fdashboard%2Fbilling%3Fupgrade%3Dstarter',
    );
  });
});
