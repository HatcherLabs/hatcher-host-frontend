import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/config';
import { buildPreviewResponseHeaders, buildPreviewUpstreamUrl } from './previewProxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ agentId: string; path: string[] }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { agentId, path } = await context.params;
  if (!agentId) {
    return NextResponse.json({ error: 'Invalid preview request' }, { status: 400 });
  }

  const upstreamUrl = buildPreviewUpstreamUrl(API_URL, agentId, path ?? []);

  // No auth headers, no cookies — the token in the path is the credential.
  const upstream = await fetch(upstreamUrl, { cache: 'no-store' });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: buildPreviewResponseHeaders(upstream.headers.get('content-type')),
  });
}
