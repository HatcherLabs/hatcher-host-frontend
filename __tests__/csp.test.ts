import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCsp, isAgentDesktopRoute } from '../lib/csp';
import {
  QWERTI_WIDGET_ORIGIN,
  QWERTI_WIDGET_SCRIPT_CSP_HASH,
} from '../lib/qwerti-widget';

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

  it('allows only the integrity-pinned Qwerti core on the landing route', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const landingCsp = buildCsp('testnonce', false, true);
    const otherRouteCsp = buildCsp('testnonce', false);

    expect(getDirective(landingCsp, 'script-src')).not.toContain('blob:');
    expect(getDirective(landingCsp, 'script-src')).toContain(QWERTI_WIDGET_SCRIPT_CSP_HASH);
    expect(getDirective(landingCsp, 'script-src')).not.toContain(QWERTI_WIDGET_ORIGIN);
    expect(getDirective(landingCsp, 'connect-src')).not.toContain(QWERTI_WIDGET_ORIGIN);
    expect(getDirective(landingCsp, 'connect-src')).toContain('https://api.qwerti.ai');
    expect(getDirective(landingCsp, 'font-src')).toContain(QWERTI_WIDGET_ORIGIN);
    expect(getDirective(landingCsp, 'style-src-elem')).toContain("'unsafe-inline'");

    expect(otherRouteCsp).not.toContain(QWERTI_WIDGET_SCRIPT_CSP_HASH);
    expect(otherRouteCsp).not.toContain(QWERTI_WIDGET_ORIGIN);
    expect(otherRouteCsp).not.toContain('api.qwerti.ai');
    expect(getDirective(otherRouteCsp, 'style-src-elem')).not.toContain("'unsafe-inline'");
  });

  it('does not allow removed Google advertising runtimes', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const csp = buildCsp('testnonce', false);

    expect(csp).not.toContain('googletagmanager.com');
    expect(csp).not.toContain('google-analytics.com');
    expect(csp).not.toContain('doubleclick.net');
    expect(csp).not.toContain('googleadservices.com');
    expect(csp).not.toContain('googlesyndication.com');
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

  it('relaxes frame-src to any https origin on the agent desktop route only', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const desktopCsp = buildCsp('testnonce', false, false, true);

    // Token-level check: `https:` must be a standalone source, not a
    // substring of the allowlisted https://... origins.
    const frameSources = getDirective(desktopCsp, 'frame-src').split(/\s+/);
    expect(frameSources).toContain('https:');
    // The pre-existing allowlist stays present alongside the relaxation.
    expect(frameSources).toContain("'self'");
    expect(frameSources).toContain('https://www.tradingview.com');
  });

  it('keeps the strict frame-src allowlist on every non-desktop route', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const normalCsp = buildCsp('testnonce', false);
    const embedCsp = buildCsp('testnonce', true);

    expect(getDirective(normalCsp, 'frame-src').split(/\s+/)).not.toContain('https:');
    expect(getDirective(embedCsp, 'frame-src').split(/\s+/)).not.toContain('https:');
  });

  it('changes nothing but frame-src for the desktop route', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const desktopCsp = buildCsp('testnonce', false, false, true);
    const normalCsp = buildCsp('testnonce', false);

    const stripFrameSrc = (csp: string) =>
      csp
        .split(';')
        .map((part) => part.trim())
        .filter((part) => !part.startsWith('frame-src '));
    expect(stripFrameSrc(desktopCsp)).toEqual(stripFrameSrc(normalCsp));
    // The desktop is an authenticated app page — only our own pages may
    // frame it (sitewide SAMEORIGIN posture), never a third party.
    expect(getDirective(desktopCsp, 'frame-ancestors')).toBe("frame-ancestors 'self'");
  });

  it("locks the sitewide framing policy: frame-ancestors 'self' everywhere, * only on /embed", () => {
    // Owner-approved policy change (2026-07-30): 'self', not 'none' — only
    // hatcher.host pages may frame hatcher.host pages; external framing
    // stays fully blocked. Value assertions on every buildCsp variant so a
    // regression to 'none' (breaks the desktop windows) or a widening to *
    // (clickjacking exposure) both fail loudly.
    vi.stubEnv('NODE_ENV', 'production');
    const normalCsp = buildCsp('testnonce', false);
    const landingCsp = buildCsp('testnonce', false, true);
    const desktopCsp = buildCsp('testnonce', false, false, true);
    const embedCsp = buildCsp('testnonce', true);

    expect(getDirective(normalCsp, 'frame-ancestors')).toBe("frame-ancestors 'self'");
    expect(getDirective(landingCsp, 'frame-ancestors')).toBe("frame-ancestors 'self'");
    expect(getDirective(desktopCsp, 'frame-ancestors')).toBe("frame-ancestors 'self'");
    // /embed/* is the one deliberate exception: third-party embeddable.
    expect(getDirective(embedCsp, 'frame-ancestors')).toBe('frame-ancestors *');
    // 'none' must be gone in every variant — it would blank the desktop's
    // same-origin Settings/Preview iframes.
    for (const csp of [normalCsp, landingCsp, desktopCsp, embedCsp]) {
      expect(getDirective(csp, 'frame-ancestors')).not.toContain("'none'");
    }
  });
});

describe('isAgentDesktopRoute', () => {
  it('matches only the agent desktop page (locale-stripped path)', () => {
    expect(isAgentDesktopRoute('/dashboard/agent/abc123/desktop')).toBe(true);
    expect(isAgentDesktopRoute('/dashboard/agent/abc123/desktop/')).toBe(true);
  });

  it('does not match any other route', () => {
    expect(isAgentDesktopRoute('/dashboard/agent/abc123')).toBe(false);
    expect(isAgentDesktopRoute('/dashboard/agent/abc123/desktop/extra')).toBe(false);
    expect(isAgentDesktopRoute('/dashboard/agent//desktop')).toBe(false);
    expect(isAgentDesktopRoute('/dashboard/agent/desktop')).toBe(false);
    expect(isAgentDesktopRoute('/desktop')).toBe(false);
    expect(isAgentDesktopRoute('/')).toBe(false);
    expect(isAgentDesktopRoute('/embed/tv/x')).toBe(false);
  });
});
