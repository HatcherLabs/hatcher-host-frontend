import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

function safeFilename(value: string): string {
  return value
    .replace(/["\\/:*?<>|\r\n]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'artifact';
}

function filenameFromPath(value: string): string {
  const name = value.split('/').filter(Boolean).pop() ?? 'artifact';
  return safeFilename(decodeURIComponent(name));
}

function isPassiveInlineMedia(contentType: string): boolean {
  const type = contentType.toLowerCase().split(';', 1)[0]?.trim() ?? '';
  return (
    type === 'image/png'
    || type === 'image/jpeg'
    || type === 'image/gif'
    || type === 'image/webp'
    || type.startsWith('audio/')
    || type.startsWith('video/')
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { agentId } = await context.params;
  const mediaPath = request.nextUrl.searchParams.get('path');
  const videoJobId = request.nextUrl.searchParams.get('videoJobId');
  if (!agentId || (!mediaPath && !videoJobId)) {
    return NextResponse.json({ error: 'Invalid media artifact request' }, { status: 400 });
  }

  const upstreamUrl = new URL(
    videoJobId
      ? `/agents/${encodeURIComponent(agentId)}/media/video`
      : `/agents/${encodeURIComponent(agentId)}/container-files/media`,
    API_URL,
  );
  if (videoJobId) {
    upstreamUrl.searchParams.set('jobId', videoJobId);
    upstreamUrl.searchParams.set('index', request.nextUrl.searchParams.get('index') ?? '0');
  } else if (mediaPath) {
    upstreamUrl.searchParams.set('path', mediaPath);
  }

  const headers: HeadersInit = {};
  const cookie = request.headers.get('cookie');
  const authorization = request.headers.get('authorization');
  if (cookie) headers.cookie = cookie;
  if (authorization) headers.authorization = authorization;

  const upstream = await fetch(upstreamUrl, {
    headers,
    cache: 'no-store',
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Media artifact request failed with status ${upstream.status}` },
      { status: upstream.status },
    );
  }

  const unavailable = upstream.headers.get('x-hatcher-media-unavailable') === '1';
  const filename = unavailable
    ? 'artifact-unavailable.svg'
    : videoJobId
      ? `${safeFilename(videoJobId)}.mp4`
      : filenameFromPath(mediaPath ?? 'artifact');
  const download = request.nextUrl.searchParams.get('download') === '1';
  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
  const inline = !download && isPassiveInlineMedia(contentType);
  const responseHeaders = new Headers();
  responseHeaders.set('content-type', contentType);
  const contentLength = upstream.headers.get('content-length');
  if (contentLength) responseHeaders.set('content-length', contentLength);
  responseHeaders.set('cache-control', 'private, max-age=300');
  responseHeaders.set('x-content-type-options', 'nosniff');
  responseHeaders.set('content-security-policy', "sandbox; default-src 'none'; img-src 'self' data: blob:; media-src 'self' data: blob:");
  responseHeaders.set(
    'content-disposition',
    `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
  );

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
