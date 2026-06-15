'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, Coins, Loader2, RefreshCw, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatFeatureKey } from '@/lib/feature-labels';
import styles from './AiCreditStatus.module.css';

type AiCreditBalance = {
  balance: number;
  monthlyGrant: number;
  tier: string;
};

type AiCreditOverview = {
  usedLast30: number;
  actionsLast30: number;
  inputTokensLast30: number;
  outputTokensLast30: number;
  byKind: Array<{ kind: string; credits: number; actions: number }>;
};

type AiCreditUsage = {
  id: string;
  agentId: string | null;
  agentName: string | null;
  kind: string;
  provider: string;
  model: string | null;
  credits: number;
  providerCostUsd: string | number;
  createdAt: string;
};

type Props = {
  variant?: 'nav' | 'drawer';
  onNavigate?: () => void;
};

const REFRESH_MS = 60_000;

function formatCredits(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}K`;
  return Math.round(value).toLocaleString();
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeKind(kind: string): string {
  return kind
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AiCreditStatus({ variant = 'nav', onNavigate }: Props) {
  const [balance, setBalance] = useState<AiCreditBalance | null>(null);
  const [overview, setOverview] = useState<AiCreditOverview | null>(null);
  const [usage, setUsage] = useState<AiCreditUsage[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lowBalance = balance !== null && balance.balance < 100;

  const loadBalance = useCallback(async () => {
    setLoadingBalance(true);
    try {
      const res = await api.getAiCreditBalance();
      if (res.success) {
        setBalance(res.data);
        setError(null);
      } else {
        setError(res.error ?? 'Could not load AI Credits.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load AI Credits.');
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  const loadDetails = useCallback(async () => {
    setLoadingDetails(true);
    try {
      const [analyticsRes, historyRes] = await Promise.all([
        api.getAccountAnalytics(),
        api.getAiCreditHistory(8),
      ]);
      if (analyticsRes.success) {
        setOverview({
          usedLast30: analyticsRes.data.aiCredits.usedLast30,
          actionsLast30: analyticsRes.data.aiCredits.actionsLast30,
          inputTokensLast30: analyticsRes.data.aiCredits.inputTokensLast30,
          outputTokensLast30: analyticsRes.data.aiCredits.outputTokensLast30,
          byKind: analyticsRes.data.aiCredits.byKind,
        });
      }
      if (historyRes.success) {
        setUsage(historyRes.data.usage);
      }
      if (!analyticsRes.success || !historyRes.success) {
        setError(
          (!analyticsRes.success ? analyticsRes.error : undefined)
            ?? (!historyRes.success ? historyRes.error : undefined)
            ?? 'Could not load AI Credit details.',
        );
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load AI Credit details.');
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    void loadBalance();
    const timer = window.setInterval(() => void loadBalance(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadBalance]);

  useEffect(() => {
    if (!open) return;
    void loadDetails();
  }, [loadDetails, open]);

  const topKinds = useMemo(() => {
    return (overview?.byKind ?? [])
      .slice()
      .sort((a, b) => b.credits - a.credits)
      .slice(0, 4);
  }, [overview?.byKind]);

  return (
    <>
      <button
        type="button"
        className={`${styles.trigger} ${styles[variant]} ${lowBalance ? styles.low : ''}`}
        onClick={() => setOpen(true)}
        aria-label="Open AI Credit usage"
      >
        <Coins size={variant === 'drawer' ? 16 : 14} />
        <span className={styles.triggerText}>
          <span className={styles.triggerLabel}>AI Credits</span>
          <span className={styles.triggerValue}>
            {loadingBalance && !balance ? '...' : formatCredits(balance?.balance ?? 0)}
          </span>
        </span>
      </button>

      {open && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="AI Credit usage">
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Close AI Credit usage"
            onClick={() => setOpen(false)}
          />
          <div className={styles.modal}>
            <div className={styles.header}>
              <div>
                <p className={styles.eyebrow}>Account usage</p>
                <h2>AI Credits</h2>
              </div>
              <div className={styles.headerActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => {
                    void loadBalance();
                    void loadDetails();
                  }}
                  aria-label="Refresh AI Credit usage"
                >
                  <RefreshCw size={15} className={loadingBalance || loadingDetails ? styles.spin : ''} />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => setOpen(false)}
                  aria-label="Close AI Credit usage"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className={styles.balanceRow}>
              <div>
                <span className={styles.metricLabel}>Available</span>
                <strong>{(balance?.balance ?? 0).toLocaleString()}</strong>
              </div>
              <div>
                <span className={styles.metricLabel}>Monthly grant</span>
                <strong>{(balance?.monthlyGrant ?? 0).toLocaleString()}</strong>
              </div>
              <div>
                <span className={styles.metricLabel}>Plan</span>
                <strong>{balance?.tier ? formatFeatureKey(balance.tier) : '...'}</strong>
              </div>
            </div>

            {overview && (
              <div className={styles.overviewGrid}>
                <div className={styles.panel}>
                  <span className={styles.metricLabel}>Used last 30 days</span>
                  <strong>{overview.usedLast30.toLocaleString()}</strong>
                  <span>{overview.actionsLast30.toLocaleString()} metered actions</span>
                </div>
                <div className={styles.panel}>
                  <span className={styles.metricLabel}>Tokens last 30 days</span>
                  <strong>{(overview.inputTokensLast30 + overview.outputTokensLast30).toLocaleString()}</strong>
                  <span>
                    {overview.inputTokensLast30.toLocaleString()} in · {overview.outputTokensLast30.toLocaleString()} out
                  </span>
                </div>
              </div>
            )}

            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <Activity size={14} />
                Breakdown
              </div>
              {loadingDetails && !overview ? (
                <span className={styles.loadingLine}><Loader2 size={14} className={styles.spin} /> Loading usage...</span>
              ) : topKinds.length > 0 ? (
                <div className={styles.kindList}>
                  {topKinds.map((item) => (
                    <div key={item.kind} className={styles.kindRow}>
                      <span>{normalizeKind(item.kind)}</span>
                      <strong>{item.credits.toLocaleString()}</strong>
                      <small>{item.actions.toLocaleString()} actions</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>No metered usage yet.</p>
              )}
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>Recent usage</div>
              {usage.length > 0 ? (
                <div className={styles.usageList}>
                  {usage.map((item) => (
                    <div key={item.id} className={styles.usageRow}>
                      <div>
                        <span>{normalizeKind(item.kind)}</span>
                        <small>
                          {[item.agentName, item.provider, item.model].filter(Boolean).join(' · ')}
                        </small>
                      </div>
                      <div className={styles.usageValue}>
                        <strong>{item.credits.toLocaleString()}</strong>
                        <small>{formatDate(item.createdAt)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>Recent usage will appear here after hosted calls.</p>
              )}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <Link
              href="/dashboard/billing"
              className={styles.billingLink}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
            >
              Manage AI Credits
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
