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
    expect(getDirective(csp, 'style-src-elem')).toContain("'nonce-testnonce'");
  });
});
