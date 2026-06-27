import { NextResponse } from 'next/server';

import { fetchVirtualsComputeHostedModels } from '@/lib/virtuals-compute-models';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET() {
  try {
    const models = await fetchVirtualsComputeHostedModels();
    return NextResponse.json(
      {
        success: true,
        data: {
          models,
          count: models.length,
          source: 'virtuals-compute',
          fetchedAt: new Date().toISOString(),
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Could not load Virtuals models',
      },
      { status: 502 },
    );
  }
}
