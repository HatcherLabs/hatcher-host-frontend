'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  KeyRound,
  Lock,
  RefreshCw,
  Shield,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  KausalayerConfigStatus,
  KausalayerHealthResponse,
  KausalayerResourceResult,
  KausalayerResourcesResponse,
} from '@/lib/api';
import { GlassCard } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

const SAFE_UTILITY_LABELS = ['fee estimates', 'token lookup', 'token resolve', 'swap quotes', 'proof verification'];
const PRIVATE_CAPABILITY_LABELS = [
  'private pockets',
  'send links',
  'saved wallets',
  'contacts',
  'private routes',
  'history',
  'sweeps',
  'swap execution',
];

function statusTone(value: boolean): string {
  return value
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : 'border-amber-500/30 bg-amber-500/10 text-amber-100';
}

function short(value: unknown): string {
  if (typeof value !== 'string') return '-';
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function extractItems(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  for (const key of ['pockets', 'saved_wallets', 'savedWallets', 'wallets', 'contacts', 'items', 'results', 'data']) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function itemTitle(item: unknown): string {
  if (!item || typeof item !== 'object') return String(item);
  const record = item as Record<string, unknown>;
  for (const key of ['label', 'name', 'alias', 'type', 'id', 'pocket_id', 'wallet_address', 'address']) {
    if (typeof record[key] === 'string' && record[key]) return String(record[key]);
  }
  return 'Resource';
}

function itemSubtitle(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null;
  const record = item as Record<string, unknown>;
  const parts = [
    typeof record.status === 'string' ? record.status : null,
    typeof record.address === 'string' ? short(record.address) : null,
    typeof record.wallet_address === 'string' ? short(record.wallet_address) : null,
    typeof record.created_at === 'string' ? new Date(record.created_at).toLocaleString() : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' - ') : null;
}

export function KausalayerWalletPanel({ agentId }: { agentId: string }) {
  const { toast } = useToast();
  const [config, setConfig] = useState<KausalayerConfigStatus | null>(null);
  const [health, setHealth] = useState<KausalayerHealthResponse | null>(null);
  const [resources, setResources] = useState<KausalayerResourcesResponse | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAgentKey = config?.keySource === 'agent';
  const hasPlatformKey = config?.keySource === 'platform';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [configRes, healthRes, resourcesRes] = await Promise.all([
        api.getAgentKausalayerConfig(agentId),
        api.getAgentKausalayerHealth(agentId),
        api.getAgentKausalayerResources(agentId),
      ]);
      if (configRes.success) setConfig(configRes.data);
      else setError(configRes.error);
      if (healthRes.success) setHealth(healthRes.data);
      if (resourcesRes.success) {
        setResources(resourcesRes.data);
        setConfig(resourcesRes.data.config);
      } else {
        setError(resourcesRes.error);
      }
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveKey = async () => {
    if (!apiKey.trim()) {
      setError('Paste a KausaLayer API key first.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await api.updateAgentKausalayerConfig(agentId, {
        enabled: true,
        apiKey: apiKey.trim(),
      });
      if (res.success) {
        setConfig(res.data);
        setApiKey('');
        toast.success('KausaLayer key saved');
        await load();
      } else {
        setError(res.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const removeKey = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.clearAgentKausalayerConfig(agentId);
      if (res.success) {
        setConfig(res.data);
        toast.success('KausaLayer key removed');
        await load();
      } else {
        setError(res.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success('Copied');
  };

  const resourceCards = useMemo(() => [
    { title: 'Pockets', description: 'Private SOL pockets created or visible through this agent key.', result: resources?.pockets },
    { title: 'Saved wallets', description: 'KausaLayer saved wallet targets attached to this key.', result: resources?.savedWallets },
    { title: 'Contacts', description: 'Private address book entries returned by KausaLayer.', result: resources?.contacts },
  ], [resources]);

  return (
    <GlassCard className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <Shield size={12} /> KausaLayer
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Private Solana pockets</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--text-muted)]">
            Agents can use basic KausaLayer utility calls through Hatcher. Private pockets and account resources require
            this agent's own KausaLayer API key.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="https://kausalayer.com/mcp" target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2">
            <ExternalLink size={14} />
            Kausa MCP
          </a>
          <button type="button" onClick={() => void load()} className="btn-secondary inline-flex items-center gap-2" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <StatusTile
          label="Platform utilities"
          value={hasPlatformKey || hasAgentKey ? 'available' : 'missing'}
          tone={hasPlatformKey || hasAgentKey}
          description="Safe utility calls can run without exposing the Hatcher KausaLayer key."
        />
        <StatusTile
          label="Private resources"
          value={hasAgentKey ? 'owner key' : 'locked'}
          tone={hasAgentKey}
          description="Pockets, routes, sweeps, exports, and account data require an agent key."
        />
        <StatusTile
          label="Kausa API"
          value={health?.status ?? (config?.configured ? 'configured' : 'unknown')}
          tone={Boolean(config?.configured)}
          description={config?.keySource ? `Current source: ${config.keySource}` : 'Waiting for status.'}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
            <div className="flex items-start gap-3">
              <KeyRound size={16} className="mt-0.5 text-[var(--phosphor)]" />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Agent KausaLayer key</h4>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                  Add a KausaLayer API key owned by this agent or owner to unlock private pockets. The key stays
                  encrypted server-side and is not exposed to the browser or runtime.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={hasAgentKey ? 'Agent key configured. Paste a new key to rotate.' : 'kl_...'}
                className="config-input min-w-0 flex-1 text-sm"
              />
              <button type="button" onClick={() => void saveKey()} disabled={saving || !apiKey.trim()} className="btn-primary inline-flex items-center justify-center gap-2">
                <KeyRound size={14} />
                Save
              </button>
              {hasAgentKey && (
                <button type="button" onClick={() => void removeKey()} disabled={saving} className="btn-secondary inline-flex items-center justify-center gap-2">
                  <Trash2 size={14} />
                  Remove
                </button>
              )}
            </div>
            {error && (
              <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <CapabilityList title="Works with Hatcher key" items={SAFE_UTILITY_LABELS} active />
            <CapabilityList title="Needs owner key" items={PRIVATE_CAPABILITY_LABELS} active={hasAgentKey} />
          </div>
        </div>

        <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Private Kausa resources</h4>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Visible only when this agent has its own KausaLayer API key.
              </p>
            </div>
            {!hasAgentKey && <Lock size={16} className="text-amber-200" />}
          </div>

          {!hasAgentKey ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs text-amber-100">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Add an agent key to let the agent create, list, and manage private pockets through KausaLayer.
            </div>
          ) : (
            <div className="space-y-3">
              {resourceCards.map((card) => (
                <ResourceCard
                  key={card.title}
                  title={card.title}
                  description={card.description}
                  result={card.result}
                  onCopy={copy}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function StatusTile({
  label,
  value,
  tone,
  description,
}: {
  label: string;
  value: string;
  tone: boolean;
  description: string;
}) {
  return (
    <div className={`rounded-md border px-3 py-3 ${statusTone(tone)}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em]">{label}</div>
      <div className="mt-2 font-mono text-sm text-[var(--text-primary)]">{value}</div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{description}</p>
    </div>
  );
}

function CapabilityList({ title, items, active }: { title: string; items: string[]; active: boolean }) {
  return (
    <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
        {active ? <WalletCards size={14} className="text-[var(--phosphor)]" /> : <Lock size={14} className="text-amber-200" />}
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className={`rounded border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ${
              active
                ? 'border-[var(--phosphor)]/25 bg-[var(--phosphor)]/10 text-[var(--phosphor)]'
                : 'border-amber-500/25 bg-amber-500/10 text-amber-100'
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResourceCard({
  title,
  description,
  result,
  onCopy,
}: {
  title: string;
  description: string;
  result: KausalayerResourceResult | undefined;
  onCopy: (value: string) => Promise<void>;
}) {
  const items = extractItems(result?.data);
  const hasRaw = result?.data != null && items.length === 0;

  return (
    <div className="rounded-md border border-[var(--border-subtle)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-[var(--text-primary)]">{title}</div>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{description}</p>
        </div>
        {result?.data != null && (
          <button type="button" onClick={() => void onCopy(formatJson(result.data))} className="text-[var(--phosphor)]">
            <Copy size={13} />
          </button>
        )}
      </div>

      {result?.error ? (
        <div className="mt-3 rounded border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-100">
          {result.error}
        </div>
      ) : items.length > 0 ? (
        <div className="mt-3 space-y-2">
          {items.slice(0, 5).map((item, index) => (
            <div key={index} className="rounded border border-[var(--border-subtle)] bg-black/20 px-2 py-2">
              <div className="truncate text-xs font-medium text-[var(--text-primary)]">{itemTitle(item)}</div>
              {itemSubtitle(item) && <div className="mt-1 truncate font-mono text-[10px] text-[var(--text-muted)]">{itemSubtitle(item)}</div>}
            </div>
          ))}
          {items.length > 5 && <div className="text-[10px] text-[var(--text-muted)]">+{items.length - 5} more</div>}
        </div>
      ) : hasRaw ? (
        <pre className="mt-3 max-h-36 overflow-auto rounded border border-[var(--border-subtle)] bg-black/20 p-2 text-[10px] text-[var(--text-muted)]">
          {formatJson(result?.data)}
        </pre>
      ) : (
        <div className="mt-3 rounded border border-dashed border-[var(--border-subtle)] px-2 py-4 text-center text-xs text-[var(--text-muted)]">
          No resources returned yet.
        </div>
      )}
    </div>
  );
}
