'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  Loader2,
  Network,
  Plus,
  RefreshCw,
  TerminalSquare,
  Trash2,
  Workflow,
} from 'lucide-react';
import { api, type Agent, type AgentCommLog, type AgentCommPermission } from '@/lib/api';
import { tabContentVariants, useAgentContext } from '../AgentContext';
import { summarizeAgentCommLogs } from './developerWorkflows';

function StatusPill({ enabled }: { enabled: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-[3px] border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
      enabled
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
        : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)]'
    }`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  );
}

function CapabilityPanel({
  icon,
  title,
  label,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  label: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--accent)]">
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
            <p className="mt-0.5 text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</p>
          </div>
        </div>
        {action}
      </div>
      <p className="text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
    </section>
  );
}

export function DevTab() {
  const { agent, id: agentId, setTab, loadAgent } = useAgentContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commEnabled, setCommEnabled] = useState(Boolean(agent.commEnabled));
  const [permissions, setPermissions] = useState<AgentCommPermission[]>([]);
  const [logs, setLogs] = useState<AgentCommLog[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  const summary = useMemo(() => summarizeAgentCommLogs(logs), [logs]);
  const allowedIds = useMemo(() => new Set(permissions.map((permission) => permission.allowedAgent.id)), [permissions]);
  const candidateAgents = useMemo(() => (
    agents.filter((candidate) => candidate.id !== agentId && !allowedIds.has(candidate.id))
  ), [agentId, agents, allowedIds]);

  const loadDevState = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [commRes, logsRes, agentsRes] = await Promise.all([
      api.getAgentCommPermissions(agentId),
      api.getAgentCommLogs(agentId, 25),
      api.getMyAgents(),
    ]);
    setLoading(false);

    if (!commRes.success) {
      setError(commRes.error ?? 'Failed to load agent communication settings');
      return;
    }
    setCommEnabled(commRes.data.commEnabled);
    setPermissions(commRes.data.permissions);
    if (logsRes.success) setLogs(logsRes.data.logs);
    if (agentsRes.success && Array.isArray(agentsRes.data)) setAgents(agentsRes.data);
  }, [agentId]);

  useEffect(() => {
    void loadDevState();
  }, [loadDevState]);

  const toggleComm = async () => {
    setSaving(true);
    setError(null);
    const next = !commEnabled;
    const res = await api.updateAgentComm(agentId, next);
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? 'Failed to update agent communication');
      return;
    }
    setCommEnabled(res.data.commEnabled);
    void loadAgent();
  };

  const addPermission = async () => {
    if (!selectedAgentId) return;
    setSaving(true);
    setError(null);
    const res = await api.addAgentCommPermission(agentId, selectedAgentId);
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? 'Failed to add agent permission');
      return;
    }
    setSelectedAgentId('');
    await loadDevState();
  };

  const deletePermission = async (permissionId: string) => {
    setSaving(true);
    setError(null);
    const res = await api.deleteAgentCommPermission(agentId, permissionId);
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? 'Failed to remove agent permission');
      return;
    }
    setPermissions((current) => current.filter((permission) => permission.id !== permissionId));
  };

  return (
    <motion.div key="dev" variants={tabContentVariants} initial="enter" animate="center" exit="exit" className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-[var(--border-default)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Developer workspace</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Build, fork, and coordinate agent work</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Source-control setup, multi-agent communication, workflow orchestration, and terminal-native dev commands in one operational surface.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadDevState()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-[3px] border border-[var(--border-default)] px-3 py-2 text-xs font-mono text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-[3px] border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <CapabilityPanel
          icon={<GitBranch size={16} />}
          title="Source control"
          label="GitHub now, GitLawb next"
          body="Use the existing GitHub deploy action and GitHub skill for repository work. GitLawb fits as an agent-native Git layer for signed pushes, DID identity, and skill distribution."
          action={
            <button type="button" onClick={() => setTab('plugins')} className="text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--accent)] hover:underline">
              Plugins
            </button>
          }
        />
        <CapabilityPanel
          icon={<Workflow size={16} />}
          title="Workflow builder"
          label="Visual automation"
          body="Current Hatcher workflows cover triggers, conditions, API calls, skills, and scheduled runs. The dev roadmap should add task-board style delegation on top."
          action={
            <button type="button" onClick={() => setTab('workflows')} className="text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--accent)] hover:underline">
              Open
            </button>
          }
        />
        <CapabilityPanel
          icon={<TerminalSquare size={16} />}
          title="Terminal sessions"
          label="Native CLI control"
          body="Terminal sessions keep persistent CLI state. The /fork action now runs in the framework CLI instead of creating an empty Hatcher-only shell."
          action={
            <button type="button" onClick={() => setTab('terminal')} className="text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--accent)] hover:underline">
              Terminal
            </button>
          }
        />
      </div>

      <section className="rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <div className="flex flex-col gap-3 border-b border-[var(--border-default)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--accent)]">
              <Network size={17} />
            </span>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Agent-to-agent communication</h3>
              <p className="text-sm text-[var(--text-secondary)]">Let trusted Hatcher agents call this agent as a specialist worker.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill enabled={commEnabled} />
            <button
              type="button"
              onClick={toggleComm}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-[3px] border border-[var(--border-default)] px-3 py-2 text-xs font-mono text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              {commEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>

        <div className="grid gap-0 border-b border-[var(--border-default)] md:grid-cols-4">
          {[
            ['Calls', summary.total],
            ['Success', summary.successes],
            ['Failures', summary.failures],
            ['Avg latency', `${summary.averageLatencyMs}ms`],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-[var(--border-default)] p-4 md:border-b-0 md:border-r md:last:border-r-0">
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
              <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1fr,1.2fr]">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Allowed callers</h4>
              <span className="text-xs text-[var(--text-muted)]">{permissions.length} configured</span>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedAgentId}
                onChange={(event) => setSelectedAgentId(event.target.value)}
                className="min-w-0 flex-1 rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
                disabled={candidateAgents.length === 0}
              >
                <option value="">{candidateAgents.length === 0 ? 'No eligible agents' : 'Select agent'}</option>
                {candidateAgents.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} ({candidate.framework})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addPermission}
                disabled={!selectedAgentId || saving}
                className="inline-flex items-center gap-1.5 rounded-[3px] border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
            <div className="mt-3 divide-y divide-[var(--border-default)] rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)]">
              {loading ? (
                <div className="flex items-center gap-2 p-3 text-sm text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin" /> Loading callers</div>
              ) : permissions.length === 0 ? (
                <div className="p-3 text-sm text-[var(--text-muted)]">No caller permissions yet. Same-owner agents can still discover each other when communication is enabled.</div>
              ) : permissions.map((permission) => (
                <div key={permission.id} className="flex items-center gap-3 p-3">
                  <Bot size={15} className="flex-shrink-0 text-[var(--accent)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{permission.allowedAgent.name}</p>
                    <p className="text-xs uppercase tracking-[0.06em] text-[var(--text-muted)]">{permission.allowedAgent.framework}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deletePermission(permission.id)}
                    disabled={saving}
                    className="rounded-[3px] p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
                    title="Remove caller permission"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Recent A2A traffic</h4>
              <span className="text-xs text-[var(--text-muted)]">Last 25 events</span>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)]">
              {loading ? (
                <div className="flex items-center gap-2 p-3 text-sm text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin" /> Loading traffic</div>
              ) : logs.length === 0 ? (
                <div className="p-3 text-sm text-[var(--text-muted)]">No A2A calls recorded yet.</div>
              ) : logs.map((log) => (
                <div key={log.id} className="border-b border-[var(--border-default)] p-3 last:border-b-0">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-mono uppercase tracking-[0.08em] ${log.status === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
                      {log.status}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{log.latencyMs}ms · depth {log.chainDepth}</span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{log.message}</p>
                  {log.response && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{log.response}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          ['GitHub loop', 'Install GitHub skill, mount repo credentials in Terminal, then use Hatcher workflows for PR review and release checks.'],
          ['GitLawb path', 'Add agent DID/key creation, signed repo actions, UCAN-style permission scopes, and marketplace publishing once API stability is verified.'],
          ['Team orchestration', 'Use Paperclip-style project roles: supervisor, builder, reviewer, researcher, with budgets, task queues, and audit logs.'],
        ].map(([title, body]) => (
          <div key={title} className="rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
            <div className="mb-2 flex items-center gap-2 text-[var(--accent)]">
              <ExternalLink size={14} />
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
            </div>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
          </div>
        ))}
      </section>
    </motion.div>
  );
}
