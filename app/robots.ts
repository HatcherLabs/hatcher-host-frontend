import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/settings/', '/admin/', '/api/', '/chat/'],
      },
    ],
    sitemap: 'https://hatcher.host/sitemap.xml',
    host: 'https://hatcher.host',
  };
}
