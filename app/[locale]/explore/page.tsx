import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Radio, Search, Sparkles } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { Link } from '@/i18n/routing';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import { buildLanguagesMap } from '@/lib/seo';
import { shouldSkipStaticApiFetch } from '@/lib/static-api-fetch';
import { PublicAgentsExplorer } from '@/components/explore/PublicAgentsExplorer';
import { getExploreStats, type PublicExploreAgent } from '@/components/explore/publicAgents';

type ExploreResponse = {
  success?: boolean;
  data?: {
    agents?: PublicExploreAgent[];
    pagination?: { total: number };
  };
};

export const metadata: Metadata = {
  title: 'Explore Public AI Agents',
  description: 'Chat with public Hatcher agents shared by the community.',
  alternates: { canonical: '/explore', languages: buildLanguagesMap('/explore') },
  openGraph: {
    title: 'Explore Public AI Agents · Hatcher',
    description: 'Open public chat sessions with Hatcher agents shared by the community.',
    url: 'https://hatcher.host/explore',
    siteName: 'Hatcher',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore Public AI Agents · Hatcher',
    description: 'Open public chat sessions with Hatcher agents shared by the community.',
  },
};

async function fetchPublicAgents(): Promise<PublicExploreAgent[]> {
  if (shouldSkipStaticApiFetch(API_URL)) return [];

  try {
    const res = await fetch(`${API_URL}/agents/explore?limit=60&sort=popular`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as ExploreResponse;
    if (!json.success || !Array.isArray(json.data?.agents)) return [];
    return json.data.agents.filter((agent) => agent.publicChatEnabled);
  } catch {
    return [];
  }
}

export default async function ExplorePage() {
  const [t, locale] = await Promise.all([getTranslations('explorePage'), getLocale()]);
  const agents = await fetchPublicAgents();
  const stats = getExploreStats(agents);

  return (
    <MarketingShell>
      <section className="border-b border-[var(--border-default)] bg-[var(--bg-base)] pt-14 pb-4 sm:pt-24 sm:pb-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-muted)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-accent)]">
                <Sparkles className="h-3.5 w-3.5" />
                {t('eyebrow')}
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-normal text-[var(--text-primary)] sm:mt-5 sm:text-5xl">
                {t('title')}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:mt-4 sm:text-base sm:leading-7">
                {t('body')}
              </p>
              <div className="mt-4 grid max-w-2xl grid-cols-3 gap-2 sm:mt-5">
                <ExploreStat label={t('statsAgents', { count: stats.total })} />
                <ExploreStat label={t('statsLive', { count: stats.live })} accent />
                <ExploreStat label={t('statsInteractions', { count: stats.interactions })} />
              </div>
            </div>
            <Link
              href="/city"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border-default)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)]"
            >
              <Radio className="h-4 w-4" />
              {t('cityCta')}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[var(--bg-base)] py-4 sm:py-10">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          {agents.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-6 py-12 text-center">
              <Search className="h-8 w-8 text-[var(--text-muted)]" />
              <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{t('emptyTitle')}</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">{t('emptyBody')}</p>
            </div>
          ) : (
            <PublicAgentsExplorer
              agents={agents}
              locale={locale}
              copy={{
                searchPlaceholder: t('searchPlaceholder'),
                filterAll: t('filterAll'),
                filterOpenClaw: t('filterOpenClaw'),
                filterHermes: t('filterHermes'),
                filterLive: t('filterLive'),
                showingCount: t('showingCount', { count: '{count}' }),
                noResultsTitle: t('noResultsTitle'),
                noResultsBody: t('noResultsBody'),
                fallbackDescription: t('fallbackDescription'),
                publicChat: t('publicChat'),
                chatCta: t('chatCta'),
                interactions: t('interactions'),
                frameworkLabel: t('frameworkLabel'),
                featured: t('featured'),
                ownerFallback: t('ownerFallback'),
                avatarLabel: t('avatarLabel'),
                statuses: {
                  active: t('statusRunning'),
                  running: t('statusRunning'),
                  sleeping: t('statusSleeping'),
                  paused: t('statusPaused'),
                  crashed: t('statusCrashed'),
                },
              }}
            />
          )}
        </div>
      </section>
    </MarketingShell>
  );
}

function ExploreStat({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-2 py-2 text-[11px] font-semibold leading-tight sm:px-3 sm:text-sm ${
        accent
          ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
          : 'border-[var(--border-default)] bg-[var(--bg-muted)] text-[var(--text-secondary)]'
      }`}
    >
      {label}
    </div>
  );
}
