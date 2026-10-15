import { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog";
import { API_URL } from "@/lib/config";
import { shouldSkipStaticApiFetch } from "@/lib/static-api-fetch";
import { routing } from "@/i18n/routing";

export const dynamic = "force-static";
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hatcher.host";

interface ExploreAgent {
  id: string;
  slug?: string;
  updatedAt?: string;
}

// Public routes that get localized sitemap entries
const LOCALIZED_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/platform", changeFrequency: "weekly", priority: 0.9 },
  { path: "/usage", changeFrequency: "daily", priority: 0.5 },
  { path: "/staking", changeFrequency: "weekly", priority: 0.5 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/explore", changeFrequency: "daily", priority: 0.85 },
  { path: "/traders", changeFrequency: "daily", priority: 0.85 },
  { path: "/features", changeFrequency: "weekly", priority: 0.85 },
  { path: "/compute", changeFrequency: "weekly", priority: 0.8 },
  { path: "/frameworks", changeFrequency: "weekly", priority: 0.8 },
  { path: "/create", changeFrequency: "monthly", priority: 0.8 },
  { path: "/token", changeFrequency: "weekly", priority: 0.7 },
  { path: "/whitepaper", changeFrequency: "monthly", priority: 0.65 },
  { path: "/roadmap", changeFrequency: "weekly", priority: 0.6 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
  { path: "/tutorials", changeFrequency: "weekly", priority: 0.75 },
  { path: "/changelog", changeFrequency: "weekly", priority: 0.6 },
  { path: "/help", changeFrequency: "monthly", priority: 0.5 },
  { path: "/security", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs", changeFrequency: "weekly", priority: 0.6 },
  { path: "/support", changeFrequency: "monthly", priority: 0.5 },
];

// Legal pages are English-only (not in i18n scope)
const LEGAL_ROUTES = ["/privacy", "/terms", "/impressum", "/cookies"];

function absUrl(locale: string, path: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const suffix = path === "/" ? "" : path;
  return `${SITE_URL}${prefix}${suffix}`;
}

function buildLanguagesMap(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absUrl(locale, path);
  }
  languages["x-default"] = absUrl(routing.defaultLocale, path);
  return languages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {

  // Localized public routes — one entry per locale per route
  const localizedEntries: MetadataRoute.Sitemap = [];
  for (const route of LOCALIZED_ROUTES) {
    const languages = buildLanguagesMap(route.path);
    for (const locale of routing.locales) {
      localizedEntries.push({
        url: absUrl(locale, route.path),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: { languages },
      });
    }
  }

  // Blog posts — English only (blog content not localized yet)
  const blogPostEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Legal pages — English only
  const legalEntries: MetadataRoute.Sitemap = LEGAL_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "monthly" as const,
    priority: 0.3,
  }));

  // Fetch public agents for dynamic pages (English only)
  let agentEntries: MetadataRoute.Sitemap = [];
  if (!shouldSkipStaticApiFetch(API_URL)) {
    try {
      for (let offset = 0; offset < 10_000;) {
        const res = await fetch(`${API_URL}/agents/explore?limit=100&offset=${offset}`, {
          next: { revalidate: 3600 },
          signal: AbortSignal.timeout(5_000),
        });
        if (!res.ok) break;
        const json = await res.json() as {
          success: boolean;
          data?: { agents: ExploreAgent[]; pagination?: { hasMore: boolean } };
        };
        const agents = json.success ? json.data?.agents ?? [] : [];
        agentEntries.push(...agents.map((agent) => ({
          url: `${SITE_URL}/agent/${encodeURIComponent(agent.slug || agent.id)}`,
          ...(agent.updatedAt ? { lastModified: new Date(agent.updatedAt) } : {}),
          changeFrequency: "daily" as const,
          priority: 0.5,
        })));
        if (!agents.length || !json.data?.pagination?.hasMore) break;
        offset += agents.length;
      }
    } catch {
      // Skip dynamic pages if API is unavailable
    }
  }

  return [
    ...localizedEntries,
    ...blogPostEntries,
    ...legalEntries,
    ...agentEntries,
  ];
}
