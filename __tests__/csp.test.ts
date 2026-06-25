import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCsp } from '../lib/csp';

function getDirective(csp: string, name: string): string {
  return csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `)) ?? '';
}

describe('CSP', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not allow unsafe-inline in style-src outside development', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const csp = buildCsp('testnonce', false);

    expect(getDirective(csp, 'style-src')).toBe(
      "style-src 'self' 'nonce-testnonce' https://fonts.googleapis.com",
    );
    expect(getDirective(csp, 'style-src')).not.toContain("'unsafe-inline'");
    const styleSrcElem = getDirective(csp, 'style-src-elem');
    expect(styleSrcElem).toContain("'nonce-testnonce'");
    expect(styleSrcElem).not.toContain("'unsafe-inline'");
  });

  it('allows inline style elements only in development for Next dev runtime styles', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const csp = buildCsp('testnonce', false);

    expect(getDirective(csp, 'style-src')).toBe(
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    );
    expect(getDirective(csp, 'style-src-elem')).toBe(
      "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
    );
    expect(getDirective(csp, 'style-src')).not.toContain("'nonce-testnonce'");
    expect(getDirective(csp, 'style-src-elem')).not.toContain("'nonce-testnonce'");
  });

  it('does not allow blob scripts or the removed Qwerti widget origins', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const csp = buildCsp('testnonce', false);

    expect(getDirective(csp, 'script-src')).not.toContain('blob:');
    expect(csp).not.toContain('widget.qwerti.ai');
    expect(csp).not.toContain('api.qwerti.ai');
  });

  it('allows the Mirari dashboard embed origin in browser-facing directives', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const csp = buildCsp('testnonce', false);

    expect(getDirective(csp, 'frame-src')).toContain('https://entermirari.cloud');
    expect(getDirective(csp, 'connect-src')).toContain('https://entermirari.cloud');
    expect(getDirective(csp, 'img-src')).toContain('https://entermirari.cloud');
  });

  it('allows the configured public API origin in connect-src for alternate dev ports', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://172.29.246.51:3011');

    const csp = buildCsp('testnonce', false);

    expect(getDirective(csp, 'connect-src')).toContain('http://172.29.246.51:3011');
    expect(getDirective(csp, 'connect-src')).toContain('ws://172.29.246.51:3011');
  });

  it('allows the configured local API origin in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3101');

    const csp = buildCsp('testnonce', false);

    expect(getDirective(csp, 'connect-src')).toContain('http://localhost:3101');
    expect(getDirective(csp, 'connect-src')).toContain('ws://localhost:3101');
  });

  it('allows the default local API origin when running a production build locally', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    const csp = buildCsp('testnonce', false);

    expect(getDirective(csp, 'connect-src')).toContain('http://localhost:3001');
    expect(getDirective(csp, 'connect-src')).toContain('ws://localhost:3001');
  });
});
