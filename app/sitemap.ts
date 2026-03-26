import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: 'https://hatcher.host', lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://hatcher.host/pricing', lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: 'https://hatcher.host/explore', lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: 'https://hatcher.host/create', lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://hatcher.host/token', lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: 'https://hatcher.host/marketplace', lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://hatcher.host/support', lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://hatcher.host/help', lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://hatcher.host/blog', lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: 'https://hatcher.host/register', lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: 'https://hatcher.host/login', lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
