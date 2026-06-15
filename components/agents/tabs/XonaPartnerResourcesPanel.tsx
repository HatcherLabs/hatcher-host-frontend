'use client';

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { GlassCard, Skeleton } from '../AgentContext';
import { api } from '@/lib/api';
import type { XonaConfigStatus } from '@/lib/api';

export function XonaPartnerResourcesPanel({ agentId }: { agentId: string }) {
  const [config, setConfig] = useState<XonaConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getAgentXonaConfig(agentId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setConfig(res.data);
          setError(null);
        } else {
          setError(res.error ?? 'Xona status unavailable');
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Xona status unavailable');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  const tools = config?.tools ?? [];

  return (
    <GlassCard className="p-4 border-[var(--color-success-border)] bg-[var(--color-success-bg)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-success)]">
              <Zap size={12} /> Xona
            </span>
            <span className="text-xs text-[var(--text-muted)]">xPay partner resources</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            Creative and crypto intelligence tools for this agent
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--text-secondary)]">
            Agents call Xona through Hatcher&apos;s proxy. xPay payments are signed server-side, then Hatcher
            deducts AI Credits only after a successful resource response.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className={`rounded-full border px-2 py-1 ${
            config?.configured
              ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
              : 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
          }`}>
            {loading ? 'Checking' : config?.configured ? 'Payer ready' : 'Payer not configured'}
          </span>
          {config?.keySource && config.keySource !== 'none' && (
            <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] px-2 py-1 text-[var(--text-muted)]">
              {config.keySource === 'conduit' ? 'Treasury fallback' : 'Xona payer'}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] px-3 py-2 text-xs text-[var(--color-destructive)]">
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)
          : tools.map((tool) => (
            <div key={tool.id} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{tool.label}</div>
                  <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
                    {tool.description}
                  </div>
                </div>
                <span className="shrink-0 rounded border border-[var(--border-default)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                  {tool.method}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                <span>${tool.estimatedCostUsd.toFixed(2)}</span>
                <span>{tool.estimatedAiCredits} AI Credits est.</span>
              </div>
            </div>
          ))}
      </div>
    </GlassCard>
  );
}
