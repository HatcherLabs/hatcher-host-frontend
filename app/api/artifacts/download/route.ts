import dns from 'node:dns/promises';
import https from 'node:https';
import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import net from 'node:net';
import { Readable } from 'node:stream';
import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/config';
import { cappedDownloadStream } from '@/lib/capped-download-stream';
import { safeDownloadFilename } from '@/lib/safe-download-filename';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const AUTH_TIMEOUT_MS = 5000;
const ARTIFACT_TIMEOUT_MS = 30_000;

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

function filenameFromUrl(url: URL): string {
  const name = url.pathname.split('/').filter(Boolean).pop();
  if (!name) return 'artifact';
  try {
    return safeDownloadFilename(decodeURIComponent(name));
  } catch {
    return safeDownloadFilename(name);
  }
}

const NON_PUBLIC_IPS = new net.BlockList();

for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  NON_PUBLIC_IPS.addSubnet(network, prefix, 'ipv4');
}

for (const [network, prefix] of [
  ['::', 96],
  ['::1', 128],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fec0::', 10],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  NON_PUBLIC_IPS.addSubnet(network, prefix, 'ipv6');
}

function isPrivateIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family !== 4 && family !== 6) return true;
  return NON_PUBLIC_IPS.check(ip, family === 4 ? 'ipv4' : 'ipv6');
}

type PublicHostAddress = {
  address: string;
  family: 4 | 6;
};

type PinnedArtifactResponse = {
  response: Response;
  destroy: (reason?: Error) => void;
};

function assertAllowedArtifactUrl(url: URL): void {
  if (url.protocol !== 'https:') {
    throw new Error('Only https artifact URLs are supported');
  }
  if (url.port && url.port !== '443') {
    throw new Error('Artifact URLs must use port 443');
  }
  if (url.username || url.password) {
    throw new Error('Artifact URLs cannot include credentials');
  }
  if (!isAllowedArtifactHost(url.hostname)) {
    throw new Error('Artifact host is not allowed');
  }
}

async function resolvePublicArtifactHost(url: URL): Promise<PublicHostAddress> {
  assertAllowedArtifactUrl(url);
  const records = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (records.length === 0 || records.some((record) => isPrivateIp(record.address))) {
    throw new Error('Artifact host is not allowed');
  }

  const selected = records[0];
  if (!selected || (selected.family !== 4 && selected.family !== 6)) {
    throw new Error('Artifact host is not allowed');
  }
  return { address: selected.address, family: selected.family };
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

function responseHeaders(headers: IncomingHttpHeaders): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) result.append(name, item);
    } else if (value !== undefined) {
      result.set(name, value);
    }
  }
  return result;
}

function requestPinnedArtifact(url: URL, target: PublicHostAddress): Promise<PinnedArtifactResponse> {
  return new Promise((resolve, reject) => {
    const request = https.request({
      protocol: 'https:',
      hostname: target.address,
      family: target.family,
      port: 443,
      method: 'GET',
      path: `${url.pathname}${url.search}`,
      servername: url.hostname,
      headers: {
        host: url.host,
        accept: 'image/*,video/*,audio/*,application/pdf,text/*,application/octet-stream,*/*;q=0.5',
        'user-agent': 'HatcherArtifactDownloader/1.0',
      },
    }, (upstream) => {
      const status = upstream.statusCode ?? 502;
      const hasBody = status !== 204 && status !== 205 && status !== 304;
      const body = hasBody
        ? Readable.toWeb(upstream as IncomingMessage) as ReadableStream<Uint8Array>
        : null;
      resolve({
        response: new Response(body, {
          status,
          statusText: upstream.statusMessage,
          headers: responseHeaders(upstream.headers),
        }),
        destroy(reason) {
          upstream.destroy(reason);
          request.destroy(reason);
        },
      });
    });

    request.setTimeout(ARTIFACT_TIMEOUT_MS, () => {
      request.destroy(new Error('Artifact request timed out'));
    });
    request.once('error', reject);
    request.end();
  });
}

async function fetchPublicArtifact(
  url: URL,
  redirects = 0,
  initialTarget?: PublicHostAddress,
): Promise<PinnedArtifactResponse> {
  const target = initialTarget ?? await resolvePublicArtifactHost(url);
  const pinned = await requestPinnedArtifact(url, target);
  const { response } = pinned;

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects >= MAX_REDIRECTS) {
      pinned.destroy();
      throw new Error('Too many redirects');
    }
    const location = response.headers.get('location');
    if (!location) {
      pinned.destroy();
      throw new Error('Redirect missing location');
    }
    await response.body?.cancel();
    pinned.destroy();
    return fetchPublicArtifact(new URL(location, url), redirects + 1);
  }

  return pinned;
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

  let pinnedUpstream: PinnedArtifactResponse;
  let initialTarget: PublicHostAddress;
  try {
    initialTarget = await resolvePublicArtifactHost(url);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Invalid artifact URL' }, { status: 400 });
  }
  try {
    pinnedUpstream = await fetchPublicArtifact(url, 0, initialTarget);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Unable to fetch artifact' }, { status: 502 });
  }

  const upstream = pinnedUpstream.response;
  if (!upstream.ok || !upstream.body) {
    pinnedUpstream.destroy();
    return NextResponse.json(
      { error: `Artifact download failed with status ${upstream.status}` },
      { status: upstream.status || 502 },
    );
  }

  const contentLength = Number(upstream.headers.get('content-length') ?? '0');
  if (contentLength > MAX_DOWNLOAD_BYTES) {
    pinnedUpstream.destroy(new Error('Artifact is too large'));
    return NextResponse.json({ error: 'Artifact is too large' }, { status: 413 });
  }

  const filename = safeDownloadFilename(request.nextUrl.searchParams.get('filename') || filenameFromUrl(url));
  const headers = new Headers();
  headers.set('content-type', upstream.headers.get('content-type') ?? 'application/octet-stream');
  if (contentLength > 0) headers.set('content-length', String(contentLength));
  headers.set('cache-control', 'private, max-age=300');
  headers.set('content-disposition', `attachment; filename="${filename}"`);

  return new NextResponse(cappedDownloadStream(
    upstream.body,
    MAX_DOWNLOAD_BYTES,
    (error) => pinnedUpstream.destroy(error),
  ), {
    status: 200,
    headers,
  });
}
