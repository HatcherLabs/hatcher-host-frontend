'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAgentContext } from '../AgentContext';
import { api } from '@/lib/api';
import { Radio, Plus, Trash2, ArrowRight, Clock, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface CommPermission {
  id: string;
  allowedAgent: { id: string; name: string; framework: string };
  createdAt: string;
}

interface CommLog {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  message: string;
  response: string | null;
  status: string;
  latencyMs: number;
  chainDepth: number;
  createdAt: string;
}

const STATUS_BADGE: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  success: { color: 'text-emerald-400', icon: CheckCircle2 },
  error: { color: 'text-red-400', icon: XCircle },
  loop_blocked: { color: 'text-yellow-400', icon: AlertCircle },
  permission_denied: { color: 'text-orange-400', icon: AlertCircle },
  accepted: { color: 'text-blue-400', icon: Clock },
};

export function CommTab() {
  const { agent } = useAgentContext();
  const [commEnabled, setCommEnabled] = useState(false);
  const [permissions, setPermissions] = useState<CommPermission[]>([]);
  const [logs, setLogs] = useState<CommLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [addAgentId, setAddAgentId] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'permissions' | 'logs'>('permissions');

  const agentId = agent?.id ?? '';

  const loadData = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const [permRes, logRes] = await Promise.all([
        api.getCommPermissions(agentId),
        api.getCommLogs(agentId),
      ]);
      if (permRes.success) {
        setCommEnabled(permRes.data.commEnabled);
        setPermissions(permRes.data.permissions);
      }
      if (logRes.success) {
        setLogs(logRes.data.logs);
      }
    } catch {
      setError('Failed to load communication data');
    }
    setLoading(false);
  }, [agentId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggle = async () => {
    setToggling(true);
    setError(null);
    const res = await api.toggleComm(agentId, !commEnabled);
    if (res.success) {
      setCommEnabled(res.data.commEnabled);
    } else {
      setError(res.error);
    }
    setToggling(false);
  };

  const handleAddPermission = async () => {
    const id = addAgentId.trim();
    if (!id) return;
    setAdding(true);
    setError(null);
    const res = await api.addCommPermission(agentId, id);
    if (res.success) {
      setAddAgentId('');
      loadData();
    } else {
      setError(res.error);
    }
    setAdding(false);
  };

  const handleRemovePermission = async (permId: string) => {
    const res = await api.removeCommPermission(agentId, permId);
    if (res.success) {
      setPermissions((prev) => prev.filter((p) => p.id !== permId));
    } else {
      setError(res.error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Radio size={20} />
            Agent Communication
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Allow other agents to send messages to this agent via the API.
          </p>
        </div>

        {/* Toggle */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            commEnabled ? 'bg-emerald-500' : 'bg-[var(--bg-tertiary)]'
          } ${toggling ? 'opacity-50' : ''}`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              commEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!commEnabled && (
        <div className="px-4 py-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-center">
          <Radio className="w-8 h-8 mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
          <p className="text-sm text-[var(--text-muted)]">
            Communication is disabled. Toggle it on to allow other agents to send messages to this agent.
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2 opacity-60">
            Same-owner agents can always communicate. Cross-owner requires explicit permission.
          </p>
        </div>
      )}

      {commEnabled && (
        <>
          {/* Section Tabs */}
          <div className="flex gap-1 p-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)]">
            {(['permissions', 'logs'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeSection === s
                    ? 'bg-[var(--bg-base)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {s === 'permissions' ? `Permissions (${permissions.length})` : `Logs (${logs.length})`}
              </button>
            ))}
          </div>

          {/* Permissions Section */}
          {activeSection === 'permissions' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]">
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Agents from the same owner can always communicate. Add cross-owner agents below.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={addAgentId}
                    onChange={(e) => setAddAgentId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPermission()}
                    placeholder="Enter agent ID to grant access..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-hover)]"
                  />
                  <button
                    onClick={handleAddPermission}
                    disabled={!addAgentId.trim() || adding}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
              </div>

              {permissions.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-4 opacity-60">
                  No cross-owner permissions configured yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {permissions.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                          <Radio size={14} className="text-[var(--text-muted)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{p.allowedAgent.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {p.allowedAgent.framework} · {p.allowedAgent.id.slice(0, 12)}...
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemovePermission(p.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                        title="Remove permission"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Logs Section */}
          {activeSection === 'logs' && (
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-8 opacity-60">
                  No communication logs yet. Logs appear when agents talk to each other.
                </p>
              ) : (
                logs.map((log) => {
                  const badge = STATUS_BADGE[log.status] ?? STATUS_BADGE.error;
                  const Icon = badge.icon;
                  const isSource = log.sourceAgentId === agentId;
                  return (
                    <div
                      key={log.id}
                      className="px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs">
                          <Icon size={12} className={badge.color} />
                          <span className={badge.color}>{log.status}</span>
                          <span className="text-[var(--text-muted)]">·</span>
                          <span className="text-[var(--text-muted)]">
                            {isSource ? 'Sent' : 'Received'}
                          </span>
                          <ArrowRight size={10} className="text-[var(--text-muted)]" />
                          <span className="text-[var(--text-muted)] font-mono">
                            {(isSource ? log.targetAgentId : log.sourceAgentId).slice(0, 12)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                          {log.latencyMs > 0 && <span>{log.latencyMs}ms</span>}
                          <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{log.message}</p>
                      {log.response && (
                        <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2 italic">
                          → {log.response}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
