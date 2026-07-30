import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- Next's vendored path-to-regexp ships no type declarations.
import { pathToRegexp } from 'next/dist/compiled/path-to-regexp';
import nextConfig from '../next.config.mjs';

/**
 * Locks the next.config.mjs headers() framing policy (owner-approved,
 * 2026-07-30): every non-embed path — INCLUDING the tokenized agent preview
 * proxy — carries `X-Frame-Options: SAMEORIGIN`. Only hatcher.host pages may
 * frame hatcher.host pages; external framing stays fully blocked; /embed/*
 * keeps its deliberate no-XFO exception.
 *
 * This deliberately REVERTS the previous DENY-plus-preview-carve-out shape:
 * under SAMEORIGIN the desktop frames the preview same-origin, so no
 * dedicated `/api/agents/:agentId/preview/:path+` block may exist (its
 * lookahead also carried a case-sensitivity gap). The sources are compiled
 * with the same path-to-regexp Next uses at build time, so these assertions
 * track real routing semantics, not string equality.
 */

interface HeaderBlock {
  source: string;
  headers: { key: string; value: string }[];
}

const PREVIEW_PATH = '/api/agents/agent_1/preview/t/tok_abc/index.html';

async function loadBlocks(): Promise<HeaderBlock[]> {
  const config = nextConfig as unknown as {
    headers: () => Promise<HeaderBlock[]>;
  };
  return config.headers();
}

function matches(source: string, path: string): boolean {
  return (pathToRegexp(source) as RegExp).test(path);
}

function xfoValue(block: HeaderBlock): string | undefined {
  return block.headers.find((h) => h.key === 'X-Frame-Options')?.value;
}

describe('sitewide framing policy (next.config.mjs)', () => {
  it('sets X-Frame-Options to SAMEORIGIN (never DENY) in exactly one strict block', async () => {
    const blocks = await loadBlocks();
    const xfoBlocks = blocks.filter((b) => xfoValue(b) !== undefined);
    expect(xfoBlocks).toHaveLength(1);
    expect(xfoValue(xfoBlocks[0])).toBe('SAMEORIGIN');
  });

  it('applies SAMEORIGIN everywhere outside /embed — including the tokenized preview proxy path', async () => {
    const blocks = await loadBlocks();
    const strict = blocks.find((b) => xfoValue(b) !== undefined)!;

    for (const path of [
      '/',
      '/dashboard/agent/abc123',
      '/dashboard/agent/abc123/desktop',
      '/api/agents/agent_1/settings',
      // The preview proxy is back under the strict block on purpose: the
      // desktop frames it same-origin, which SAMEORIGIN permits.
      PREVIEW_PATH,
      '/api/agents/agent_1/preview',
      '/api/agents/agent_1/previewfoo/bar',
      // Case variants must not dodge the policy (the reverted lookahead
      // carved out lowercase `preview/` only — that gap is now closed).
      '/API/AGENTS/AGENT_1/PREVIEW/t/tok_abc/index.html',
    ]) {
      expect(matches(strict.source, path), `expected strict block to match ${path}`).toBe(true);
    }

    // The embed exception is unchanged: no X-Frame-Options there.
    expect(matches(strict.source, '/embed/tv/x')).toBe(false);
  });

  it('has no dedicated preview-proxy header block anymore (Task 11 carve-out reverted)', async () => {
    const blocks = await loadBlocks();
    const previewBlocks = blocks.filter((b) => b.source.includes('preview'));
    expect(previewBlocks).toEqual([]);
    // ...and the strict source no longer excludes anything but /embed.
    const strict = blocks.find((b) => xfoValue(b) !== undefined)!;
    expect(strict.source).toBe('/((?!embed).*)');
  });

  it('keeps the /embed block XFO-free so third-party embedding still works', async () => {
    const blocks = await loadBlocks();
    const embed = blocks.find((b) => b.source.startsWith('/embed'));
    expect(embed).toBeDefined();
    expect(xfoValue(embed!)).toBeUndefined();
    expect(matches(embed!.source, '/embed/tv/x')).toBe(true);
  });
});

describe('middleware framing policy (source lock)', () => {
  // middleware.ts sets the same header on every response it touches;
  // its withSecurityHeaders helper is not exported, so lock the emitted
  // value at source level: SAMEORIGIN, never DENY. The CSP side of the
  // middleware policy (frame-ancestors 'self'/'*') is value-asserted
  // against the real buildCsp() in __tests__/csp.test.ts.
  const source = readFileSync(join(__dirname, '..', 'middleware.ts'), 'utf8');

  it('sets X-Frame-Options: SAMEORIGIN on non-embed responses and never DENY', () => {
    expect(source).toContain("response.headers.set('X-Frame-Options', 'SAMEORIGIN')");
    expect(source).not.toMatch(/X-Frame-Options'\s*,\s*'DENY'/);
  });
});
