import { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog";
import { HATCHER_TUTORIALS } from "@/lib/tutorials";
import { buildLanguagesMap, contentLocales } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export const dynamic = "force-static";
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hatcher.host";


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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {

  // Localized public routes — one entry per locale per route
  const localizedEntries: MetadataRoute.Sitemap = [];
  for (const route of LOCALIZED_ROUTES) {
    const languages = buildLanguagesMap(route.path);
    for (const locale of contentLocales(route.path)) {
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

  return [
    ...localizedEntries,
    ...blogPostEntries,
    ...HATCHER_TUTORIALS.map((tutorial) => ({
      url: `${SITE_URL}/tutorials/${tutorial.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...legalEntries,

  ];
}
