import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://hatcher.host', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: 'https://hatcher.host/pricing', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: 'https://hatcher.host/explore', lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: 'https://hatcher.host/marketplace', lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://hatcher.host/help', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://hatcher.host/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: 'https://hatcher.host/register', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];
}
