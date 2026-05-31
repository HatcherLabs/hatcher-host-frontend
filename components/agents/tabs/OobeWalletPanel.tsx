'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Network,
  RefreshCw,
  RadioTower,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { OobeConfigStatus } from '@/lib/api';
import { GlassCard } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

function short(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 18) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extractAgents(value: unknown): unknown[] {
  if (!value || typeof value !== 'object') return [];
  const agents = (value as Record<string, unknown>).agents;
  return Array.isArray(agents) ? agents : [];
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function StatusTile({
  label,
  value,
  description,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  tone: 'good' | 'warn' | 'muted';
  icon: typeof CheckCircle2;
}) {
  const toneClass = tone === 'good'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : tone === 'warn'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
      : 'border-[var(--border-subtle)] bg-black/20 text-[var(--text-muted)]';
  return (
    <div className={`rounded-md border px-3 py-3 ${toneClass}`}>
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] opacity-80">
        <Icon size={13} /> {label}
      </div>
      <div className="mt-2 break-all font-mono text-sm text-[var(--text-primary)]">{value}</div>
      <p className="mt-1 text-xs leading-relaxed opacity-80">{description}</p>
    </div>
  );
}

export function OobeWalletPanel({ agentId }: { agentId: string }) {
  const { toast } = useToast();
  const [config, setConfig] = useState<OobeConfigStatus | null>(null);
  const [networkStatus, setNetworkStatus] = useState<unknown | null>(null);
  const [discovery, setDiscovery] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [checking, setChecking] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentOobeConfig(agentId);
      if (res.success) setConfig(res.data);
      else setError(res.error);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const checkNetwork = async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await api.getAgentOobeNetworkStatus(agentId);
      if (res.success) {
        setNetworkStatus(res.data);
        toast.success('OOBE network status refreshed');
      } else {
        setError(res.error);
      }
    } finally {
      setChecking(false);
    }
  };

  const discoverHatcherAgents = async () => {
    setDiscovering(true);
    setError(null);
    try {
      const res = await api.discoverAgentOobeSap(agentId, {
        capability: 'hatcher:agent-task',
        limit: 8,
      });
      if (res.success) {
        setDiscovery(res.data);
        toast.success('SAP discovery complete');
      } else {
        setError(res.error);
      }
    } finally {
      setDiscovering(false);
    }
  };

  const registerSap = async () => {
    setRegistering(true);
    setError(null);
    try {
      const res = await api.registerAgentOobeSap(agentId, {
        pricePerCallUsdc: config?.defaultPriceUsdc,
      });
      if (res.success) {
        setConfig((current) => current ? { ...current, registration: res.data.registration } : current);
        const syncedIndexes = res.data.upstream.indexTxSignatures?.length ?? 0;
        toast.success(
          syncedIndexes
            ? `SAP discovery indexes synced (${syncedIndexes})`
            : res.data.upstream.skipped ? 'SAP registration already exists' : 'Agent registered on SAP',
        );
        await load();
      } else {
        setError(res.error);
      }
    } finally {
      setRegistering(false);
    }
  };

  const copyX402Endpoint = async () => {
    if (!config?.x402ProviderEndpoint) return;
    await navigator.clipboard.writeText(config.x402ProviderEndpoint);
    toast.success('x402 endpoint copied');
  };

  const registration = config?.registration ?? null;
  const discoveredAgents = useMemo(() => extractAgents(discovery), [discovery]);

  return (
    <GlassCard className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <Network size={12} /> OOBE Synapse
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">SAP identity and discovery</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--text-muted)]">
            Route read-only Solana RPC through Synapse, register this Hatcher agent on SAP, and expose paid x402
            calls through a Hatcher-guarded provider endpoint.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="https://explorer.oobeprotocol.ai" target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2">
            <ExternalLink size={14} />
            Explorer
          </a>
          <button type="button" onClick={() => void load()} className="btn-secondary inline-flex items-center gap-2" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatusTile
          label="Synapse RPC"
          value={config?.rpcConfigured ? config.cluster : 'not configured'}
          tone={config?.rpcConfigured ? 'good' : 'warn'}
          description={config?.rpcUrl ?? 'Waiting for OOBE RPC configuration.'}
          icon={RadioTower}
        />
        <StatusTile
          label="SAP program"
          value={short(config?.sapProgramId)}
          tone={config?.sapEnabled ? 'good' : 'warn'}
          description="Mainnet SAP identity, reputation, and discovery program."
          icon={ShieldCheck}
        />
        <StatusTile
          label="Agent wallet"
          value={short(config?.agentWallet)}
          tone={config?.agentWallet ? 'good' : 'warn'}
          description="SAP registration signs server-side with this agent's Solana wallet."
          icon={Wallet}
        />
        <StatusTile
          label="x402 calls"
          value={config?.x402Enabled ? `${config.x402DefaultPriceLamports} lamports` : 'disabled'}
          tone={config?.x402Enabled ? 'good' : 'muted'}
          description="Escrow creation, top-ups, provider callback, and settlement stay behind Hatcher guardrails."
          icon={Sparkles}
        />
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">SAP registration</h4>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                Registers this agent as an OOBE SAP identity and publishes the Hatcher x402 provider endpoint when
                enabled, so SAP clients can route paid jobs into the agent runtime.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-amber-100/80">
                Mainnet registration uses the agent Solana wallet and should keep at least 0.05 SOL available for
                SAP account rent and transaction fees.
              </p>
            </div>
            <span className={`rounded-full border px-2 py-1 font-mono text-[10px] uppercase ${
              registration
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
            }`}>
              {registration ? 'registered' : 'not registered'}
            </span>
          </div>

          <div className="mt-4 grid gap-2 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)]">Agent PDA</span>
              <span className="break-all font-mono text-[var(--text-primary)]">{short(registration?.agentPda)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)]">Tx</span>
              <span className="break-all font-mono text-[var(--text-primary)]">{short(registration?.txSignature)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)]">Price</span>
              <span className="font-mono text-[var(--text-primary)]">${(registration?.pricePerCallUsdc ?? config?.defaultPriceUsdc ?? 0).toFixed(3)}/call</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)]">Registered</span>
              <span className="font-mono text-[var(--text-primary)]">{formatDate(registration?.registeredAt)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-muted)]">Indexed</span>
              <span className="font-mono text-[var(--text-primary)]">{formatDate(registration?.indexedAt)}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-[var(--text-muted)]">x402 endpoint</span>
              <div className="flex min-w-0 items-center gap-2">
                <span className="break-all font-mono text-[var(--text-primary)]">
                  {short(registration?.x402Endpoint ?? config?.x402ProviderEndpoint)}
                </span>
                {config?.x402ProviderEndpoint ? (
                  <button
                    type="button"
                    onClick={() => void copyX402Endpoint()}
                    className="rounded border border-[var(--border-subtle)] p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    title="Copy x402 endpoint"
                  >
                    <Copy size={12} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {registration?.capabilities?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {registration.capabilities.map((capability) => (
                <span key={capability.id} className="rounded-full border border-[var(--border-subtle)] bg-white/5 px-2 py-1 font-mono text-[10px] text-[var(--text-muted)]">
                  {capability.id}
                </span>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void registerSap()}
            disabled={registering || !config?.agentWallet || config.sapRegistrationEnabled === false}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            <Sparkles size={14} />
            {registering ? 'Registering...' : registration ? 'Re-register / update' : 'Register on SAP'}
          </button>
        </div>

        <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Discovery and network checks</h4>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                Inspect SAP network status and discover Hatcher-capable SAP agents by indexed capability.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void checkNetwork()} disabled={checking} className="btn-secondary inline-flex items-center gap-2">
                <RadioTower size={14} className={checking ? 'animate-pulse' : ''} />
                Status
              </button>
              <button type="button" onClick={() => void discoverHatcherAgents()} disabled={discovering} className="btn-secondary inline-flex items-center gap-2">
                <Search size={14} />
                Discover
              </button>
            </div>
          </div>

          {discoveredAgents.length > 0 ? (
            <div className="mt-4 space-y-2">
              {discoveredAgents.slice(0, 6).map((agent, index) => {
                const row = agent && typeof agent === 'object' ? agent as Record<string, unknown> : {};
                return (
                  <div key={`${String(row.pda ?? index)}`} className="rounded border border-[var(--border-subtle)] bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-xs text-[var(--text-primary)]">{String(row.name ?? 'SAP Agent')}</span>
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">{short(String(row.wallet ?? row.pda ?? ''))}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{String(row.description ?? 'No description')}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded border border-dashed border-[var(--border-subtle)] px-3 py-4 text-xs text-[var(--text-muted)]">
              No discovery results loaded yet.
            </div>
          )}

          {networkStatus ? (
            <details className="mt-4 rounded-md border border-[var(--border-subtle)] bg-black/30 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-[var(--text-primary)]">Latest network status</summary>
              <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words text-[11px] text-[var(--text-muted)]">
                {prettyJson(networkStatus)}
              </pre>
            </details>
          ) : null}
        </div>
      </div>
    </GlassCard>
  );
}
