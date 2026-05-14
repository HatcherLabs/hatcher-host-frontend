'use client';

import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { Bot, MessageSquare, Radio, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/routing';
import {
  filterExploreAgents,
  frameworkDisplayName,
  isLiveExploreAgent,
  publicAgentAccent,
  publicAgentHref,
  type ExploreFrameworkFilter,
  type PublicExploreAgent,
} from './publicAgents';

interface ExploreCopy {
  searchPlaceholder: string;
  filterAll: string;
  filterOpenClaw: string;
  filterHermes: string;
  filterLive: string;
  showingCount: string;
  noResultsTitle: string;
  noResultsBody: string;
  fallbackDescription: string;
  publicChat: string;
  chatCta: string;
  interactions: string;
  frameworkLabel: string;
  featured: string;
  ownerFallback: string;
  avatarLabel: string;
  statuses: Record<string, string>;
}

interface Props {
  agents: PublicExploreAgent[];
  locale: string;
  copy: ExploreCopy;
}

const FRAMEWORK_FILTERS: ExploreFrameworkFilter[] = ['all', 'openclaw', 'hermes'];

export function PublicAgentsExplorer({ agents, locale, copy }: Props) {
  const [query, setQuery] = useState('');
  const [framework, setFramework] = useState<ExploreFrameworkFilter>('all');
  const [liveOnly, setLiveOnly] = useState(false);
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const filteredAgents = useMemo(
    () => filterExploreAgents(agents, { query, framework, liveOnly }),
    [agents, framework, liveOnly, query],
  );

  if (agents.length === 0) return null;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="h-11 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--color-accent)]/70"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] p-1">
              {FRAMEWORK_FILTERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFramework(item)}
                  className={`h-9 rounded-[6px] px-3 text-xs font-semibold transition-colors ${
                    framework === item
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {frameworkLabel(item, copy)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setLiveOnly((value) => !value)}
              className={`inline-flex h-11 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${
                liveOnly
                  ? 'border-emerald-400/45 bg-emerald-400/12 text-emerald-200'
                  : 'border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Radio className="h-4 w-4" />
              {copy.filterLive}
            </button>
            <div className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] px-3 text-sm font-medium text-[var(--text-muted)]">
              <SlidersHorizontal className="h-4 w-4" />
              {copy.showingCount.replace('{count}', numberFormat.format(filteredAgents.length))}
            </div>
          </div>
        </div>
      </div>

      {filteredAgents.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-6 py-12 text-center">
          <Search className="h-8 w-8 text-[var(--text-muted)]" />
          <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
            {copy.noResultsTitle}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            {copy.noResultsBody}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAgents.map((agent, index) => (
            <PublicAgentCard
              key={agent.id}
              agent={agent}
              featured={index < 3}
              numberFormat={numberFormat}
              copy={copy}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PublicAgentCard({
  agent,
  featured,
  numberFormat,
  copy,
}: {
  agent: PublicExploreAgent;
  featured: boolean;
  numberFormat: Intl.NumberFormat;
  copy: ExploreCopy;
}) {
  const accent = publicAgentAccent(agent);
  return (
    <article
      className="group flex min-h-[360px] flex-col overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] transition-colors hover:border-[var(--color-accent)]/45"
      style={{ '--agent-accent': accent } as CSSProperties}
    >
      <AgentAvatar3D agent={agent} copy={copy} featured={featured} />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-[var(--text-primary)]">
              {agent.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bg-muted)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)]">
                <MessageSquare className="h-3 w-3" />
                {copy.publicChat}
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bg-muted)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)]"
                aria-label={`${copy.frameworkLabel}: ${frameworkDisplayName(agent.framework)}`}
              >
                <Bot className="h-3 w-3" />
                {frameworkDisplayName(agent.framework)}
              </span>
            </div>
          </div>
          <StatusPill agent={agent} copy={copy} />
        </div>

        <p className="mt-4 line-clamp-3 min-h-[72px] text-sm leading-6 text-[var(--text-secondary)]">
          {agent.description || copy.fallbackDescription}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <div className="min-w-0 text-xs text-[var(--text-muted)]">
            <div className="truncate">
              {agent.owner?.username || copy.ownerFallback}
            </div>
            <div className="mt-1 font-medium text-[var(--text-secondary)]">
              {numberFormat.format(agent.messageCount ?? 0)} {copy.interactions}
            </div>
          </div>
          <Link
            href={publicAgentHref(agent)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <MessageSquare className="h-4 w-4" />
            {copy.chatCta}
          </Link>
        </div>
      </div>
    </article>
  );
}

function AgentAvatar3D({
  agent,
  copy,
  featured,
}: {
  agent: PublicExploreAgent;
  copy: ExploreCopy;
  featured: boolean;
}) {
  const initial = agent.name.trim().slice(0, 1).toUpperCase() || 'A';
  const accent = publicAgentAccent(agent);
  const style = {
    '--agent-accent': accent,
    '--agent-accent-soft': `${accent}26`,
  } as CSSProperties;

  return (
    <div
      className="relative h-44 overflow-hidden border-b border-[var(--border-default)] bg-[var(--bg-muted)]"
      style={style}
      aria-label={copy.avatarLabel}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--agent-accent-soft),transparent_42%),radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.13),transparent_28%)]" />
      <div className="absolute inset-x-8 bottom-7 h-14 rounded-[50%] border border-white/10 bg-black/18 [transform:rotateX(62deg)]" />
      <div className="absolute inset-x-10 bottom-12 h-px bg-[linear-gradient(90deg,transparent,var(--agent-accent),transparent)] opacity-75" />

      {featured ? (
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-black/24 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur">
          <Sparkles className="h-3 w-3 text-[var(--agent-accent)]" />
          {copy.featured}
        </div>
      ) : null}

      {agent.avatarUrl ? (
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 h-10 w-10 rounded-md border border-white/20 bg-cover bg-center shadow-lg"
          style={{ backgroundImage: `url("${agent.avatarUrl}")` }}
        />
      ) : null}

      <div className="absolute inset-0 flex items-center justify-center [perspective:560px]">
        <div className="relative h-28 w-24 transition-transform duration-300 [transform-style:preserve-3d] [transform:rotateX(8deg)_rotateY(-18deg)] group-hover:[transform:rotateX(4deg)_rotateY(-28deg)_translateY(-4px)]">
          <div className="absolute left-1/2 top-2 h-7 w-7 -translate-x-1/2 rounded-[6px] border border-white/20 bg-slate-950 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <div className="absolute left-1/2 top-1.5 h-1.5 w-8 -translate-x-1/2 rounded-full bg-[var(--agent-accent)] shadow-[0_0_18px_var(--agent-accent)]" />
            <div className="absolute left-1/2 top-[-10px] h-3 w-px -translate-x-1/2 bg-slate-300/70" />
            <div className="absolute left-1/2 top-[-14px] h-2 w-2 -translate-x-1/2 rounded-full bg-[var(--agent-accent)]" />
          </div>
          <div className="absolute left-1/2 top-9 h-16 w-16 -translate-x-1/2 rounded-[8px] border border-white/20 bg-[linear-gradient(145deg,#e8edf5,#8793a6_64%,#334155)] shadow-[0_18px_40px_rgba(0,0,0,0.38)]">
            <div className="absolute left-1/2 top-3 flex h-7 w-10 -translate-x-1/2 items-center justify-center rounded-[5px] bg-slate-950 text-xs font-bold text-[var(--agent-accent)] shadow-[inset_0_0_14px_rgba(0,0,0,0.55)]">
              {initial}
            </div>
            <div className="absolute bottom-3 left-1/2 h-1.5 w-9 -translate-x-1/2 rounded-full bg-[var(--agent-accent)] opacity-80" />
          </div>
          <div className="absolute left-1 top-14 h-9 w-3 rounded-full bg-slate-700 shadow-[0_10px_20px_rgba(0,0,0,0.28)]" />
          <div className="absolute right-1 top-14 h-9 w-3 rounded-full bg-slate-700 shadow-[0_10px_20px_rgba(0,0,0,0.28)]" />
          <div className="absolute bottom-1 left-7 h-8 w-3 rounded-full bg-slate-800" />
          <div className="absolute bottom-1 right-7 h-8 w-3 rounded-full bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ agent, copy }: { agent: PublicExploreAgent; copy: ExploreCopy }) {
  const label = copy.statuses[agent.status] ?? agent.status;
  const live = isLiveExploreAgent(agent);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${
        live
          ? 'bg-emerald-400/12 text-emerald-300'
          : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          live ? 'bg-emerald-300' : 'bg-[var(--text-muted)]'
        }`}
      />
      {label}
    </span>
  );
}

function frameworkLabel(filter: ExploreFrameworkFilter, copy: ExploreCopy): string {
  switch (filter) {
    case 'openclaw':
      return copy.filterOpenClaw;
    case 'hermes':
      return copy.filterHermes;
    case 'all':
      return copy.filterAll;
  }
}
