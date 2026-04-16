'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatFeatureKey } from '@/lib/feature-labels';
import { ArrowLeft, Bot, RefreshCw, AlertTriangle, Clock, Activity, User, Layers, Cpu, Shield } from 'lucide-react';
import { FRAMEWORKS } from '@hatcher/shared';
import type { AgentFramework } from '@hatcher/shared';

interface AdminAgent {
  id: string;
  name: string;
  slug?: string | null;
  description: string | null;
  framework: AgentFramework;
  template: string;
  status: string;
  messageCount?: number;
  containerId: string | null;
  configJson: Record<string, unknown> | null;
  ownerUsername: string;
  ownerWallet: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
  features: Array<{ featureKey: string; type: string; expiresAt: string | null }>;
}

export default function AdminAgentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, isLoading: authLoading } = useAuth();

  const [agent, setAgent] = useState<AdminAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [lastLogFetch, setLastLogFetch] = useState<number>(0);

  const loadAgent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminGetAgent(id);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setAgent(res.data as unknown as AdminAgent);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadLogs = useCallback(async () => {
    if (!id) return;
    setLogsLoading(true);
    setLogsError(null);
    try {
      const res = await api.adminGetAgentLogs(id, 200);
      if (!res.success) {
        setLogsError(res.error);
        return;
      }
      setLogs(res.data.lines);
      if (res.data.error) setLogsError(res.data.error);
      setLastLogFetch(Date.now());
    } catch (e) {
      setLogsError((e as Error).message);
    } finally {
      setLogsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading) {
      loadAgent();
      loadLogs();
    }
  }, [authLoading, loadAgent, loadLogs]);

  if (authLoading) return <div className="min-h-screen bg-[var(--bg-base)]" />;

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card glass-noise p-8 text-center max-w-sm">
          <Shield className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Admin Only</h1>
          <p className="text-sm text-[var(--text-muted)]">This page requires admin privileges.</p>
          <Link href="/dashboard" className="inline-block mt-4 text-sm text-[var(--color-accent)] hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={12} />
          Back to admin
        </Link>

        {loading ? (
          <div className="card glass-noise p-8 text-center text-[var(--text-muted)]">Loading agent…</div>
        ) : error ? (
          <div className="card glass-noise p-6 border-red-500/30 bg-red-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Failed to load agent</h2>
                <p className="text-xs text-[var(--text-muted)]">{error}</p>
              </div>
            </div>
          </div>
        ) : agent ? (
          <>
            {/* Header */}
            <div className="card glass-noise p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot size={18} className="text-[var(--color-accent)] flex-shrink-0" />
                    <h1 className="text-xl font-semibold text-[var(--text-primary)] truncate">{agent.name}</h1>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                      agent.status === 'active' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                      agent.status === 'sleeping' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
                      agent.status === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                      'border-[var(--border-default)] text-[var(--text-muted)]'
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] font-mono truncate">{agent.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border-default)]">
                <InfoItem icon={Layers} label="Framework" value={FRAMEWORKS[agent.framework]?.name ?? agent.framework} />
                <InfoItem icon={Cpu} label="Template" value={agent.template} />
                <InfoItem icon={Activity} label="Messages" value={String(agent.messageCount ?? 0)} />
                <InfoItem icon={Clock} label="Created" value={new Date(agent.createdAt).toLocaleDateString()} />
                <InfoItem icon={User} label="Owner" value={agent.ownerUsername} />
                <InfoItem label="Container" value={agent.containerId ? agent.containerId.slice(0, 12) : 'none'} mono />
                <InfoItem label="Features" value={String(agent.features?.length ?? 0)} />
              </div>
              {agent.description && (
                <p className="text-sm text-[var(--text-secondary)] mt-4 pt-4 border-t border-[var(--border-default)]">{agent.description}</p>
              )}
            </div>

            {/* Logs */}
            <div className="card glass-noise p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Container logs (last 200)</h2>
                <div className="flex items-center gap-2">
                  {lastLogFetch > 0 && (
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Fetched {new Date(lastLogFetch).toLocaleTimeString()}
                    </span>
                  )}
                  <button
                    onClick={loadLogs}
                    disabled={logsLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--color-accent)]/40 transition-all disabled:opacity-40"
                  >
                    <RefreshCw size={12} className={logsLoading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>
              </div>
              {logsError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-2">{logsError}</p>
              )}
              {!agent.containerId ? (
                <p className="text-xs text-[var(--text-muted)]">No container attached — agent has never been started.</p>
              ) : logs.length === 0 && !logsLoading ? (
                <p className="text-xs text-[var(--text-muted)]">No log lines returned.</p>
              ) : (
                <pre className="bg-black/60 border border-[var(--border-default)] rounded-lg p-3 text-[11px] text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-[500px] overflow-y-auto leading-relaxed">
                  {logs.join('\n')}
                </pre>
              )}
            </div>

            {/* Config (redacted) */}
            <div className="card glass-noise p-5">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Config <span className="text-[10px] text-[var(--text-muted)] font-normal ml-1">secrets redacted</span>
              </h2>
              {agent.configJson ? (
                <pre className="bg-black/40 border border-[var(--border-default)] rounded-lg p-3 text-[11px] text-[var(--text-secondary)] font-mono overflow-x-auto whitespace-pre max-h-[400px] overflow-y-auto leading-relaxed">
                  {JSON.stringify(agent.configJson, null, 2)}
                </pre>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">No config set.</p>
              )}
            </div>

            {/* Features */}
            {agent.features && agent.features.length > 0 && (
              <div className="card glass-noise p-5">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Active features</h2>
                <div className="space-y-1.5">
                  {agent.features.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border-default)] last:border-0">
                      <span className="text-[var(--text-primary)]">{formatFeatureKey(f.featureKey)}</span>
                      <div className="flex items-center gap-2 text-[var(--text-muted)]">
                        <span className="uppercase tracking-wider text-[10px]">{f.type}</span>
                        {f.expiresAt && <span>· expires {new Date(f.expiresAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, mono }: { icon?: React.ElementType; label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 mb-0.5">
        {Icon && <Icon size={11} className="text-[var(--text-muted)] flex-shrink-0" />}
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">{label}</span>
      </div>
      <div className={`text-sm text-[var(--text-primary)] truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
