'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Cpu, Link as LinkIcon, Server } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';

interface OpenClawConfigSnapshot {
  source: 'live' | 'snapshot' | 'none';
  config: Record<string, unknown> | null;
  snapshotAt: string | null;
  managed: boolean;
}

/**
 * Drill down into the openclaw.json config for a gateway summary.
 * Pulls the top-level model provider, gateway bind, and endpoint
 * toggles without rendering the whole (huge) config.
 */
function pickGatewayInfo(config: Record<string, unknown> | null) {
  if (!config) return null;
  const gateway = (config.gateway as Record<string, unknown> | undefined) ?? {};
  const http = (gateway.http as Record<string, unknown> | undefined) ?? {};
  const endpoints = (http.endpoints as Record<string, unknown> | undefined) ?? {};
  const models = (config.models as Record<string, unknown> | undefined) ?? {};
  const providers = (models.providers as Record<string, unknown> | undefined) ?? {};
  const providerList = Object.keys(providers);

  // Walk the first provider to pull the primary model name
  let primaryModel: string | null = null;
  if (providerList.length > 0) {
    const firstProvider = providers[providerList[0]!] as Record<string, unknown> | undefined;
    const modelsArr = firstProvider?.models as Array<{ id?: string; name?: string }> | undefined;
    if (modelsArr && modelsArr.length > 0) {
      primaryModel = modelsArr[0]?.name ?? modelsArr[0]?.id ?? null;
    }
  }

  return {
    port: gateway.port as number | undefined,
    bind: gateway.bind as string | undefined,
    authMode: ((gateway.auth as Record<string, unknown> | undefined)?.mode) as string | undefined,
    responsesEnabled: Boolean(
      (endpoints.responses as Record<string, unknown> | undefined)?.enabled,
    ),
    chatCompletionsEnabled: Boolean(
      (endpoints.chatCompletions as Record<string, unknown> | undefined)?.enabled,
    ),
    providerCount: providerList.length,
    firstProvider: providerList[0] ?? null,
    primaryModel,
  };
}

/**
 * OpenClaw gateway runtime card. Reads the live openclaw.json (or
 * the last DB snapshot if the container is stopped) and surfaces
 * the gateway bind, port, active model, and enabled HTTP endpoints.
 *
 * Only useful for managed-mode agents — legacy OpenClaw agents
 * have no persistent config snapshot endpoint. Gracefully degrades
 * for them via the `managed` flag from the API response.
 */
export function OpenClawGatewayCard() {
  const { agent } = useAgentContext();
  const [data, setData] = useState<OpenClawConfigSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.getAgentOpenClawConfig(agent.id);
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setError('error' in res ? res.error : 'Failed to load config');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agent.id]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  if (loading && !data) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  if (error || !data || !data.config) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <AlertTriangle size={14} className="text-amber-400" />
          Gateway config unavailable{error ? `: ${error}` : ''}
        </div>
      </GlassCard>
    );
  }

  const info = pickGatewayInfo(data.config);
  if (!info) return null;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Server size={14} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Gateway</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-default)]">
            {data.source === 'live' ? 'live' : data.source === 'snapshot' ? 'snapshot' : 'n/a'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="flex items-center gap-1.5">
            <LinkIcon size={12} className="text-amber-400" />
            <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
              {info.bind ?? 'lan'}:{info.port ?? 18789}
            </span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">Bind / Port</div>
        </div>

        <div className="rounded-xl px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="flex items-center gap-1.5">
            <Cpu size={12} className="text-amber-400" />
            <span
              className="text-sm font-semibold text-[var(--text-primary)] truncate"
              title={info.primaryModel ?? ''}
            >
              {info.primaryModel ?? '—'}
            </span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">Primary Model</div>
        </div>

        <div className="rounded-xl px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="text-sm font-semibold text-[var(--text-primary)] capitalize truncate">
            {info.firstProvider ?? '—'}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">
            Provider{info.providerCount > 1 ? ` (+${info.providerCount - 1})` : ''}
          </div>
        </div>

        <div className="rounded-xl px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                info.responsesEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-default)]'
              }`}
              title="/v1/responses endpoint"
            >
              responses
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                info.chatCompletionsEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-default)]'
              }`}
              title="/v1/chat/completions endpoint"
            >
              chat
            </span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">HTTP Endpoints</div>
        </div>
      </div>
    </GlassCard>
  );
}
