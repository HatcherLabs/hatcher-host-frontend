import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Bot, MessageSquare, Radio, Search, Sparkles } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { Link } from '@/i18n/routing';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import { buildLanguagesMap } from '@/lib/seo';

type ExploreAgent = {
  id: string;
  slug?: string | null;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  framework: string;
  status: string;
  messageCount: number;
  createdAt: string;
  publicChatEnabled?: boolean;
  owner?: { username?: string | null; walletAddress?: string | null };
};

type ExploreResponse = {
  success?: boolean;
  data?: {
    agents?: ExploreAgent[];
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

async function fetchPublicAgents(): Promise<ExploreAgent[]> {
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

function agentHref(agent: ExploreAgent): string {
  return `/agent/${agent.slug ?? agent.id}?chat=1`;
}

function agentInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || 'A';
}

export default async function ExplorePage() {
  const t = await getTranslations('explorePage');
  const agents = await fetchPublicAgents();

  return (
    <MarketingShell>
      <section className="border-b border-[var(--border-default)] bg-[var(--bg-base)] pt-28 pb-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-muted)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-accent)]">
                <Sparkles className="h-3.5 w-3.5" />
                {t('eyebrow')}
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-normal text-[var(--text-primary)] sm:text-5xl">
                {t('title')}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
                {t('body')}
              </p>
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

      <section className="bg-[var(--bg-base)] py-10">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          {agents.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-6 py-12 text-center">
              <Search className="h-8 w-8 text-[var(--text-muted)]" />
              <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{t('emptyTitle')}</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">{t('emptyBody')}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {agents.map((agent) => (
                <article
                  key={agent.id}
                  className="flex min-h-[240px] flex-col justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5 transition-colors hover:border-[var(--color-accent)]/40"
                >
                  <div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] text-sm font-semibold text-[var(--text-primary)]">
                        {agent.avatarUrl ? (
                          <span
                            aria-hidden="true"
                            className="h-full w-full bg-cover bg-center"
                            style={{ backgroundImage: `url("${agent.avatarUrl}")` }}
                          />
                        ) : (
                          agentInitial(agent.name)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold text-[var(--text-primary)]">{agent.name}</h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                          <span className="uppercase">{agent.framework}</span>
                          <span>{agent.status}</span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 line-clamp-3 min-h-[72px] text-sm leading-6 text-[var(--text-secondary)]">
                      {agent.description || t('fallbackDescription')}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <Bot className="h-4 w-4" />
                      {(agent.messageCount ?? 0).toLocaleString()} {t('interactions')}
                    </div>
                    <Link
                      href={agentHref(agent)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {t('chatCta')}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </MarketingShell>
  );
}
