'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, Brain, MessageCircle, Radio, Sparkles } from 'lucide-react';
import {
  AVATAR_VARIANTS,
  normalizeAvatarVariant,
  type AvatarVariant,
  type RoomEmoteId,
} from '@/components/agent-room/v2/stations/AgentBody';
import { api } from '@/lib/api';
import { useAgentContext } from '../../AgentContext';

const AgentRoomAvatarPreview = dynamic(
  () => import('./AgentRoomAvatarPreview').then((m) => m.AgentRoomAvatarPreview),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full rounded-lg bg-black/20" aria-hidden />
    ),
  },
);

export function AgentPresenceRail() {
  const {
    agent,
    isAuthenticated,
    loadAgent,
    messages,
    sending,
    inflightTools,
    wsConnected,
  } = useAgentContext();
  const [greeting, setGreeting] = useState(true);
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
  const thinking = sending || inflightTools.length > 0 || Boolean(lastMessage?.streaming);
  const mood = greeting ? 'greeting' : thinking ? 'thinking' : wsConnected ? 'ready' : 'idle';
  const activeEmote: RoomEmoteId | null = mood === 'greeting' ? 'wave' : mood === 'thinking' ? 'think' : null;

  useEffect(() => {
    setEmoteNonce((value) => value + 1);
  }, [mood]);

  useEffect(() => {
    setSelectedVariant(normalizeAvatarVariant(agent.config?.roomAvatarVariant));
    setVariantError(null);
  }, [agent.config?.roomAvatarVariant, agent.id]);

  const handleAvatarChange = useCallback(async (value: string) => {
    const nextVariant = normalizeAvatarVariant(value);
    const previous = selectedVariant;
    const nextConfig: Record<string, unknown> = { ...(agent.config ?? {}) };
    if (nextVariant) {
      nextConfig.roomAvatarVariant = nextVariant;
    } else {
      delete nextConfig.roomAvatarVariant;
    }

    setSelectedVariant(nextVariant);
    setSavingVariant(true);
    setVariantError(null);
    setEmoteNonce((current) => current + 1);

    const res = await api.updateAgent(agent.id, {
      config: nextConfig,
      commitMessage: 'Update room avatar variant from chat',
    });
    setSavingVariant(false);
    if (!res.success) {
      setSelectedVariant(previous);
      setVariantError(res.error ?? 'Could not update avatar');
      return;
    }
    await loadAgent();
  }, [agent.config, agent.id, loadAgent, selectedVariant]);

  const moodMeta = useMemo(() => {
    if (mood === 'greeting') {
      return {
        label: 'Joined',
        detail: 'Agent joined the chat',
        Icon: Sparkles,
        className: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200',
      };
    }
    if (mood === 'thinking') {
      return {
        label: 'Thinking',
        detail: inflightTools[0]?.name ? `Running ${inflightTools[0].name}` : 'Processing the response',
        Icon: Brain,
        className: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
      };
    }
    if (mood === 'ready') {
      return {
        label: 'Ready',
        detail: 'Webchat connected',
        Icon: Radio,
        className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
      };
    }
    return {
      label: 'Idle',
      detail: 'Waiting for a message',
      Icon: MessageCircle,
      className: 'border-white/10 bg-white/[0.03] text-[var(--text-secondary)]',
    };
  }, [inflightTools, mood]);
  const MoodIcon = moodMeta.Icon;

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]/60 md:w-72 lg:w-80 2xl:w-96">
      <div className="border-b border-[var(--border-default)] px-3 py-3 md:px-4 md:py-4">
        <div className="flex gap-3 md:flex-col">
          <div className="relative h-28 w-28 flex-none overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,0.14),rgba(0,0,0,0.45)_58%,rgba(0,0,0,0.72))] md:h-72 md:w-full lg:h-[22rem] 2xl:h-96">
            <AgentRoomAvatarPreview
              agentId={agent.id}
              framework={agent.framework}
              status={agent.status}
              avatarVariant={selectedVariant}
              activeEmote={activeEmote}
              emoteNonce={emoteNonce}
              isStreaming={thinking}
            />
            <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-black/80 text-[var(--color-accent)]">
              <MoodIcon size={14} />
            </span>
          </div>
          <div className="min-w-0 flex-1 md:flex-none">
            <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{agent.name}</div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                {agent.framework}
              </span>
            </div>
            <label className="mt-3 grid gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Avatar
              </span>
              <select
                value={selectedVariant ?? ''}
                onChange={(event) => void handleAvatarChange(event.target.value)}
                disabled={!isAuthenticated || savingVariant}
                className="h-9 w-full rounded-md border border-[var(--border-default)] bg-black/25 px-2 text-xs text-[var(--text-primary)] outline-none transition-colors hover:border-[var(--color-accent)]/40 focus:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Auto</option>
                {AVATAR_VARIANTS.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name}
                  </option>
                ))}
              </select>
              {variantError && (
                <span className="text-[11px] leading-tight text-red-300">{variantError}</span>
              )}
            </label>
            <div className={`mt-3 rounded-md border px-3 py-2 md:hidden ${moodMeta.className}`}>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <MoodIcon size={14} />
                {moodMeta.label}
              </div>
              <div className="mt-1 truncate text-[11px] opacity-80">{moodMeta.detail}</div>
            </div>
          </div>
        </div>

        {agent.description && (
          <p className="mt-3 hidden line-clamp-3 text-xs leading-relaxed text-[var(--text-muted)] md:block">
            {agent.description}
          </p>
        )}
      </div>

      <div className="hidden border-b border-[var(--border-default)] px-4 py-3 md:block">
        <div className={`rounded-md border px-3 py-2 ${moodMeta.className}`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <MoodIcon size={14} />
            {moodMeta.label}
          </div>
          <div className="mt-1 truncate text-[11px] opacity-80">{moodMeta.detail}</div>
        </div>
      </div>

      <div className="mt-auto hidden border-t border-[var(--border-default)] px-4 py-3 md:block">
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <Bot size={13} />
          <span className="truncate">
            {messages.length > 0 ? `${messages.length} messages in view` : 'No messages yet'}
          </span>
        </div>
      </div>
    </aside>
  );
}
