import dns from 'node:dns/promises';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:dns/promises', () => ({
  default: {
    lookup: vi.fn(),
  },
}));

const mockedDns = vi.mocked(dns);
const publicDnsRecords = [{ address: '93.184.216.34', family: 4 }] as never;
const privateDnsRecords = [{ address: '127.0.0.1', family: 4 }] as never;

function makeRequest(url: string, headers?: HeadersInit): NextRequest {
  return new NextRequest(url, { headers });
}

async function loadRoute() {
  vi.resetModules();
  return import('@/app/api/artifacts/download/route');
}

describe('artifact download route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.hatcher.host');
    vi.stubGlobal('fetch', vi.fn());
    mockedDns.lookup.mockResolvedValue(publicDnsRecords);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated external downloads before fetching the attacker URL', async () => {
    const fetchMock = vi.mocked(fetch);
    const { GET } = await loadRoute();

    const response = await GET(makeRequest(
      'https://hatcher.host/api/artifacts/download?url=https%3A%2F%2Fexample.com',
    ));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Authentication required' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedDns.lookup).not.toHaveBeenCalled();
  });

  it('blocks authenticated requests to non-allowlisted hosts', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(Response.json({ success: true, data: { id: 'user_1' } }));
    const { GET } = await loadRoute();

    const response = await GET(makeRequest(
      'https://hatcher.host/api/artifacts/download?url=https%3A%2F%2Fexample.com%2Freport.pdf',
      { authorization: 'Bearer hk_test' },
    ));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Artifact host is not allowed' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://api.hatcher.host/auth/me');
    expect(mockedDns.lookup).not.toHaveBeenCalled();
  });

  it('blocks private IP destinations even when the host is allowlisted', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(Response.json({ success: true, data: { id: 'user_1' } }));
    mockedDns.lookup.mockResolvedValueOnce(privateDnsRecords);
    const { GET } = await loadRoute();

    const response = await GET(makeRequest(
      'https://hatcher.host/api/artifacts/download?url=https%3A%2F%2Fv3.fal.media%2Fartifact.txt',
      { authorization: 'Bearer hk_test' },
    ));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Artifact host is not allowed' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('hard-blocks Hatcher-owned hosts so the proxy cannot probe internal APIs', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(Response.json({ success: true, data: { id: 'user_1' } }));
    const { GET } = await loadRoute();

    const response = await GET(makeRequest(
      'https://hatcher.host/api/artifacts/download?url=https%3A%2F%2Fapi.hatcher.host%2Fauth%2Fsession',
      { authorization: 'Bearer hk_test' },
    ));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Artifact host is not allowed' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockedDns.lookup).not.toHaveBeenCalled();
  });

  it('allows authenticated downloads from allowlisted public artifact hosts', async () => {
    const body = 'artifact body';
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(Response.json({ success: true, data: { id: 'user_1' } }))
      .mockResolvedValueOnce(new Response(body, {
        status: 200,
        headers: {
          'content-type': 'text/plain',
          'content-length': String(body.length),
        },
      }));
    const { GET } = await loadRoute();

    const response = await GET(makeRequest(
      'https://hatcher.host/api/artifacts/download?url=https%3A%2F%2Fv3.fal.media%2Fartifact.txt&filename=report.txt',
      { authorization: 'Bearer hk_test' },
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="report.txt"');
    expect(response.headers.get('content-type')).toBe('text/plain');
    expect(await response.text()).toBe(body);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe('https://v3.fal.media/artifact.txt');
  });
});
