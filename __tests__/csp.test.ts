import { describe, expect, it } from 'vitest';
import { buildCsp } from '../lib/csp';

function getDirective(csp: string, name: string): string {
  return csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `)) ?? '';
}

describe('CSP', () => {
  it('does not allow unsafe-inline in style-src', () => {
    const csp = buildCsp('testnonce', false);

    expect(getDirective(csp, 'style-src')).toBe(
      "style-src 'self' 'nonce-testnonce' https://fonts.googleapis.com",
    );
    expect(getDirective(csp, 'style-src')).not.toContain("'unsafe-inline'");
    const styleSrcElem = getDirective(csp, 'style-src-elem');
    expect(styleSrcElem).toContain("'nonce-testnonce'");
    expect(styleSrcElem).toContain("'sha256-3KQmY3oxUjLH8M8dw7cRfJ2fZKou4xt/V2t2FD3AECs='");
    expect(styleSrcElem).not.toContain("'unsafe-inline'");
  });
});
