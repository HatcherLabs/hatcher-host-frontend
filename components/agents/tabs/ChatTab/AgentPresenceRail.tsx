'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  AVATAR_VARIANTS,
  SELECTABLE_AVATAR_VARIANTS,
  normalizeAvatarVariant,
  type AvatarVariant,
  type RoomEmoteId,
} from '@/components/agent-room/v2/stations/AgentBody';
import {
  AVATAR_SELECT_CLASSNAME,
  AVATAR_SELECT_OPTION_CLASSNAME,
  AVATAR_SELECT_STYLE,
} from '@/components/agent-room/v2/hud/avatarSelectTheme';
import { api } from '@/lib/api';
import { useAgentContext } from '../../AgentContext';
import { AgentEyesLiveCard } from './AgentEyesLiveCard';

const AgentRoomAvatarPreview = dynamic(
  () =>
    import('./AgentRoomAvatarPreview').then((m) => m.AgentRoomAvatarPreview),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full rounded-lg bg-black/20" aria-hidden />
    ),
  },
);

interface AgentPresenceRailProps {
  className?: string;
  onSessionSelect?: () => void;
}

function formatRelative(ts?: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d`;
  return new Date(ts).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

export function AgentPresenceRail({
  className = '',
  onSessionSelect,
}: AgentPresenceRailProps) {
  const {
    agent,
    isAuthenticated,
    loadAgent,
    messages,
    sending,
    inflightTools,
    chatSessions,
    activeChatSessionId,
    setActiveChatSessionId,
    startNewChatSession,
    deleteChatSession,
    deletingChatSessionId,
    refreshChatSessions,
  } = useAgentContext();
  const [greeting, setGreeting] = useState(true);
  const [sessionsOpen, setSessionsOpen] = useState(true);
  const [refreshingSessions, setRefreshingSessions] = useState(false);
  const [emoteNonce, setEmoteNonce] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<AvatarVariant | null>(
    () => normalizeAvatarVariant(agent.config?.roomAvatarVariant),
  );
  const [savingVariant, setSavingVariant] = useState(false);
  const [variantError, setVariantError] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(true);
    const timer = window.setTimeout(() => setGreeting(false), 2600);
    return () => window.clearTimeout(timer);
  }, [agent.id]);

  const lastMessage = messages[messages.length - 1];
  const thinking =
    sending || inflightTools.length > 0 || Boolean(lastMessage?.streaming);
  const mood = greeting ? 'greeting' : thinking ? 'thinking' : 'idle';
  const activeEmote: RoomEmoteId | null =
    mood === 'greeting' ? 'wave' : mood === 'thinking' ? 'think' : null;

  useEffect(() => {
    setEmoteNonce((value) => value + 1);
  }, [mood]);

  useEffect(() => {
    setSelectedVariant(normalizeAvatarVariant(agent.config?.roomAvatarVariant));
    setVariantError(null);
  }, [agent.config?.roomAvatarVariant, agent.id]);

  const handleRefreshSessions = useCallback(async () => {
    setRefreshingSessions(true);
    try {
      await refreshChatSessions();
    } finally {
      setRefreshingSessions(false);
    }
  }, [refreshChatSessions]);

  const handleStartNewChatSession = useCallback(async () => {
    await startNewChatSession();
    onSessionSelect?.();
  }, [onSessionSelect, startNewChatSession]);

  const handleAvatarChange = useCallback(
    async (value: string) => {
      const nextVariant = normalizeAvatarVariant(value);
      const previous = selectedVariant;

      setSelectedVariant(nextVariant);
      setSavingVariant(true);
      setVariantError(null);
      setEmoteNonce((current) => current + 1);

      const res = await api.updateAgent(agent.id, {
        config: { roomAvatarVariant: nextVariant || null },
        commitMessage: 'Update room avatar variant from chat',
      });
      setSavingVariant(false);
      if (!res.success) {
        setSelectedVariant(previous);
        setVariantError(res.error ?? 'Could not update avatar');
        return;
      }
      await loadAgent();
    },
    [agent.id, loadAgent, selectedVariant],
  );

  return (
    <aside
      className={`flex max-h-full w-full shrink-0 flex-col overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]/60 md:w-72 lg:w-[22rem] 2xl:w-96 ${className}`}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 md:px-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSessionsOpen((value) => !value)}
              className="flex min-w-0 items-center gap-2 text-left text-xs font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--color-accent)]"
              aria-expanded={sessionsOpen}
            >
              {sessionsOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              <span className="truncate">Chats</span>
              {chatSessions.length > 0 && (
                <span className="truncate text-[10px] font-normal text-[var(--text-muted)]">
                  {chatSessions.length > 99 ? '99+' : chatSessions.length}
                </span>
              )}
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void handleRefreshSessions()}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
                aria-label="Refresh chat sessions"
                title="Refresh"
              >
                <RefreshCw
                  size={12}
                  className={refreshingSessions ? 'animate-spin' : ''}
                />
              </button>
              <button
                type="button"
                onClick={() => void handleStartNewChatSession()}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/15"
                aria-label="Start new chat"
                title="New chat"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {sessionsOpen && (
            <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1">
              {chatSessions.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--border-default)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
                  No chats yet
                </div>
              ) : (
                chatSessions.map((session) => {
                  const selected =
                    session.id === activeChatSessionId ||
                    (!activeChatSessionId && session.current);
                  return (
                    <div
                      key={session.id}
                      className={`group flex w-full items-stretch rounded-md border transition-colors ${
                        selected
                          ? 'border-[var(--color-accent)]/35 bg-[rgba(6,182,212,0.08)]'
                          : 'border-transparent hover:bg-white/[0.04]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveChatSessionId(session.id);
                          onSessionSelect?.();
                        }}
                        className="min-w-0 flex-1 px-2.5 py-2 text-left"
                      >
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
                            {session.title}
                          </span>
                          <span className="flex shrink-0 items-center gap-1 text-[10px] text-[var(--text-muted)]">
                            <Clock size={10} />
                            {formatRelative(session.updatedAt)}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
                          {session.preview || `${session.messageCount} turns`}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteChatSession(session.id)}
                        disabled={deletingChatSessionId === session.id}
                        className="flex w-8 shrink-0 items-center justify-center rounded-r-md text-[var(--text-muted)] opacity-70 transition-colors hover:bg-[var(--color-destructive-bg)] hover:text-[var(--color-destructive)] hover:opacity-100 focus-visible:bg-[var(--color-destructive-bg)] focus-visible:text-[var(--color-destructive)] focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Delete chat ${session.title}`}
                        title="Delete chat"
                      >
                        {deletingChatSessionId === session.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--border-default)] px-3 py-3 md:px-4">
        <AgentEyesLiveCard
          agentId={agent.id}
          agentName={agent.name}
          framework={agent.framework}
          status={agent.status}
        />

        <div className="relative h-44 overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_50%_20%,rgba(115,164,185,0.14),rgba(0,0,0,0.45)_58%,rgba(0,0,0,0.72))] md:h-[clamp(12rem,24dvh,16rem)]">
          <AgentRoomAvatarPreview
            agentId={agent.id}
            framework={agent.framework}
            status={agent.status}
            avatarVariant={selectedVariant}
            avatarTraits={
              agent.config?.roomAvatarTraits ?? agent.config?.avatarTraits
            }
            activeEmote={activeEmote}
            emoteNonce={emoteNonce}
            isStreaming={thinking}
          />
        </div>

        <label className="mt-3 grid gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Avatar
          </span>
          <select
            value={selectedVariant ?? ''}
            onChange={(event) => void handleAvatarChange(event.target.value)}
            disabled={!isAuthenticated || savingVariant}
            className={`${AVATAR_SELECT_CLASSNAME} h-9 text-xs`}
            style={AVATAR_SELECT_STYLE}
          >
            <option value="" className={AVATAR_SELECT_OPTION_CLASSNAME}>
              Auto
            </option>
            {selectedVariant &&
              !SELECTABLE_AVATAR_VARIANTS.some(
                (variant) => variant.id === selectedVariant,
              ) && (
                <option
                  value={selectedVariant}
                  className={AVATAR_SELECT_OPTION_CLASSNAME}
                >
                  {AVATAR_VARIANTS.find(
                    (variant) => variant.id === selectedVariant,
                  )?.name ?? 'Legacy avatar'}{' '}
                  (legacy)
                </option>
              )}
            {SELECTABLE_AVATAR_VARIANTS.map((variant) => (
              <option
                key={variant.id}
                value={variant.id}
                className={AVATAR_SELECT_OPTION_CLASSNAME}
              >
                {variant.name}
              </option>
            ))}
          </select>
          {variantError && (
            <span className="text-[11px] leading-tight text-[var(--color-destructive)]">
              {variantError}
            </span>
          )}
        </label>
      </div>
    </aside>
  );
}
