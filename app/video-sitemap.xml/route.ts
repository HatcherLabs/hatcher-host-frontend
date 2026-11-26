import { HATCHER_TUTORIALS } from '@/lib/tutorials';

export const dynamic = 'force-static';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hatcher.host';
const xml = (value: string) => value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[character]!));

export function GET() {
  const entries = HATCHER_TUTORIALS.map((tutorial) => `<url>
    <loc>${xml(`${SITE_URL}/tutorials/${tutorial.slug}`)}</loc>
    <video:video>
      <video:thumbnail_loc>${xml(`${SITE_URL}${tutorial.posterSrc}`)}</video:thumbnail_loc>
      <video:title>${xml(tutorial.title)}</video:title>
      <video:description>${xml(tutorial.description)}</video:description>
      <video:content_loc>${xml(`${SITE_URL}${tutorial.videoSrc}`)}</video:content_loc>
      <video:publication_date>${tutorial.uploadDate}</video:publication_date>
    </video:video>
  </url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${entries}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
