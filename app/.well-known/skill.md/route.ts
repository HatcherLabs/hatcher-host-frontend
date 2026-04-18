import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'skill', 'skill.md');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return new NextResponse(content, {
      status: 200,
      headers: {
        'content-type': 'text/markdown; charset=utf-8',
        'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
        'x-canonical-source': 'https://github.com/HatcherLabs/hatcher-skill',
      },
    });
  } catch {
    return new NextResponse('skill.md not found', { status: 404 });
  }
}
