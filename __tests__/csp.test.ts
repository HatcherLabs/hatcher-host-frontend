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
    expect(styleSrcElem).not.toContain("'unsafe-inline'");
  });

  it('does not allow blob scripts or the removed Qwerti widget origins', () => {
    const csp = buildCsp('testnonce', false);

    expect(getDirective(csp, 'script-src')).not.toContain('blob:');
    expect(csp).not.toContain('widget.qwerti.ai');
    expect(csp).not.toContain('api.qwerti.ai');
  });
});
