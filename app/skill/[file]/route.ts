import fs from 'node:fs';
import path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';

const ALLOWED = new Set(['auth.md', 'agents.md', 'pricing.md', 'integrations.md']);

export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ file: string }> },
) {
  const { file } = await context.params;
  if (!ALLOWED.has(file)) {
    return new NextResponse('not found', { status: 404 });
  }
  const filePath = path.join(process.cwd(), 'public', 'skill', file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return new NextResponse(content, {
      status: 200,
      headers: {
        'content-type': 'text/markdown; charset=utf-8',
        'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new NextResponse('not found', { status: 404 });
  }
}

export async function generateStaticParams() {
  return Array.from(ALLOWED).map((file) => ({ file }));
}
