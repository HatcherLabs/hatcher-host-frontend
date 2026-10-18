import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import middleware from '../middleware';

describe('explicit English preference', () => {
  it('resets a non-English cookie on every visit without caching the redirect', () => {
    const request = new NextRequest('https://hatcher.host/en?conversation=chat-1&_locale=en', {
      headers: { cookie: 'HATCHER_LOCALE=ro' },
    });
    const response = middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.cookies.get('HATCHER_LOCALE')?.value).toBe('en');
    const target = new URL(response.headers.get('location')!);
    expect(target.pathname).toBe('/');
    expect(target.searchParams.get('conversation')).toBe('chat-1');
    expect(target.searchParams.has('_locale')).toBe(false);
  });
});
