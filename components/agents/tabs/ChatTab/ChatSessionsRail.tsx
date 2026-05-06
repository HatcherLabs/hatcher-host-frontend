'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Loader2, MessageSquare, Plus, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext } from '../../AgentContext';

interface NativeSession {
  id: string;
  label: string;
  preview: string | null;
  updatedAt?: number;
  count?: number;
}

function formatRelative(ts?: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function shortId(value: string): string {
  const parts = value.split(':');
  return parts[parts.length - 1]?.slice(0, 12) || value.slice(0, 12);
}

export function ChatSessionsRail() {
  const {
    agent,
    setTab,
    chatSessions,
    activeChatSessionId,
    setActiveChatSessionId,
    startNewChatSession,
    refreshChatSessions,
  } = useAgentContext();
  const [nativeSessions, setNativeSessions] = useState<NativeSession[]>([]);
  const [nativeTotal, setNativeTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const loadNativeSessions = useCallback(async () => {
    if (!agent?.id) return;
    if (!['openclaw', 'hermes'].includes(agent.framework)) return;
    setLoading(true);
    setError(null);
    try {
      if (agent.framework === 'openclaw') {
        const res = await api.getOpenClawSessions(agent.id);
        if (res.success) {
          setNativeTotal(res.data.sessions.length);
          setNativeSessions(res.data.sessions.slice(0, 6).map((session) => ({
            id: session.sessionId,
            label: shortId(session.user),
            preview: session.firstUserMessage,
            updatedAt: session.updatedAt,
            count: session.messageCount,
          })));
        } else {
          setNativeSessions([]);
          setNativeTotal(null);
          setError('error' in res ? res.error : 'Sessions unavailable');
        }
      } else if (agent.framework === 'hermes') {
        const res = await api.getHermesStats(agent.id);
        if (res.success) {
          setNativeTotal(res.data.sessions.total);
          setNativeSessions([]);
        } else {
          setNativeTotal(null);
          setError('error' in res ? res.error : 'Sessions unavailable');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [agent?.framework, agent?.id]);

  useEffect(() => {
    void loadNativeSessions();
  }, [loadNativeSessions]);

  const canOpenSessionsTab = agent.framework === 'openclaw';
  const nativeSessionsTargetTab = canOpenSessionsTab ? 'sessions' : 'stats';
  const nativeSessionsCount = nativeTotal ?? 0;
  const activeSession = chatSessions.find((session) => session.id === activeChatSessionId)
    ?? chatSessions.find((session) => session.current)
    ?? chatSessions[0];
  const activeMessageCount = activeSession?.messageCount ?? 0;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('hatcher.chat.sessionsRailCollapsed');
      if (stored) setCollapsed(stored === 'true');
    } catch {
      // localStorage can be unavailable in strict privacy contexts.
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem('hatcher.chat.sessionsRailCollapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  return (
    <aside
      className={`hidden lg:flex shrink-0 flex-col rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]/60 min-h-0 overflow-hidden transition-[width] duration-200 ${
        collapsed ? 'w-12' : 'w-72 2xl:w-80'
      }`}
    >
      <div className={`flex items-center border-b border-[var(--border-default)] ${collapsed ? 'justify-center px-2 py-2' : 'justify-between px-3 py-2'}`}>
        {collapsed ? (
          <button
            onClick={toggleCollapsed}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
            title="Expand sessions"
            aria-label="Expand sessions sidebar"
            aria-expanded={false}
          >
            <ChevronRight size={15} />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare size={14} className="text-[var(--color-accent)]" />
              <span className="text-xs font-semibold text-[var(--text-secondary)] truncate">Sessions</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  void refreshChatSessions();
                  void loadNativeSessions();
                }}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
                title="Refresh"
                aria-label="Refresh sessions"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              </button>
              <button
                onClick={toggleCollapsed}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
                title="Collapse sessions"
                aria-label="Collapse sessions sidebar"
                aria-expanded
              >
                <ChevronLeft size={13} />
              </button>
            </div>
          </>
        )}
      </div>

      {collapsed ? (
        <div className="flex flex-col items-center gap-2 p-2 overflow-hidden">
          <button
            onClick={toggleCollapsed}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/15 transition-colors"
            title={`${activeMessageCount} dashboard messages`}
            aria-label="Expand dashboard chat sessions"
          >
            <MessageSquare size={15} />
          </button>
          {activeMessageCount > 0 && (
            <span className="max-w-8 truncate text-[10px] tabular-nums text-[var(--text-muted)]">
              {activeMessageCount > 99 ? '99+' : activeMessageCount}
            </span>
          )}
          {nativeSessionsCount > 0 && (
            <button
              onClick={() => setTab(nativeSessionsTargetTab)}
              className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-[var(--border-default)] px-1 text-[10px] tabular-nums text-[var(--text-secondary)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] transition-colors"
              title={`${nativeSessionsCount} native sessions`}
              aria-label="Open native sessions"
            >
              {nativeSessionsCount > 99 ? '99+' : nativeSessionsCount}
            </button>
          )}
        </div>
      ) : (
      <div className="p-2 space-y-2 overflow-y-auto min-h-0">
        <button
          onClick={() => void startNewChatSession()}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border-default)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] transition-colors"
        >
          <Plus size={13} />
          New chat
        </button>

        <div className="space-y-1">
          <div className="px-1.5 pb-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            Dashboard
          </div>
          {chatSessions.map((session) => {
            const selected = session.id === activeChatSessionId || (!activeChatSessionId && session.current);
            return (
              <button
                key={session.id}
                onClick={() => setActiveChatSessionId(session.id)}
                className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                  selected
                    ? 'border-[var(--color-accent)]/30 bg-[rgba(6,182,212,0.08)]'
                    : 'border-transparent hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{session.title}</span>
                  <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                    <Clock size={10} />
                    {formatRelative(session.updatedAt)}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-[var(--text-muted)] line-clamp-2">
                  {session.preview || 'Empty session'}
                </p>
                <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                  {session.messageCount} message{session.messageCount === 1 ? '' : 's'}
                </div>
              </button>
            );
          })}
        </div>

        {(nativeTotal ?? 0) > 0 && (
          <div className="pt-1">
            <div className="px-1.5 pb-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              {agent.framework} native
            </div>
            {nativeSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  setTab(nativeSessionsTargetTab);
                }}
                className="w-full text-left rounded-md px-3 py-2 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)] truncate">{session.label}</span>
                  {session.updatedAt && (
                    <span className="text-[10px] text-[var(--text-muted)]">{formatRelative(session.updatedAt)}</span>
                  )}
                </div>
                {session.preview && (
                  <p className="text-[11px] leading-relaxed text-[var(--text-muted)] line-clamp-2">{session.preview}</p>
                )}
                {session.count !== undefined && (
                  <div className="mt-1 text-[10px] text-[var(--text-muted)]">{session.count} messages</div>
                )}
              </button>
            ))}
            {canOpenSessionsTab && nativeTotal !== null && nativeTotal > nativeSessions.length && (
              <button
                onClick={() => setTab('sessions')}
                className="w-full px-3 py-1.5 text-left text-[11px] text-[var(--color-accent)] hover:underline"
              >
                View all {nativeTotal}
              </button>
            )}
          </div>
        )}

        {agent.framework === 'hermes' && nativeTotal !== null && (
          <button
            onClick={() => setTab('stats')}
            className="w-full text-left rounded-md px-3 py-2 hover:bg-white/[0.04] transition-colors"
          >
            <div className="text-xs font-medium text-[var(--text-secondary)]">Hermes sessions</div>
            <div className="mt-1 text-[11px] text-[var(--text-muted)]">{nativeTotal} total in runtime stats</div>
          </button>
        )}

        {error && (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300">
            {error}
          </div>
        )}
      </div>
      )}
    </aside>
  );
}
