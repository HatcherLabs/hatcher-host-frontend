'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Cable, Check, Loader2, Plus, RotateCcw, Shield, Trash2 } from 'lucide-react';
import {
  GlassCard,
  Skeleton,
  tabContentVariants,
  useAgentContext,
} from '../AgentContext';
import { api } from '@/lib/api';
import type {
  CreateMcpConnectorBody,
  McpConnector,
  McpConnectorApprovalMode,
} from '@/lib/api';

type BusyAction = 'load' | 'create' | 'refresh' | `revoke:${string}`;

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusClass(status: string): string {
  if (status === 'ready') return 'bg-[var(--status-live-bg)] text-[var(--status-live)] border-[var(--status-live-border)]';
  if (status === 'pending') return 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning-border)]';
  if (status === 'error' || status === 'revoked') return 'bg-[var(--color-destructive-bg)] text-[var(--color-destructive)] border-[var(--color-destructive-border)]';
  return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
}

function toolCount(connector: McpConnector): number {
  return Array.isArray(connector.tools) ? connector.tools.length : 0;
}

function selectedTools(connector: McpConnector): string {
  const enabled = connector.toolPolicy?.enabledTools;
  if (!Array.isArray(enabled) || enabled.length === 0) return 'All advertised tools';
  return enabled.join(', ');
}

export function ConnectorsTab() {
  const { agent } = useAgentContext();
  const [connectors, setConnectors] = useState<McpConnector[]>([]);
  const [busy, setBusy] = useState<BusyAction | null>('load');
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [name, setName] = useState('GitHub MCP');
  const [serverUrl, setServerUrl] = useState('https://api.githubcopilot.com/mcp/');
  const [authType, setAuthType] = useState<'none' | 'bearer'>('none');
  const [bearerToken, setBearerToken] = useState('');
  const [approvalMode, setApprovalMode] = useState<McpConnectorApprovalMode>('prompt');
  const [enabledToolsText, setEnabledToolsText] = useState('');

  const sortedConnectors = useMemo(
    () => [...connectors].sort((a, b) => a.name.localeCompare(b.name)),
    [connectors],
  );

  const loadConnectors = useCallback(async (showSpinner = true) => {
    if (showSpinner) setBusy('load');
    setError(null);
    try {
      const res = await api.getMcpConnectors(agent.id);
      if (res.success) {
        setConnectors(res.data.connectors);
      } else {
        setError(res.error ?? 'Failed to load MCP connectors');
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to load MCP connectors');
    } finally {
      if (showSpinner) setBusy(null);
    }
  }, [agent.id]);

  useEffect(() => {
    void loadConnectors();
  }, [loadConnectors]);

  const handleCreate = async () => {
    const enabledTools = enabledToolsText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const body: CreateMcpConnectorBody = {
      name: name.trim(),
      serverUrl: serverUrl.trim(),
      transport: 'streamable_http',
      auth: authType === 'bearer'
        ? { type: 'bearer', bearerToken }
        : { type: 'none' },
      enabledTools,
      approvalMode,
    };

    setBusy('create');
    setError(null);
    setStatusMsg(null);
    try {
      const res = await api.createMcpConnector(agent.id, body);
      if (res.success) {
        setConnectors((prev) => [res.data.connector, ...prev.filter((item) => item.id !== res.data.connector.id)]);
        setStatusMsg(res.data.connector.status === 'ready'
          ? `MCP connector saved with ${toolCount(res.data.connector)} discovered tools.`
          : 'MCP connector saved, but discovery needs attention.');
        setBearerToken('');
      } else {
        setError(res.error ?? 'Failed to create MCP connector');
      }
    } finally {
      setBusy(null);
    }
  };

  const handleRevoke = async (connector: McpConnector) => {
    if (!window.confirm(`Revoke ${connector.name}?`)) return;
    setBusy(`revoke:${connector.id}`);
    setError(null);
    setStatusMsg(null);
    try {
      const res = await api.revokeMcpConnector(agent.id, connector.id);
      if (res.success) {
        setConnectors((prev) => prev.filter((item) => item.id !== connector.id));
        setStatusMsg('MCP connector revoked.');
      } else {
        setError(res.error ?? 'Failed to revoke MCP connector');
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.div
      key="connectors"
      variants={tabContentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Connectors</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Attach trusted remote MCP servers to this agent with owner-managed tool permissions.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <GlassCard className="!p-0">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-info-border)] bg-[var(--color-info-bg)]">
                  <Cable size={15} className="text-[var(--color-info)]" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Remote MCP servers</p>
                  <p className="text-xs text-[var(--text-muted)]">{connectors.length} configured</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBusy('refresh');
                  loadConnectors(false).finally(() => setBusy(null));
                }}
                disabled={busy === 'refresh'}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-2.5 text-xs text-[var(--text-secondary)] hover:border-[var(--border-hover)] disabled:opacity-50"
              >
                {busy === 'refresh' ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                Refresh
              </button>
            </div>

            <div className="space-y-3 p-4">
              {busy === 'load' ? (
                <>
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </>
              ) : sortedConnectors.length === 0 ? (
                <div className="rounded-lg border border-[var(--border-default)] bg-black/15 p-4">
                  <p className="text-sm font-medium text-[var(--text-primary)]">No MCP connectors yet</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Start with one trusted HTTPS MCP endpoint, then narrow the allowed tools.
                  </p>
                </div>
              ) : sortedConnectors.map((connector) => (
                <div key={connector.id} className="rounded-lg border border-[var(--border-default)] bg-black/15 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{connector.name}</p>
                        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${statusClass(connector.status)}`}>
                          {connector.status}
                        </span>
                        {connector.authType === 'bearer' && (
                          <span className="rounded-full border border-[var(--border-default)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                            token {connector.tokenPrefix ?? 'saved'}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate font-mono text-[11px] text-[var(--text-muted)]">{connector.serverUrl}</p>
                      <div className="mt-2 grid gap-1 text-[11px] text-[var(--text-muted)] sm:grid-cols-3">
                        <span>{toolCount(connector)} tools discovered</span>
                        <span>{connector.toolPolicy?.approvalMode ?? 'prompt'} approval</span>
                        <span>Checked {formatDate(connector.lastCheckedAt)}</span>
                      </div>
                      <p className="mt-2 truncate text-[11px] text-[var(--text-secondary)]">
                        Allowed: {selectedTools(connector)}
                      </p>
                      {connector.lastError && (
                        <p className="mt-2 text-[11px] text-[var(--color-destructive)]">{connector.lastError}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevoke(connector)}
                      disabled={busy === `revoke:${connector.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-destructive-border)] px-2 text-xs text-[var(--color-destructive)] hover:bg-[var(--color-destructive-bg)] disabled:opacity-50"
                    >
                      {busy === `revoke:${connector.id}` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--status-live-border)] bg-[var(--status-live-bg)]">
                <Plus size={15} className="text-[var(--status-live)]" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Add MCP connector</h3>
                <p className="text-xs text-[var(--text-muted)]">Remote HTTPS endpoints only for this first release.</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">MCP endpoint</span>
                <input
                  value={serverUrl}
                  onChange={(event) => setServerUrl(event.target.value)}
                  placeholder="https://example.com/mcp"
                  className="h-9 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 font-mono text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Auth</span>
                <select
                  value={authType}
                  onChange={(event) => setAuthType(event.target.value as 'none' | 'bearer')}
                  className="h-9 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                >
                  <option value="none">No auth</option>
                  <option value="bearer">Bearer token</option>
                </select>
              </label>
              {authType === 'bearer' && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Bearer token</span>
                  <input
                    value={bearerToken}
                    onChange={(event) => setBearerToken(event.target.value)}
                    type="password"
                    autoComplete="off"
                    className="h-9 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Approval mode</span>
                <select
                  value={approvalMode}
                  onChange={(event) => setApprovalMode(event.target.value as McpConnectorApprovalMode)}
                  className="h-9 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                >
                  <option value="prompt">Prompt before tool calls</option>
                  <option value="approve">Require explicit approval</option>
                  <option value="auto">Auto for allowed tools</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Allowed tools</span>
                <input
                  value={enabledToolsText}
                  onChange={(event) => setEnabledToolsText(event.target.value)}
                  placeholder="issues.search, repos.read"
                  className="h-9 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 font-mono text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
                <span className="mt-1 block text-[11px] text-[var(--text-muted)]">Leave blank to allow all tools after discovery.</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleCreate}
              disabled={busy === 'create' || !name.trim() || !serverUrl.trim() || (authType === 'bearer' && bearerToken.trim().length < 8)}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === 'create' ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Save connector
            </button>
          </GlassCard>

          <GlassCard className="space-y-3">
            <div className="flex items-start gap-2">
              <Shield size={15} className="mt-0.5 text-[var(--color-info)]" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Security boundary</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                  Connect only trusted MCP servers. Secrets are stored encrypted and hidden from the browser after save.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-[var(--color-warning)]" />
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                Tool execution should run through the backend worker with egress controls and audit logging.
              </p>
            </div>
          </GlassCard>

          {(error || statusMsg) && (
            <div className={`rounded-lg border p-3 text-xs ${
              error
                ? 'border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] text-[var(--color-destructive)]'
                : 'border-[var(--status-live-border)] bg-[var(--status-live-bg)] text-[var(--status-live)]'
            }`}>
              {error ?? statusMsg}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
