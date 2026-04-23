import { MetadataRoute } from 'next';
import { BLOG_POSTS } from '@/lib/blog';
import { API_URL } from '@/lib/config';
import { CATEGORIES } from '@/components/city/types';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-static';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hatcher.host';

interface ExploreAgent {
  id: string;
  updatedAt?: string;
}

// Public routes that get localized sitemap entries
const LOCALIZED_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'daily', priority: 1.0 },
  { path: '/pricing', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/frameworks', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/create', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/token', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/roadmap', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/changelog', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/help', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/docs', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/support', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/city', changeFrequency: 'daily', priority: 0.9 },
  { path: '/affiliate', changeFrequency: 'monthly', priority: 0.6 },
];

// Legal pages are English-only (not in i18n scope)
const LEGAL_ROUTES = ['/privacy', '/terms', '/impressum', '/cookies'];

function absUrl(locale: string, path: string): string {
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  const suffix = path === '/' ? '' : path;
  return `${SITE_URL}${prefix}${suffix}`;
}

function buildLanguagesMap(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absUrl(locale, path);
  }
  languages['x-default'] = absUrl(routing.defaultLocale, path);
  return languages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Localized public routes — one entry per locale per route
  const localizedEntries: MetadataRoute.Sitemap = [];
  for (const route of LOCALIZED_ROUTES) {
    const languages = buildLanguagesMap(route.path);
    for (const locale of routing.locales) {
      localizedEntries.push({
        url: absUrl(locale, route.path),
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: { languages },
      });
    }
  }

  // City category pages — localized
  const cityEntries: MetadataRoute.Sitemap = [];
  for (const category of CATEGORIES) {
    const path = `/city/${category}`;
    const languages = buildLanguagesMap(path);
    for (const locale of routing.locales) {
      cityEntries.push({
        url: absUrl(locale, path),
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.6,
        alternates: { languages },
      });
    }
  }

  // Blog posts — English only (blog content not localized yet)
  const blogPostEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Legal pages — English only
  const legalEntries: MetadataRoute.Sitemap = LEGAL_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.3,
  }));

  // Fetch public agents for dynamic pages (English only)
  let agentEntries: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/agents/explore`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const json = (await res.json()) as { agents: ExploreAgent[] };
      if (json.agents?.length) {
        agentEntries = json.agents.map((agent) => ({
          url: `${SITE_URL}/agent/${agent.id}`,
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
    ...localizedEntries,
    ...cityEntries,
    ...blogPostEntries,
    ...legalEntries,
    ...agentEntries,
  ];
}
