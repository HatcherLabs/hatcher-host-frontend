import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPreviewResponseHeaders, buildPreviewUpstreamUrl } from '@/app/api/agents/[agentId]/preview/[...path]/previewProxy';

function makeRequest(url: string, headers?: HeadersInit): NextRequest {
  return new NextRequest(url, { headers });
}

async function loadRoute() {
  vi.resetModules();
  return import('@/app/api/agents/[agentId]/preview/[...path]/route');
}

describe('buildPreviewUpstreamUrl', () => {
  it('joins path segments with single slashes and no trailing slash for an empty path', () => {
    expect(buildPreviewUpstreamUrl('https://api.hatcher.host', 'agent_1', []).toString())
      .toBe('https://api.hatcher.host/agents/agent_1/preview');
  });

  it('joins multi-segment paths without introducing double slashes', () => {
    expect(buildPreviewUpstreamUrl('https://api.hatcher.host', 'agent_1', ['t', 'tok_abc', 'index.html']).toString())
      .toBe('https://api.hatcher.host/agents/agent_1/preview/t/tok_abc/index.html');
  });

  it('encodes the agent id and each path segment', () => {
    expect(buildPreviewUpstreamUrl('https://api.hatcher.host', 'agent 1', ['t', 'tok/abc']).toString())
      .toBe('https://api.hatcher.host/agents/agent%201/preview/t/tok%2Fabc');
  });

  it('drops empty segments so they cannot introduce double slashes', () => {
    expect(buildPreviewUpstreamUrl('https://api.hatcher.host', 'agent_1', ['t', '', 'tok_abc']).toString())
      .toBe('https://api.hatcher.host/agents/agent_1/preview/t/tok_abc');
  });
});

describe('buildPreviewResponseHeaders', () => {
  it('sets the sandbox CSP for html responses and always sets cache-control: no-store', () => {
    const headers = buildPreviewResponseHeaders('text/html; charset=utf-8');
    expect(headers.get('content-security-policy')).toBe("sandbox allow-scripts allow-forms; frame-ancestors 'self'");
    expect(headers.get('cache-control')).toBe('no-store');
    expect(headers.get('content-type')).toBe('text/html; charset=utf-8');
  });

  it('does not set a CSP for non-html responses', () => {
    const headers = buildPreviewResponseHeaders('application/json');
    expect(headers.get('content-security-policy')).toBeNull();
    expect(headers.get('cache-control')).toBe('no-store');
  });

  it('handles a missing content-type without setting the header', () => {
    const headers = buildPreviewResponseHeaders(null);
    expect(headers.has('content-type')).toBe(false);
    expect(headers.get('content-security-policy')).toBeNull();
    expect(headers.get('cache-control')).toBe('no-store');
  });
});

describe('agent preview proxy route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.hatcher.host');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('requests the upstream with the joined path and forwards no cookies or authorization', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response('<html></html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }));
    const { GET } = await loadRoute();

    await GET(
      makeRequest('https://hatcher.host/api/agents/agent_1/preview/t/tok_abc/index.html', {
        cookie: 'session=secret',
        authorization: 'Bearer abc',
      }),
      { params: Promise.resolve({ agentId: 'agent_1', path: ['t', 'tok_abc', 'index.html'] }) },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(String(calledUrl)).toBe('https://api.hatcher.host/agents/agent_1/preview/t/tok_abc/index.html');
    const headerBag = new Headers((calledInit as RequestInit | undefined)?.headers);
    expect(headerBag.has('cookie')).toBe(false);
    expect(headerBag.has('authorization')).toBe(false);
  });

  it('sets a sandboxed CSP and strips any upstream x-frame-options on html responses', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response('<html></html>', {
      status: 200,
      headers: { 'content-type': 'text/html', 'x-frame-options': 'DENY' },
    }));
    const { GET } = await loadRoute();

    const response = await GET(
      makeRequest('https://hatcher.host/api/agents/agent_1/preview/t/tok_abc/index.html'),
      { params: Promise.resolve({ agentId: 'agent_1', path: ['t', 'tok_abc', 'index.html'] }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-security-policy')).toBe("sandbox allow-scripts allow-forms; frame-ancestors 'self'");
    expect(response.headers.get('x-frame-options')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('passes a 401 (bad/expired token) through with no CSP forced', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'invalid token' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    }));
    const { GET } = await loadRoute();

    const response = await GET(
      makeRequest('https://hatcher.host/api/agents/agent_1/preview/t/bad_token/index.html'),
      { params: Promise.resolve({ agentId: 'agent_1', path: ['t', 'bad_token', 'index.html'] }) },
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('content-security-policy')).toBeNull();
  });

  it('passes a 404 (missing file) hint page through with the sandbox CSP', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response('<p>not found</p>', {
      status: 404,
      headers: { 'content-type': 'text/html' },
    }));
    const { GET } = await loadRoute();

    const response = await GET(
      makeRequest('https://hatcher.host/api/agents/agent_1/preview/t/tok_abc/missing.html'),
      { params: Promise.resolve({ agentId: 'agent_1', path: ['t', 'tok_abc', 'missing.html'] }) },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get('content-security-policy')).toBe("sandbox allow-scripts allow-forms; frame-ancestors 'self'");
  });
});
