'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Clock, ExternalLink, Flame, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { TokenBurnSummary } from '@/lib/token-burns';

type BurnTrackerState = {
  data: TokenBurnSummary | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

export function TokenBurnTracker() {
  const t = useTranslations('token');
  const [state, setState] = useState<BurnTrackerState>({
    data: null,
    loading: true,
    refreshing: false,
    error: null,
  });

  const loadBurns = useCallback(async (refresh = false) => {
    setState((current) => ({
      ...current,
      loading: !current.data,
      refreshing: refresh,
      error: null,
    }));

    try {
      const response = await fetch(`/api/token/burns${refresh ? `?refresh=${Date.now()}` : ''}`, {
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message ?? 'Burn tracker unavailable');
      }
      setState({
        data: payload as TokenBurnSummary,
        loading: false,
        refreshing: false,
        error: null,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        refreshing: false,
        error: error instanceof Error ? error.message : 'Burn tracker unavailable',
      }));
    }
  }, []);

  useEffect(() => {
    void loadBurns(false);
  }, [loadBurns]);

  const stats = useMemo(() => {
    const data = state.data;
    return [
      {
        label: t('burnsTotalLabel'),
        value: data ? formatTokenAmount(data.totalBurned) : '-',
        helper: '$HATCHER',
      },
      {
        label: t('burnsTxLabel'),
        value: data ? data.burnCount.toLocaleString() : '-',
        helper: t('burnsTxHelper', { count: data?.scannedTransactions ?? 0 }),
      },
      {
        label: t('burnsSupplyLabel'),
        value: data?.burnedShareOfOriginalSupply !== null && data?.burnedShareOfOriginalSupply !== undefined
          ? formatPercent(data.burnedShareOfOriginalSupply)
          : '-',
        helper: t('burnsSupplyHelper'),
      },
      {
        label: t('burnsLatestLabel'),
        value: data?.latestBurnAt ? formatRelativeDate(data.latestBurnAt) : t('burnsNoBurnsShort'),
        helper: data?.generatedAt ? t('burnsUpdated', { time: formatDateTime(data.generatedAt) }) : t('burnsUpdating'),
      },
    ];
  }, [state.data, t]);

  const periodTotals = state.data?.periodTotals;

  return (
    <section className="px-4 py-16 border-t border-[var(--border-default)]">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <p
              className="mb-3 text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              ▎ {t('burnsEyebrow')}
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {t('burnsHeading')}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
              {t('burnsBody')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadBurns(true)}
            disabled={state.loading || state.refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-[3px] border border-[var(--border-default)] px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--text-primary)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <RefreshCw className={`h-4 w-4 ${state.refreshing ? 'animate-spin' : ''}`} />
            {state.refreshing ? t('burnsRefreshing') : t('burnsRefresh')}
          </button>
        </div>

        {state.error && (
          <div className="mb-6 rounded-[4px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {t('burnsError')}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-card)] p-5"
            >
              <p
                className="text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--text-muted)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {stat.label}
              </p>
              <p
                className="mt-3 text-2xl font-bold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {state.loading ? <span className="block h-8 w-28 animate-pulse rounded bg-[var(--bg-elevated)]" /> : stat.value}
              </p>
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">{stat.helper}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[0.8fr,1.2fr]">
          <div className="rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--accent)]" />
              <h3
                className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {t('burnsPeriodHeading')}
              </h3>
            </div>
            <div className="mt-5 space-y-4">
              <PeriodRow label={t('burns24h')} value={periodTotals?.day ?? 0} max={maxPeriodTotal(periodTotals)} />
              <PeriodRow label={t('burns7d')} value={periodTotals?.week ?? 0} max={maxPeriodTotal(periodTotals)} />
              <PeriodRow label={t('burns30d')} value={periodTotals?.month ?? 0} max={maxPeriodTotal(periodTotals)} />
            </div>
            <p className="mt-5 text-xs leading-relaxed text-[var(--text-tertiary)]">
              {t('burnsSourceNote')}
            </p>
          </div>

          <div className="rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-card)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border-default)] px-5 py-4">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-300" />
                <h3
                  className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--text-primary)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {t('burnsFeedHeading')}
                </h3>
              </div>
              {state.data?.explorerUrl && (
                <a
                  href={state.data.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
                >
                  {t('viewSolscan')}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {state.loading ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-14 animate-pulse rounded-[3px] bg-[var(--bg-elevated)]" />
                  ))}
                </div>
              ) : state.data && state.data.burns.length > 0 ? (
                state.data.burns.map((burn) => (
                  <a
                    key={burn.id}
                    href={burn.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid gap-3 border-b border-[var(--border-default)] px-5 py-4 transition-colors last:border-b-0 hover:bg-[var(--bg-elevated)] sm:grid-cols-[1fr,auto]"
                  >
                    <span>
                      <span
                        className="block text-sm font-bold text-[var(--text-primary)]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {formatTokenAmount(burn.amount)} $HATCHER
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
                        <Clock className="h-3.5 w-3.5" />
                        {burn.blockTime ? formatDateTime(burn.blockTime * 1_000) : t('burnsUnknownTime')}
                        <span aria-hidden>·</span>
                        {shortSignature(burn.signature)}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 self-center text-xs font-medium text-[var(--accent)]">
                      Solscan
                      <ExternalLink className="h-3.5 w-3.5" />
                    </span>
                  </a>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t('burnsNoBurns')}</p>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--text-tertiary)]">
                    {t('burnsNoBurnsBody')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PeriodRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.max(5, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-[var(--text-secondary)]">{label}</span>
        <span
          className="font-bold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {formatTokenAmount(value)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function maxPeriodTotal(periodTotals: TokenBurnSummary['periodTotals'] | undefined): number {
  if (!periodTotals) return 0;
  return Math.max(periodTotals.day, periodTotals.week, periodTotals.month);
}

function formatTokenAmount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 1_000 ? 0 : 3,
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 3,
  }).format(value);
}

function formatDateTime(value: string | number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatRelativeDate(blockTime: number): string {
  const diffMs = Date.now() - blockTime * 1_000;
  const diffHours = Math.floor(diffMs / (60 * 60 * 1_000));
  if (diffHours < 1) return 'just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function shortSignature(signature: string): string {
  if (signature.length <= 12) return signature;
  return `${signature.slice(0, 6)}...${signature.slice(-6)}`;
}
