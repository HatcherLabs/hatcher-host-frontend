'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Clock, Cpu, RefreshCw, Info, AlertTriangle, HardDrive } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, tabContentVariants, GlassCard, Skeleton } from '../AgentContext';

interface OpenClawSessionSummary {
  sessionId: string;
  user: string;
  updatedAt: number;
  modelId: string | null;
  messageCount: number;
  firstUserMessage: string | null;
  sizeBytes: number;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatRelative(ts: number): string {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Short-form user identity from OpenClaw's session keys.
 * OpenClaw persists session keys like
 *   "agent:main:openresponses-user:cmn00szes0002r9vs48ast51v"
 * which is noise for display. Strip to the trailing part so the
 * UI shows something human-readable.
 */
function shortUser(user: string): string {
  const parts = user.split(':');
  return parts[parts.length - 1] || user;
}

/**
 * OpenClaw recent-sessions browser. Reads
 * `/home/node/.openclaw/agents/main/sessions/sessions.json` + each
 * session's `.jsonl` file to pull message counts and first-user-
 * message previews, sorted by most recent activity.
 *
 * Managed-mode openclaw only — the legacy pre-Etapa-4 layout has
 * a different path and isn't exposed by the backend route. For
 * legacy agents the tab renders a friendly notice explaining that
 * their session history is accessible via the Files tab instead.
 */
export function OpenClawSessionsTab() {
  const { agent, setTab } = useAgentContext();
  const [data, setData] = useState<{ sessions: OpenClawSessionSummary[]; totalBytes: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);

  const load = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOpenClawSessions(agent.id);
      if (res.success) {
        setData(res.data);
        setStopped(false);
      } else {
        // Distinguish "agent isn't running" from real errors so the user
        // gets a friendly "start your agent" empty state instead of a
        // red banner. See apps/api/src/lib/errors.ts for the code.
        if ('code' in res && res.code === 'AGENT_NOT_RUNNING') {
          setStopped(true);
        } else {
          setError('error' in res ? res.error : 'Failed to load sessions');
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (stopped) {
    return (
      <motion.div
        key="tab-openclaw-sessions"
        variants={tabContentVariants}
        initial="enter"
        animate="center"
        exit="exit"
      >
        <GlassCard>
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Info size={14} className="text-amber-400" />
            Agent is stopped — start it to browse sessions.
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="tab-openclaw-sessions"
      className="space-y-4"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <GlassCard>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <MessageSquare size={18} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Recent Sessions</h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              {loading
                ? 'Loading sessions...'
                : data
                  ? `${data.sessions.length} session${data.sessions.length === 1 ? '' : 's'} · ${formatBytes(data.totalBytes)} on disk`
                  : '—'}
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              void load();
            }}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-[var(--text-muted)] hover:text-amber-400 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>
      </GlassCard>

      {error && !loading && (
        <GlassCard>
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertTriangle size={14} />
            {error}
          </div>
        </GlassCard>
      )}

      {loading && !data ? (
        <GlassCard>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </GlassCard>
      ) : data && data.sessions.length === 0 ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <MessageSquare size={22} className="text-[var(--text-muted)] mb-2" />
            <p className="text-sm text-[var(--text-muted)]">No sessions yet.</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Chat with the agent via the{' '}
              <button
                onClick={() => setTab('chat')}
                className="text-amber-400 hover:underline cursor-pointer"
              >
                Chat tab
              </button>{' '}
              to create one.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {data!.sessions.map((session) => (
            <GlassCard key={session.sessionId}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {shortUser(session.user)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-default)] font-mono">
                      {session.sessionId.slice(0, 8)}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                      <Clock size={10} />
                      {formatRelative(session.updatedAt)}
                    </span>
                  </div>
                  {session.firstUserMessage && (
                    <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed line-clamp-2 mb-2">
                      “{session.firstUserMessage}”
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <MessageSquare size={10} />
                      {session.messageCount} message{session.messageCount === 1 ? '' : 's'}
                    </span>
                    {session.modelId && (
                      <span className="flex items-center gap-1 font-mono truncate max-w-[240px]">
                        <Cpu size={10} />
                        {session.modelId}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <HardDrive size={10} />
                      {formatBytes(session.sizeBytes)}
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </motion.div>
  );
}
