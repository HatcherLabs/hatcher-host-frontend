import dns from 'node:dns/promises';
import net from 'node:net';
import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const AUTH_TIMEOUT_MS = 5000;

const DEFAULT_ALLOWED_ARTIFACT_HOSTS = [
  'v3.fal.media',
  'fal.media',
  'replicate.delivery',
  'assets.coingecko.com',
  'oaidalleapiprodscus.blob.core.windows.net',
];

function allowedArtifactHosts(): string[] {
  const configured = process.env.ARTIFACT_DOWNLOAD_ALLOWED_HOSTS
    ?.split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean) ?? [];
  return Array.from(new Set([
    ...DEFAULT_ALLOWED_ARTIFACT_HOSTS,
    ...configured,
  ].filter((host): host is string => Boolean(host))));
}

function isBlockedArtifactHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === 'hatcher.host' || normalized.endsWith('.hatcher.host');
}

function isAllowedArtifactHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (isBlockedArtifactHost(normalized)) return false;
  return allowedArtifactHosts().some((allowed) => {
    if (allowed.startsWith('*.')) {
      const suffix = allowed.slice(1);
      return normalized.endsWith(suffix) && normalized.length > suffix.length;
    }
    return normalized === allowed;
  });
}

function safeFilename(value: string): string {
  return value
    .replace(/["\\/:*?<>|\r\n]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160)
    || 'artifact';
}

function filenameFromUrl(url: URL): string {
  const name = url.pathname.split('/').filter(Boolean).pop();
  return safeFilename(name ? decodeURIComponent(name) : 'artifact');
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 0 || b === 168))
    || (a === 198 && (b === 18 || b === 19 || b === 51))
    || (a === 203 && b === 0)
    || (a === 100 && b >= 64 && b <= 127)
    || a >= 224
  );
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  const mappedIpv4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized)?.[1];
  if (mappedIpv4) return isPrivateIpv4(mappedIpv4);
  return (
    normalized === '::1'
    || normalized === '::'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe80:')
    || normalized.startsWith('::ffff:127.')
    || normalized.startsWith('::ffff:10.')
    || normalized.startsWith('::ffff:192.168.')
  );
}

function isPrivateIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isPrivateIpv4(ip);
  if (family === 6) return isPrivateIpv6(ip);
  return true;
}

async function assertPublicHttpUrl(url: URL): Promise<void> {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only http and https artifact URLs are supported');
  }
  if (url.username || url.password) {
    throw new Error('Artifact URLs cannot include credentials');
  }
  if (!isAllowedArtifactHost(url.hostname)) {
    throw new Error('Artifact host is not allowed');
  }
  const records = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (records.length === 0 || records.some((record) => isPrivateIp(record.address))) {
    throw new Error('Artifact host is not allowed');
  }
}

async function isAuthorizedArtifactRequest(request: NextRequest): Promise<boolean> {
  const cookie = request.headers.get('cookie');
  const authorization = request.headers.get('authorization');
  if (!cookie && !authorization) return false;

  const headers: HeadersInit = { accept: 'application/json' };
  if (cookie) headers.cookie = cookie;
  if (authorization) headers.authorization = authorization;

  try {
    const response = await fetch(new URL('/auth/me', API_URL), {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function fetchPublicArtifact(url: URL, redirects = 0): Promise<Response> {
  await assertPublicHttpUrl(url);
  const response = await fetch(url, {
    redirect: 'manual',
    cache: 'no-store',
    headers: {
      accept: 'image/*,video/*,audio/*,application/pdf,text/*,application/octet-stream,*/*;q=0.5',
      'user-agent': 'HatcherArtifactDownloader/1.0',
    },
  });

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects >= MAX_REDIRECTS) throw new Error('Too many redirects');
    const location = response.headers.get('location');
    if (!location) throw new Error('Redirect missing location');
    return fetchPublicArtifact(new URL(location, url), redirects + 1);
  }

  return response;
}

function cappedStream(source: ReadableStream<Uint8Array>, maxBytes: number): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  let total = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      total += value.byteLength;
      if (total > maxBytes) {
        controller.error(new Error('Artifact is too large'));
        await reader.cancel().catch(() => {});
        return;
      }
      controller.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing artifact URL' }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Invalid artifact URL' }, { status: 400 });
  }

  if (!(await isAuthorizedArtifactRequest(request))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    await assertPublicHttpUrl(url);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Invalid artifact URL' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetchPublicArtifact(url);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Unable to fetch artifact' }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Artifact download failed with status ${upstream.status}` },
      { status: upstream.status || 502 },
    );
  }

  const contentLength = Number(upstream.headers.get('content-length') ?? '0');
  if (contentLength > MAX_DOWNLOAD_BYTES) {
    return NextResponse.json({ error: 'Artifact is too large' }, { status: 413 });
  }

  const filename = safeFilename(request.nextUrl.searchParams.get('filename') || filenameFromUrl(url));
  const headers = new Headers();
  headers.set('content-type', upstream.headers.get('content-type') ?? 'application/octet-stream');
  if (contentLength > 0) headers.set('content-length', String(contentLength));
  headers.set('cache-control', 'private, max-age=300');
  headers.set('content-disposition', `attachment; filename="${filename}"`);

  return new NextResponse(cappedStream(upstream.body, MAX_DOWNLOAD_BYTES), {
    status: 200,
    headers,
  });
}
