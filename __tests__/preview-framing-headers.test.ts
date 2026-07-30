import { describe, expect, it } from 'vitest';
// @ts-expect-error -- Next's vendored path-to-regexp ships no type declarations.
import { pathToRegexp } from 'next/dist/compiled/path-to-regexp';
import nextConfig from '../next.config.mjs';

/**
 * Locks the next.config.mjs headers() carve-out for the agent preview proxy
 * (see the desktop Preview iframe fix): the global `X-Frame-Options: DENY`
 * block must NOT match `/api/agents/<id>/preview/<...path>` — the desktop
 * Preview app iframes that same-origin route and any XFO header blocks it —
 * while a dedicated block re-applies every other strict-default header to
 * that path. The sources are compiled with the same path-to-regexp Next
 * uses at build time, so these assertions track real routing semantics,
 * not string equality.
 */

interface HeaderBlock {
  source: string;
  headers: { key: string; value: string }[];
}

const PREVIEW_SOURCE = '/api/agents/:agentId/preview/:path+';
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

function keysOf(block: HeaderBlock): string[] {
  return block.headers.map((h) => h.key).sort();
}

describe('preview proxy framing-header carve-out (next.config.mjs)', () => {
  it('keeps X-Frame-Options in exactly one block, and that block skips the preview proxy path', async () => {
    const blocks = await loadBlocks();
    const xfoBlocks = blocks.filter((b) => b.headers.some((h) => h.key === 'X-Frame-Options'));
    expect(xfoBlocks).toHaveLength(1);

    const strict = xfoBlocks[0];
    expect(matches(strict.source, PREVIEW_PATH)).toBe(false);
  });

  it('still applies the strict block (XFO DENY) everywhere outside /embed and the preview proxy', async () => {
    const blocks = await loadBlocks();
    const strict = blocks.find((b) => b.headers.some((h) => h.key === 'X-Frame-Options'))!;

    // Regular pages and API routes keep the frame-blocking defaults.
    expect(matches(strict.source, '/')).toBe(true);
    expect(matches(strict.source, '/dashboard/agent/abc123/desktop')).toBe(true);
    expect(matches(strict.source, '/api/agents/agent_1/settings')).toBe(true);
    // Near-miss paths must NOT ride the carve-out: a sibling route that
    // merely starts with "preview", and the bare /preview URL (the route's
    // [...path] catch-all requires at least one segment).
    expect(matches(strict.source, '/api/agents/agent_1/previewfoo/bar')).toBe(true);
    expect(matches(strict.source, '/api/agents/agent_1/preview')).toBe(true);
    // The embed exception is unchanged.
    expect(matches(strict.source, '/embed/tv/x')).toBe(false);
  });

  it('serves the preview proxy path the strict headers minus X-Frame-Options via a dedicated block', async () => {
    const blocks = await loadBlocks();
    const preview = blocks.find((b) => b.source === PREVIEW_SOURCE);
    expect(preview).toBeDefined();

    // The dedicated source matches exactly the tokenized preview URLs.
    expect(matches(PREVIEW_SOURCE, PREVIEW_PATH)).toBe(true);
    expect(matches(PREVIEW_SOURCE, '/api/agents/agent_1/preview')).toBe(false);
    expect(matches(PREVIEW_SOURCE, '/api/agents/agent_1/previewfoo/bar')).toBe(false);
    expect(matches(PREVIEW_SOURCE, '/api/agents/agent_1/settings')).toBe(false);

    // No frame-blocking header, no CSP (the route handler owns CSP)...
    const previewKeys = keysOf(preview!);
    expect(previewKeys).not.toContain('X-Frame-Options');
    expect(previewKeys).not.toContain('Content-Security-Policy');

    // ...but every other strict-default header still applies to the path.
    const strict = blocks.find((b) => b.headers.some((h) => h.key === 'X-Frame-Options'))!;
    const strictKeysMinusXfo = keysOf(strict).filter((k) => k !== 'X-Frame-Options');
    expect(previewKeys).toEqual(strictKeysMinusXfo);
    for (const header of preview!.headers) {
      const strictTwin = strict.headers.find((h) => h.key === header.key);
      expect(strictTwin?.value).toBe(header.value);
    }
  });
});
