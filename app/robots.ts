import { locales } from '@/i18n/config';
import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['', ...locales.map((locale) => `/${locale}`)].flatMap((prefix) =>
          ['/dashboard', '/settings', '/admin', '/api', '/chat', '/oauth'].flatMap((path) =>
            [`${prefix}${path}$`, `${prefix}${path}/`],
          ),
        ),
      },
    ],
    sitemap: ['https://hatcher.host/sitemap.xml', 'https://hatcher.host/video-sitemap.xml'],
    host: 'https://hatcher.host',
  };
}
