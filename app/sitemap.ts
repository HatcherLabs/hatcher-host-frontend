import { MetadataRoute } from 'next';
import { BLOG_POSTS } from '@/lib/blog';
import { API_URL } from '@/lib/config';

export const dynamic = 'force-static';

interface ExploreAgent {
  id: string;
  updatedAt?: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const blogPostEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `https://hatcher.host/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Fetch public agents for dynamic pages
  let agentEntries: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/agents/explore`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const json = (await res.json()) as { agents: ExploreAgent[] };
      if (json.agents?.length) {
        agentEntries = json.agents.map((agent) => ({
          url: `https://hatcher.host/agent/${agent.id}`,
          lastModified: agent.updatedAt ? new Date(agent.updatedAt) : now,
          changeFrequency: 'daily' as const,
          priority: 0.5,
        }));
      }
    }
  } catch {
    // Skip dynamic pages if API is unavailable
  }

  return [
    { url: 'https://hatcher.host', lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://hatcher.host/pricing', lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: 'https://hatcher.host/explore', lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: 'https://hatcher.host/create', lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://hatcher.host/token', lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: 'https://hatcher.host/marketplace', lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://hatcher.host/templates', lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: 'https://hatcher.host/docs', lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: 'https://hatcher.host/support', lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://hatcher.host/help', lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://hatcher.host/blog', lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: 'https://hatcher.host/changelog', lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: 'https://hatcher.host/frameworks', lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    ...blogPostEntries,
    ...agentEntries,
  ];
}
