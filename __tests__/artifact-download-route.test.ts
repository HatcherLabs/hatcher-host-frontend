import dns from 'node:dns/promises';
import { EventEmitter } from 'node:events';
import type { IncomingMessage } from 'node:http';
import https from 'node:https';
import type { RequestOptions } from 'node:https';
import { PassThrough } from 'node:stream';
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

function mockArtifactResponse(
  body: string,
  options: { status?: number; headers?: Record<string, string> } = {},
): void {
  vi.spyOn(https, 'request').mockImplementationOnce(((
    _requestOptions: string | URL | RequestOptions,
    callback?: (response: IncomingMessage) => void,
  ) => {
    const request = Object.assign(new EventEmitter(), {
      setTimeout: vi.fn(),
      destroy: vi.fn(),
      end: vi.fn(),
    });
    request.setTimeout.mockReturnValue(request);
    request.end.mockImplementation(() => {
      const stream = new PassThrough();
      const upstream = stream as unknown as IncomingMessage;
      upstream.statusCode = options.status ?? 200;
      upstream.statusMessage = 'OK';
      upstream.headers = options.headers ?? {};
      callback?.(upstream);
      stream.end(body);
    });
    return request;
  }) as unknown as typeof https.request);
}

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

  it('rejects plain http artifact URLs before DNS or upstream fetch', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(Response.json({ success: true, data: { id: 'user_1' } }));
    const { GET } = await loadRoute();

    const response = await GET(makeRequest(
      'https://hatcher.host/api/artifacts/download?url=http%3A%2F%2Fv3.fal.media%2Fartifact.txt',
      { authorization: 'Bearer hk_test' },
    ));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Only https artifact URLs are supported' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

  it('blocks private IPv4 destinations encoded as IPv6-mapped addresses', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(Response.json({ success: true, data: { id: 'user_1' } }));
    mockedDns.lookup.mockResolvedValueOnce([
      { address: '::ffff:7f00:1', family: 6 },
    ] as never);
    const requestSpy = vi.spyOn(https, 'request');
    const { GET } = await loadRoute();

    const response = await GET(makeRequest(
      'https://hatcher.host/api/artifacts/download?url=https%3A%2F%2Fv3.fal.media%2Fartifact.txt',
      { authorization: 'Bearer hk_test' },
    ));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Artifact host is not allowed' });
    expect(requestSpy).not.toHaveBeenCalled();
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
    fetchMock.mockResolvedValueOnce(Response.json({ success: true, data: { id: 'user_1' } }));
    mockArtifactResponse(body, {
      headers: {
        'content-type': 'text/plain',
        'content-length': String(body.length),
      },
    });
    const { GET } = await loadRoute();

    const response = await GET(makeRequest(
      'https://hatcher.host/api/artifacts/download?url=https%3A%2F%2Fv3.fal.media%2Fartifact.txt&filename=report.txt',
      { authorization: 'Bearer hk_test' },
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="report.txt"');
    expect(response.headers.get('content-type')).toBe('text/plain');
    expect(await response.text()).toBe(body);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(https.request).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: '93.184.216.34',
        servername: 'v3.fal.media',
        path: '/artifact.txt',
        headers: expect.objectContaining({ host: 'v3.fal.media' }),
      }),
      expect.any(Function),
    );
  });

  it('pins each outbound socket to the public address that passed validation', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(Response.json({ success: true, data: { id: 'user_1' } }));
    mockedDns.lookup.mockResolvedValueOnce([
      { address: '93.184.216.35', family: 4 },
      { address: '93.184.216.36', family: 4 },
    ] as never);
    mockArtifactResponse('artifact body');
    const { GET } = await loadRoute();

    const response = await GET(makeRequest(
      'https://hatcher.host/api/artifacts/download?url=https%3A%2F%2Fv3.fal.media%2Ffiles%2Fartifact.txt',
      { authorization: 'Bearer hk_test' },
    ));

    expect(response.status).toBe(200);
    expect(mockedDns.lookup).toHaveBeenCalledTimes(1);
    expect(https.request).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: '93.184.216.35',
        servername: 'v3.fal.media',
        path: '/files/artifact.txt',
      }),
      expect.any(Function),
    );
  });

  it('revalidates redirects and refuses a private destination before opening another socket', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(Response.json({ success: true, data: { id: 'user_1' } }));
    mockedDns.lookup
      .mockResolvedValueOnce(publicDnsRecords)
      .mockResolvedValueOnce(privateDnsRecords);
    mockArtifactResponse('', {
      status: 302,
      headers: { location: 'https://fal.media/private-artifact.txt' },
    });
    const { GET } = await loadRoute();

    const response = await GET(makeRequest(
      'https://hatcher.host/api/artifacts/download?url=https%3A%2F%2Fv3.fal.media%2Fartifact.txt',
      { authorization: 'Bearer hk_test' },
    ));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Artifact host is not allowed' });
    expect(mockedDns.lookup).toHaveBeenCalledTimes(2);
    expect(https.request).toHaveBeenCalledTimes(1);
  });
});
