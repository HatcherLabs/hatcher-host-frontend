'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ExternalLink, MessageSquare, RefreshCw, Send, Sparkles, UserRound } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { generateAgentAvatar } from '@/lib/avatar-generator';
import {
  buildPublicChatStorageKeys,
  createPublicChatMessage,
  publicChatHistoryForRequest,
  type PublicChatMessage,
  type PublicChatSession,
} from '@/lib/public-chat';
import { sanitizePublicChatUsername } from '@/lib/public-chat-username';
import {
  createPublicAgentChatSession,
  getPublicAgentChat,
  sendPublicAgentChatMessage,
  type PublicAgentChatAgent,
  type PublicAgentChatUsage,
} from '@/lib/public-agent-chat-api';
import {
  agentEmbedAccentColor,
  agentEmbedAccentForeground,
  normalizeAgentEmbedOptions,
  type AgentEmbedTheme,
} from '@/lib/agent-embed';

const RichMarkdown = dynamic(
  () =>
    import('@/components/agents/tabs/ChatTab/ArtifactRenderer').then(
      (module) => module.RichMarkdown
    ),
  { loading: () => <span className="whitespace-pre-wrap">Loading response…</span> }
);

const SUGGESTIONS = [
  'What can you help me with?',
  'Summarize what you know.',
  'What should I do next?',
] as const;

function loadMessages(agentId: string, sessionId: string): PublicChatMessage[] {
  try {
    const raw = window.localStorage.getItem(buildPublicChatStorageKeys(agentId, sessionId).history);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): PublicChatMessage[] => {
      if (!item || typeof item !== 'object') return [];
      const message = item as Partial<PublicChatMessage>;
      if (
        (message.role !== 'user' && message.role !== 'assistant') ||
        typeof message.content !== 'string'
      ) {
        return [];
      }
      return [
        {
          id:
            typeof message.id === 'string'
              ? message.id
              : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          role: message.role,
          content: message.content,
          createdAt: typeof message.createdAt === 'number' ? message.createdAt : Date.now(),
        },
      ];
    });
  } catch {
    return [];
  }
}

function applyEmbedTheme(theme: AgentEmbedTheme): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    const dark = theme === 'dark' || (theme === 'auto' && media.matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  };
  apply();
  if (theme !== 'auto') return () => undefined;
  media.addEventListener('change', apply);
  return () => media.removeEventListener('change', apply);
}

export function AgentEmbedChat({ agentId }: { agentId: string }) {
  const searchParams = useSearchParams();
  const appearance = normalizeAgentEmbedOptions({
    theme: searchParams.get('theme'),
    accent: searchParams.get('accent'),
  });
  const accentColor = agentEmbedAccentColor(appearance.accent);
  const accentForeground = agentEmbedAccentForeground(appearance.accent);
  const [agent, setAgent] = useState<PublicAgentChatAgent | null>(null);
  const [usage, setUsage] = useState<PublicAgentChatUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [session, setSession] = useState<PublicChatSession | null>(null);
  const [messages, setMessages] = useState<PublicChatMessage[]>([]);
  const [username, setUsername] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => applyEmbedTheme(appearance.theme), [appearance.theme]);

  useEffect(() => {
    let active = true;
    getPublicAgentChat(agentId)
      .then((response) => {
        if (!active) return;
        if (!response.success || !response.data.enabled || !response.data.agent) {
          setUnavailable('This agent is not accepting public chats right now.');
          return;
        }
        setAgent(response.data.agent);
        setUsage({
          dailyAiCreditsAvailable: response.data.dailyAiCreditsAvailable,
          dailyAiCreditCap: response.data.dailyAiCreditCap,
          dailyAiCreditsSpent: response.data.dailyAiCreditsSpent,
          dailyAiCreditsRemaining: response.data.dailyAiCreditsRemaining,
        });
      })
      .catch(() => {
        if (active) setUnavailable('Agent chat could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [agentId]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(buildPublicChatStorageKeys(agentId).session);
      const parsed = raw ? (JSON.parse(raw) as Partial<PublicChatSession>) : null;
      if (!parsed?.sessionId || !parsed.username) return;
      const restoredUsername = sanitizePublicChatUsername(parsed.username);
      if (!restoredUsername) return;
      const restored = { sessionId: parsed.sessionId, username: restoredUsername };
      setSession(restored);
      setUsername(restoredUsername);
      setMessages(loadMessages(agentId, restored.sessionId));
    } catch {
      setSession(null);
      setMessages([]);
    }
  }, [agentId]);

  useEffect(() => {
    if (!session) return;
    try {
      const keys = buildPublicChatStorageKeys(agentId, session.sessionId);
      window.localStorage.setItem(keys.session, JSON.stringify(session));
      window.localStorage.setItem(keys.history, JSON.stringify(messages.slice(-80)));
    } catch {
      // The in-memory chat remains usable when third-party storage is blocked.
    }
  }, [agentId, messages, session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [busy, messages]);

  const startSession = useCallback(async () => {
    const cleanName = sanitizePublicChatUsername(username);
    if (!cleanName || busy) return;
    setBusy(true);
    setError(null);
    const response = await createPublicAgentChatSession(agentId, cleanName);
    setBusy(false);
    if (!response.success) {
      setError(response.error || 'Could not start this chat.');
      return;
    }
    const nextSession = {
      sessionId: response.data.sessionId,
      username: sanitizePublicChatUsername(response.data.username),
    };
    if (!nextSession.username) {
      setError('Could not start this chat.');
      return;
    }
    setAgent(response.data.agent);
    setSession(nextSession);
    setMessages([]);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }, [agentId, busy, username]);

  const startNewSession = useCallback(() => {
    setMessages([]);
    setSession(null);
    setError(null);
    try {
      window.localStorage.removeItem(buildPublicChatStorageKeys(agentId).session);
      if (session?.sessionId) {
        window.localStorage.removeItem(
          buildPublicChatStorageKeys(agentId, session.sessionId).history
        );
      }
    } catch {
      // Ignore storage cleanup failures.
    }
  }, [agentId, session]);

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? draft).trim();
      if (!text || !session || busy) return;

      const outgoing = createPublicChatMessage('user', text);
      const history = publicChatHistoryForRequest(messages);
      setMessages((current) => [...current, outgoing]);
      setDraft('');
      setBusy(true);
      setError(null);

      const response = await sendPublicAgentChatMessage(agentId, {
        sessionId: session.sessionId,
        username: session.username,
        message: text,
        history,
      });

      setBusy(false);
      if (!response.success) {
        setError(response.error || 'The agent could not answer.');
        return;
      }
      setUsage((current) => ({
        dailyAiCreditsAvailable:
          response.data.dailyAiCreditsAvailable ?? current?.dailyAiCreditsAvailable,
        dailyAiCreditCap: response.data.dailyAiCreditCap ?? current?.dailyAiCreditCap ?? null,
        dailyAiCreditsSpent:
          response.data.dailyAiCreditsSpent ?? current?.dailyAiCreditsSpent ?? null,
        dailyAiCreditsRemaining:
          response.data.dailyAiCreditsRemaining ?? current?.dailyAiCreditsRemaining ?? null,
      }));
      if (response.data.starting) {
        setError(response.data.content);
        return;
      }
      setMessages((current) => [
        ...current,
        createPublicChatMessage('assistant', response.data.content),
      ]);
    },
    [agentId, busy, draft, messages, session]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  return (
    <main
      className="flex h-dvh min-h-[420px] flex-col overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]"
      style={
        {
          '--color-accent': accentColor,
          '--embed-accent-foreground': accentForeground,
        } as React.CSSProperties
      }
    >
      <header className="flex items-center gap-3 border-b border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 pr-14">
        {agent ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agent.avatarUrl || generateAgentAvatar(agent.name, agent.framework)}
            alt=""
            className="h-10 w-10 rounded-xl border border-[var(--border-default)] object-cover"
          />
        ) : (
          <div className="h-10 w-10 animate-pulse rounded-xl bg-[var(--bg-elevated)]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{agent?.name ?? 'Hatcher agent'}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${agent?.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`}
            />
            {agent?.status === 'active' ? 'Online' : 'Available on demand'}
          </p>
        </div>
        {session ? (
          <button
            type="button"
            onClick={startNewSession}
            disabled={busy}
            className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] transition-colors hover:text-[var(--color-accent)] disabled:opacity-50"
            aria-label="Start a new chat"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        ) : null}
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Sparkles className="h-6 w-6 animate-pulse text-[var(--color-accent)]" />
        </div>
      ) : unavailable ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <MessageSquare className="h-8 w-8 text-[var(--text-muted)]" />
          <h1 className="mt-4 text-base font-semibold">Chat unavailable</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{unavailable}</p>
        </div>
      ) : !session ? (
        <div className="flex flex-1 flex-col justify-center px-5 py-8">
          <div className="mx-auto w-full max-w-sm text-center">
            <Sparkles className="mx-auto h-7 w-7 text-[var(--color-accent)]" />
            <h1 className="mt-3 text-lg font-semibold">Hi there</h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {agent?.description || `I'm ${agent?.name}, ready to help.`}
            </p>
            <form
              className="mt-6 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void startSession();
              }}
            >
              <label className="block text-left text-xs font-medium text-[var(--text-secondary)]">
                Your display name
                <span className="mt-2 flex min-h-11 items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3">
                  <UserRound className="h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    value={username}
                    onChange={(event) => setUsername(sanitizePublicChatUsername(event.target.value))}
                    maxLength={40}
                    autoComplete="nickname"
                    placeholder="Your display name"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
                  />
                </span>
              </label>
              <button
                type="submit"
                disabled={busy || !username.trim()}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--embed-accent-foreground)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageSquare className="h-4 w-4" />
                {busy ? 'Starting…' : 'Start chat'}
              </button>
            </form>
            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
                <p className="text-sm text-[var(--text-secondary)]">How can I help?</p>
                <div className="mt-3 flex flex-col gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void sendMessage(suggestion)}
                      className="rounded-lg border border-[var(--border-default)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-[var(--color-accent)] text-[var(--embed-accent-foreground)]'
                      : 'border border-[var(--border-default)] bg-[var(--bg-elevated)]'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <RichMarkdown content={message.content} agentId={agentId} />
                  ) : (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  )}
                </div>
              </div>
            ))}
            {busy ? (
              <div className="flex justify-start">
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-muted)]">
                  Thinking…
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
          {error ? (
            <div className="border-t border-[var(--border-default)] px-4 py-2 text-xs text-red-400">
              {error}
            </div>
          ) : null}
          <div className="border-t border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={4000}
                rows={1}
                placeholder={`Message ${agent?.name ?? 'agent'}…`}
                className="min-h-11 flex-1 resize-none rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--color-accent)]/50"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={busy || !draft.trim()}
                className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-accent)] text-[var(--embed-accent-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            {typeof usage?.dailyAiCreditsRemaining === 'number' ? (
              <p className="mt-2 text-center text-[10px] text-[var(--text-muted)]">
                {usage.dailyAiCreditsRemaining.toLocaleString()} public AI Credits remaining today
              </p>
            ) : null}
          </div>
        </>
      )}

      <a
        href={`/agent/${encodeURIComponent(agentId)}`}
        target="_blank"
        rel="noreferrer"
        className="flex h-8 flex-none items-center justify-center gap-1.5 border-t border-[var(--border-default)] bg-[var(--bg-secondary)] text-[10px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--color-accent)]"
      >
        Powered by Hatcher
        <ExternalLink className="h-3 w-3" />
      </a>
    </main>
  );
}
