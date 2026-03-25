import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard/', '/settings/', '/admin/'] },
    sitemap: 'https://hatcher.host/sitemap.xml',
  };
}
