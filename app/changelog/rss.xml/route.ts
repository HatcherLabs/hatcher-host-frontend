import { CHANGELOG_ENTRIES } from '@/lib/changelog';

export const dynamic = 'force-static';

function escape(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function GET() {
  const baseUrl = 'https://hatcher.host';

  const items = CHANGELOG_ENTRIES.map((entry) => {
    const description = [
      escape(entry.summary),
      '',
      ...entry.items.map((i) => `- [${escape(i.category)}] ${escape(i.text)}`),
    ].join('\n');

    return `
    <item>
      <title>${escape(`v${entry.version} — ${entry.title}`)}</title>
      <link>${baseUrl}/changelog</link>
      <guid isPermaLink="false">${baseUrl}/changelog#v${escape(entry.version)}</guid>
      <pubDate>${new Date(entry.date).toUTCString()}</pubDate>
      <description><![CDATA[${entry.summary}\n\n${entry.items.map((i) => `• [${i.category}] ${i.text}`).join('\n')}]]></description>
    </item>`.trim();
  }).join('\n    ');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Hatcher Changelog</title>
    <link>${baseUrl}/changelog</link>
    <description>Every update, fix, and improvement to the Hatcher platform.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(CHANGELOG_ENTRIES[0]?.date ?? Date.now()).toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/changelog/rss.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
