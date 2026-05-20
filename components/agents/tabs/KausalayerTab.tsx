'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Copy, ExternalLink, KeyRound, Play, RefreshCw, Shield, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { KausalayerConfigStatus, KausalayerHealthResponse, KausalayerTool } from '@/lib/api';
import { GlassCard, useAgentContext } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

const DEFAULT_CALL = JSON.stringify({
  tool: 'estimate_fee',
  arguments: {
    amount_sol: 0.05,
    operation: 'pocket',
    complexity: 'medium',
  },
}, null, 2);

const PLATFORM_BLOCKED_TOOLS = new Set([
  'add_contact',
  'add_saved_wallet',
  'archive_pocket',
  'delete_contact',
  'delete_pocket',
  'export_pocket_key',
  'get_route_history',
  'get_transaction_history',
  'get_maze_preferences',
  'get_tier_info',
  'get_usage_stats',
  'kausa_gate_list',
  'kausa_gate_remove',
  'list_contacts',
  'list_pockets',
  'list_saved_wallets',
  'list_send_links',
  'remove_saved_wallet',
  'rename_pocket',
  'save_maze_preferences',
  'sweep_all_pockets',
]);

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function KausalayerTab() {
  const { agent } = useAgentContext();
  const { toast } = useToast();
  const [config, setConfig] = useState<KausalayerConfigStatus | null>(null);
  const [health, setHealth] = useState<KausalayerHealthResponse | null>(null);
  const [tools, setTools] = useState<KausalayerTool[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [callJson, setCallJson] = useState(DEFAULT_CALL);
  const [callResult, setCallResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calling, setCalling] = useState(false);

  const sortedTools = useMemo(() => {
    return [...tools].sort((a, b) => a.name.localeCompare(b.name));
  }, [tools]);

  const currentTool = useMemo(() => {
    try {
      const parsed = JSON.parse(callJson) as { tool?: unknown };
      return typeof parsed.tool === 'string' ? parsed.tool : null;
    } catch {
      return null;
    }
  }, [callJson]);

  const platformBlocked = config?.keySource === 'platform'
    && currentTool != null
    && PLATFORM_BLOCKED_TOOLS.has(currentTool);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [configRes, healthRes, toolsRes] = await Promise.all([
        api.getAgentKausalayerConfig(agent.id),
        api.getAgentKausalayerHealth(agent.id),
        api.getAgentKausalayerTools(agent.id),
      ]);
      if (configRes.success) setConfig(configRes.data);
      else setError(configRes.error);
      if (healthRes.success) setHealth(healthRes.data);
      if (toolsRes.success) setTools(toolsRes.data.tools ?? []);
      else setError(toolsRes.error);
    } finally {
      setLoading(false);
    }
  }, [agent.id]);

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
      const res = await api.updateAgentKausalayerConfig(agent.id, {
        enabled: true,
        apiKey: apiKey.trim(),
      });
      if (res.success) {
        setConfig(res.data);
        setApiKey('');
        toast.success('KausaLayer key saved');
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
      const res = await api.clearAgentKausalayerConfig(agent.id);
      if (res.success) {
        setConfig(res.data);
        toast.success('KausaLayer key removed');
      } else {
        setError(res.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const callTool = async () => {
    setCalling(true);
    setError(null);
    setCallResult(null);
    try {
      const parsed = JSON.parse(callJson) as { tool?: unknown; arguments?: unknown };
      if (typeof parsed.tool !== 'string') {
        setError('Call JSON must include a string "tool".');
        return;
      }
      const args = parsed.arguments && typeof parsed.arguments === 'object' && !Array.isArray(parsed.arguments)
        ? parsed.arguments as Record<string, unknown>
        : {};
      const res = await api.callAgentKausalayerTool(agent.id, {
        tool: parsed.tool,
        arguments: args,
      });
      if (res.success) {
        setCallResult(res.data);
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON.');
    } finally {
      setCalling(false);
    }
  };

  const copyResult = async () => {
    await navigator.clipboard.writeText(formatJson(callResult));
    toast.success('Copied');
  };

  return (
    <div className="space-y-5">
      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[var(--text-primary)]">
              <Shield size={18} className="text-[var(--phosphor)]" />
              <h2 className="text-lg font-semibold">KausaLayer Private Wallet Tools</h2>
            </div>
            <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">
              Give this agent access to KausaLayer pockets, private SOL routing, pocket swaps, payment links, and
              proof-of-privacy tools through a Hatcher proxy. The raw KausaLayer API key never reaches the browser or
              the agent container.
            </p>
          </div>
          <button type="button" onClick={() => void load()} className="btn-secondary inline-flex items-center gap-2" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <StatusPill label="API" value={health?.status ?? 'unknown'} />
          <StatusPill label="Key" value={config?.configured ? 'configured' : 'missing'} tone={config?.configured ? 'good' : 'warn'} />
          <StatusPill label="Source" value={config?.keySource ?? 'unknown'} tone={config?.keySource === 'none' ? 'warn' : 'neutral'} />
          <StatusPill label="Tools" value={String(tools.length)} />
        </div>
      </GlassCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <div className="space-y-5">
          <GlassCard className="p-5">
            <div className="flex items-start gap-3">
              <KeyRound size={17} className="mt-0.5 text-[var(--phosphor)]" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">KausaLayer proxy key</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Hatcher can use a platform KausaLayer key for all agents. Optionally, save a per-agent override from{' '}
                  <a href="https://kausalayer.com/mcp" target="_blank" rel="noreferrer" className="text-[var(--accent)]">
                    kausalayer.com/mcp <ExternalLink size={11} className="inline" />
                  </a>
                  . Saved keys are encrypted and are not returned to the frontend.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={config?.keySource === 'platform' ? 'Platform key active. Paste a key only to override.' : config?.configured ? 'Agent key configured. Paste a new key to rotate.' : 'kl_...'}
                className="config-input min-w-0 flex-1 text-sm"
              />
              <button type="button" onClick={() => void saveKey()} disabled={saving || !apiKey.trim()} className="btn-primary inline-flex items-center justify-center gap-2">
                <KeyRound size={14} />
                Save
              </button>
              {config?.keySource === 'agent' && (
                <button type="button" onClick={() => void removeKey()} disabled={saving} className="btn-secondary inline-flex items-center justify-center gap-2">
                  <Trash2 size={14} />
                  Remove override
                </button>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Available tools</h3>
            <div className="mt-4 max-h-[520px] space-y-2 overflow-auto pr-1">
              {sortedTools.length === 0 && (
                <div className="rounded-md border border-[var(--border-default)] px-3 py-6 text-center text-sm text-[var(--text-muted)]">
                  No tools loaded yet.
                </div>
              )}
              {sortedTools.map((tool) => (
                <button
                  key={tool.name}
                  type="button"
                  onClick={() => {
                    setCallJson(JSON.stringify({ tool: tool.name, arguments: {} }, null, 2));
                    setCallResult(null);
                  }}
                  className="w-full rounded-md border border-[var(--border-default)] px-3 py-3 text-left transition-colors hover:border-[var(--border-strong)]"
                >
                  <div className="font-mono text-xs text-[var(--text-primary)]">{tool.name}</div>
                  {tool.description && <div className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{tool.description}</div>}
                  {config?.keySource === 'platform' && PLATFORM_BLOCKED_TOOLS.has(tool.name) && (
                    <div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-amber-200">
                      Agent key required
                    </div>
                  )}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-5">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Call a KausaLayer tool</h3>
              <button
                type="button"
                onClick={() => void callTool()}
                disabled={calling || !config?.configured || platformBlocked}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Play size={14} />
                {calling ? 'Calling...' : 'Call'}
              </button>
            </div>
            {!config?.configured && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Add the platform KausaLayer key on the server, or save a per-agent override, before calling tools.
                Listing tools and health still work without a key.
              </div>
            )}
            {platformBlocked && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                This tool can expose or manage account-wide KausaLayer resources, so it needs an agent-specific key.
              </div>
            )}
            <textarea
              value={callJson}
              onChange={(e) => setCallJson(e.target.value)}
              rows={13}
              className="mt-4 w-full resize-y rounded-md border border-[var(--border-default)] bg-transparent px-3 py-2 font-mono text-xs text-[var(--text-primary)]"
            />
            {error && (
              <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Result</h3>
              {callResult != null && (
                <button type="button" onClick={() => void copyResult()} className="btn-secondary inline-flex items-center gap-2">
                  <Copy size={14} />
                  Copy
                </button>
              )}
            </div>
            <pre className="mt-4 max-h-[520px] overflow-auto rounded-md border border-[var(--border-default)] bg-[rgba(0,0,0,0.18)] p-3 text-xs text-[var(--text-muted)]">
              {callResult == null ? 'No result yet.' : formatJson(callResult)}
            </pre>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'warn';
}) {
  const toneClass = tone === 'good'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : tone === 'warn'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
      : 'border-[var(--border-default)] bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)]';
  return (
    <span className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 ${toneClass}`}>
      <span className="uppercase tracking-[0.12em]">{label}</span>
      <span className="font-mono text-[var(--text-primary)]">{value}</span>
    </span>
  );
}
