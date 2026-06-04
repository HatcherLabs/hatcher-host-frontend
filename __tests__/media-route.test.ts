import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeRequest(url: string, headers?: HeadersInit): NextRequest {
  return new NextRequest(url, { headers });
}

async function loadRoute() {
  vi.resetModules();
  return import('@/app/api/agents/[agentId]/media/route');
}

describe('agent media proxy route', () => {
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

  it('forces active content to download with a sandbox CSP', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response('<script>alert(1)</script>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }));
    const { GET } = await loadRoute();

    const response = await GET(
      makeRequest('https://hatcher.host/api/agents/agent_1/media?path=%2Ftmp%2Freport.html'),
      { params: Promise.resolve({ agentId: 'agent_1' }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="report.html"');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('keeps passive image media inline', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response('png', {
      status: 200,
      headers: { 'content-type': 'image/png' },
    }));
    const { GET } = await loadRoute();

    const response = await GET(
      makeRequest('https://hatcher.host/api/agents/agent_1/media?path=%2Ftmp%2Fimage.png'),
      { params: Promise.resolve({ agentId: 'agent_1' }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toBe('inline; filename="image.png"');
  });
});
