'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Search, X, Play, Square, RotateCcw, Trash2 } from 'lucide-react';
import styles from './agents.module.css';

type StatusFilter = 'all' | 'active' | 'sleeping' | 'paused' | 'error' | 'restarting';
type FrameworkFilter = 'all' | 'openclaw' | 'hermes';
type SortOption = 'newest' | 'az' | 'messages' | 'active';

const STATUS_FILTERS: StatusFilter[] = ['all', 'active', 'sleeping', 'paused', 'error', 'restarting'];
const FRAMEWORKS: FrameworkFilter[] = ['all', 'openclaw', 'hermes'];
const SORTS: SortOption[] = ['newest', 'az', 'messages', 'active'];

const FRAMEWORK_GLYPH: Record<string, string> = {
  openclaw: '⊞',
  hermes: '◇',
};

const FRAMEWORK_LABEL: Record<string, string> = {
  openclaw: 'OpenClaw',
  hermes: 'Hermes',
};

function statusClass(status: string): string {
  if (status === 'active') return styles.active;
  if (status === 'sleeping') return styles.sleeping;
  if (status === 'paused') return styles.paused;
  if (status === 'error' || status === 'killed') return styles.error;
  if (status === 'restarting') return styles.restarting;
  if (status === 'stopping') return styles.stopping;
  return styles.sleeping;
}

export default function MyAgentsPage() {
  const t  = useTranslations('dashboard.agents');
  const tc = useTranslations('dashboard.common');
  const tStatus = useTranslations('shared.agentStatus');
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [frameworkFilter, setFrameworkFilter] = useState<FrameworkFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Auto-clear flash messages ─────────────────────────────
  useEffect(() => {
    if (!success && !error) return;
    const t = setTimeout(() => { setSuccess(null); setError(null); }, 3500);
    return () => clearTimeout(t);
  }, [success, error]);

  // ── Fetch agents ──────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    api.getMyAgents().then((res) => {
      setLoading(false);
      if (res.success) setAgents(res.data);
      else setError(res.error);
    });
  }, [isAuthenticated]);

  // ── Filter + sort ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = agents;
    if (statusFilter !== 'all') result = result.filter((a) => a.status === statusFilter);
    if (frameworkFilter !== 'all') result = result.filter((a) => a.framework === frameworkFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.description ?? '').toLowerCase().includes(q) ||
          a.framework.toLowerCase().includes(q),
      );
    }
    return [...result].sort((a, b) => {
      switch (sortOption) {
        case 'az': return a.name.localeCompare(b.name);
        case 'messages': return (b.messageCount ?? 0) - (a.messageCount ?? 0);
        case 'active': return new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime();
        case 'newest':
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [agents, statusFilter, frameworkFilter, search, sortOption]);

  // ── Keyboard shortcuts ────────────────────────────────────
  useKeyboardShortcuts({
    onSearch: () => searchRef.current?.focus(),
    onAgentSelect: (i) => {
      if (filtered[i]) router.push(`/dashboard/agent/${filtered[i].id}`);
    },
  });

  // ── Stats ──────────────────────────────────────────────────
  const total = agents.length;
  const activeCount = agents.filter((a) => a.status === 'active').length;
  const sleepingCount = agents.filter((a) => a.status === 'sleeping').length;
  const filtersOn = statusFilter !== 'all' || frameworkFilter !== 'all' || search.trim().length > 0;

  // ── Lifecycle actions ─────────────────────────────────────
  async function runAction(
    agent: Agent,
    fn: (id: string) => Promise<{ success: boolean; error?: string }>,
    okMsg: string,
  ) {
    setActionId(agent.id);
    setError(null);
    setSuccess(null);
    const res = await fn(agent.id);
    setActionId(null);
    if (!res.success) {
      setError(res.error || 'Action failed.');
      return;
    }
    setSuccess(okMsg);
    const refreshed = await api.getMyAgents();
    if (refreshed.success) setAgents(refreshed.data);
  }

  async function handleDelete(agent: Agent) {
    if (!window.confirm(`Delete "${agent.name}"? This cannot be undone.`)) return;
    await runAction(agent, api.deleteAgent, `Deleted "${agent.name}"`);
  }

  // ── Auth states ───────────────────────────────────────────
  if (authLoading) {
    return (
      <div className={styles.gate}>
        <div className={styles.gateInner}>
          <span className={styles.gateGlyph}>◐</span>
          <p className={styles.gateDesc}>{tc('authenticating')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.gate}>
        <div className={styles.gateInner}>
          <span className={styles.gateGlyph}>▎</span>
          <h1 className={styles.gateTitle}>{tc('signInRequired')}</h1>
          <p className={styles.gateDesc}>{t('signInDescription')}</p>
          <Link href="/login" className={styles.cta}>{tc('signIn')}</Link>
        </div>
      </div>
    );
  }

  // ── Page ──────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.eyebrow}>▎ {t('eyebrow')}</span>
            <h1 className={styles.heading}>{t('heading')}</h1>
            <p className={styles.subtitle}>
              {total === 0
                ? t('subtitleEmpty')
                : (total === 1
                    ? t('agentsCount').replace('{count}', String(total)).replace('{active}', String(activeCount))
                    : t('agentsCountPlural').replace('{count}', String(total)).replace('{active}', String(activeCount)))}
            </p>
          </div>
          <Link href="/create" className={styles.cta}>
            <span aria-hidden>▎</span> {t('createCta')}
          </Link>
        </header>

        {/* Stats strip */}
        {total > 0 && (
          <div className={styles.stats}>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>{t('statTotal')}</span>
              <span className={styles.statValue}>{total}</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>{t('statActive')}</span>
              <span className={`${styles.statValue} ${styles.accent}`}>{activeCount}</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>{t('statSleeping')}</span>
              <span className={styles.statValue}>{sleepingCount}</span>
            </div>
          </div>
        )}

        {/* Flash banners */}
        {error && <div className={`${styles.banner} ${styles.error}`}>✕ {error}</div>}
        {success && <div className={`${styles.banner} ${styles.success}`}>✓ {success}</div>}

        {/* Toolbar */}
        {total > 0 && (
          <div className={styles.toolbar}>
            <div className={styles.pills}>
              {STATUS_FILTERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`${styles.pill} ${statusFilter === key ? styles.active : ''}`}
                >
                  {key === 'all'
                    ? t('filterAll')
                    : tStatus(key as 'active' | 'sleeping' | 'paused' | 'error' | 'restarting')}
                </button>
              ))}
            </div>
            <div className={styles.toolbarRow}>
              <select
                className={styles.select}
                value={frameworkFilter}
                onChange={(e) => setFrameworkFilter(e.target.value as FrameworkFilter)}
                aria-label="Framework filter"
              >
                {FRAMEWORKS.map((k) => (
                  <option key={k} value={k}>
                    {k === 'all' ? t('frameworkAll') : FRAMEWORK_LABEL[k]}
                  </option>
                ))}
              </select>
              <div className={styles.searchBox}>
                <Search size={14} />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className={styles.select}
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                aria-label="Sort"
              >
                {SORTS.map((k) => (
                  <option key={k} value={k}>
                    {k === 'newest' ? t('sortNewest')
                      : k === 'az' ? t('sortAZ')
                      : k === 'messages' ? t('sortMessages')
                      : t('sortActive')}
                  </option>
                ))}
              </select>
              {filtersOn && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => { setStatusFilter('all'); setFrameworkFilter('all'); setSearch(''); }}
                >
                  <X size={12} /> {tc('clear')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          total === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyGlyph}>◐</span>
              <h2 className={styles.emptyTitle}>{t('emptyTitle')}</h2>
              <p className={styles.emptyDesc}>{t('emptyDescription')}</p>
              <Link href="/create" className={styles.cta}>
                <span aria-hidden>▎</span> {t('emptyActionLabel')}
              </Link>
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.emptyGlyph}>∅</span>
              <h2 className={styles.emptyTitle}>{t('noMatchTitle')}</h2>
              <p className={styles.emptyDesc}>{t('noMatchDescription')}</p>
              <button
                type="button"
                className={styles.cta}
                onClick={() => { setStatusFilter('all'); setFrameworkFilter('all'); setSearch(''); }}
              >
                {tc('clear')}
              </button>
            </div>
          )
        ) : (
          <div className={styles.grid}>
            {filtered.map((agent) => {
              const busy = actionId === agent.id;
              const isRunning = agent.status === 'active' || agent.status === 'restarting';
              const slugOrId = agent.slug ?? agent.id;
              return (
                <article
                  key={agent.id}
                  className={`${styles.card} ${
                    agent.status === 'active' ? styles.statusActive :
                    (agent.status === 'error' || agent.status === 'killed') ? styles.statusError : ''
                  }`}
                  onClick={() => router.push(`/dashboard/agent/${agent.id}`)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') router.push(`/dashboard/agent/${agent.id}`);
                  }}
                >
                  <div className={styles.cardHead}>
                    <span className={styles.cardGlyph} aria-hidden>{FRAMEWORK_GLYPH[agent.framework] ?? '◇'}</span>
                    <span className={styles.cardName}>{agent.name}</span>
                    <span className={`${styles.statusPill} ${statusClass(agent.status)}`}>
                      <span className={`${styles.statusDot} ${isRunning ? styles.pulse : ''}`} />
                      {tStatus(agent.status as 'active' | 'sleeping' | 'paused' | 'error' | 'restarting' | 'stopping' | 'killed')}
                    </span>
                  </div>

                  <div className={styles.cardMeta}>
                    <span className={`${styles.frameworkBadge} ${styles[agent.framework] ?? ''}`}>
                      {FRAMEWORK_LABEL[agent.framework] ?? agent.framework}
                    </span>
                    <span className={styles.dot}>·</span>
                    <span>{(agent.messageCount ?? 0).toLocaleString()} {t('msgsShort')}</span>
                    <span className={styles.dot}>·</span>
                    <span>{timeAgo(new Date(agent.updatedAt ?? agent.createdAt))}</span>
                  </div>

                  <p className={`${styles.description} ${!agent.description ? styles.descriptionEmpty : ''}`}>
                    {agent.description || tc('noDescription')}
                  </p>

                  <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/agent/${slugOrId}/room?from=agents`}
                      className={`${styles.actionBtn} ${styles.primary}`}
                      onClick={(e) => e.stopPropagation()}
                      title={t('cardOpenTooltip')}
                    >
                      ▎ {t('cardOpen')}
                    </Link>
                    {isRunning ? (
                      <button
                        type="button"
                        className={styles.actionBtn}
                        disabled={busy}
                        onClick={() => runAction(agent, api.stopAgent, `${t('actionStop')} — ${agent.name}`)}
                        title={t('actionStop')}
                      >
                        <Square size={11} /> {t('actionStop')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.actionBtn}
                        disabled={busy}
                        onClick={() => runAction(agent, api.startAgent, `${t('actionStart')} — ${agent.name}`)}
                        title={t('actionStart')}
                      >
                        <Play size={11} /> {t('actionStart')}
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.actionBtn}
                      disabled={busy}
                      onClick={() => runAction(agent, api.restartAgent, `${t('actionRestart')} — ${agent.name}`)}
                      title={t('actionRestart')}
                    >
                      <RotateCcw size={11} /> {t('actionRestart')}
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.danger}`}
                      disabled={busy}
                      onClick={() => handleDelete(agent)}
                      title={tc('delete')}
                      aria-label={tc('delete')}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
