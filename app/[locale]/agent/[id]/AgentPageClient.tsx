'use client';

import { useEffect, useState, useCallback, useMemo, useRef, type KeyboardEvent } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

/**
 * Back button that picks its destination based on where the user came
 * from: referrer-based when the landing was from /city or /dashboard,
 * else falls back to "My Agents" (owner) / "City" (everyone else).
 */
function BackLink({ isOwner }: { isOwner: boolean }) {
  const t = useTranslations('agentPublic.back');
  const target = useMemo(() => {
    if (typeof window === 'undefined') {
      return isOwner
        ? { href: '/dashboard/agents', label: t('toMyAgents') }
        : { href: '/city', label: t('toCity') };
    }
    const ref = document.referrer;
    if (ref) {
      try {
        const u = new URL(ref);
        if (u.origin === window.location.origin) {
          if (u.pathname === '/city' || u.pathname.startsWith('/city/')) {
            return { href: '/city', label: t('toCity') };
          }
          if (u.pathname === '/dashboard/agents') {
            return { href: '/dashboard/agents', label: t('toMyAgents') };
          }
          if (u.pathname === '/dashboard') {
            return { href: '/dashboard', label: t('toDashboard') };
          }
        }
      } catch { /* ignore */ }
    }
    return isOwner
      ? { href: '/dashboard/agents', label: t('toMyAgents') }
      : { href: '/city', label: t('toCity') };
  }, [isOwner, t]);
  return (
    <Link
      href={target.href}
      className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--color-accent)] transition-colors duration-200"
    >
      <ArrowLeft className="w-4 h-4" />
      {target.label}
    </Link>
  );
}
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useWallet } from '@solana/wallet-adapter-react';
import { shortenAddress, timeAgo } from '@/lib/utils';
import { generateAgentAvatar } from '@/lib/avatar-generator';
import {
  buildPublicChatStorageKeys,
  createPublicChatMessage,
  publicChatHistoryForRequest,
  type PublicChatMessage,
  type PublicChatSession,
} from '@/lib/public-chat';
import { RichMarkdown } from '@/components/agents/tabs/ChatTab/ArtifactRenderer';
import { FRAMEWORKS } from '@hatcher/shared';
import type { AgentFramework } from '@hatcher/shared';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  Brain,
  Check,
  MessageSquare,
  Settings,
  Share2,
  Layers,
  Calendar,
  Cpu,
  Activity,
  Clock,
  BarChart3,
  Rocket,
  RefreshCw,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';

const FRAMEWORK_AVATAR: Record<string, { gradient: string; icon: React.ComponentType<{ className?: string }> }> = {
  openclaw: { gradient: 'from-amber-600 to-amber-400', icon: Cpu },
  hermes:   { gradient: 'from-purple-600 to-purple-400', icon: Brain },
};


const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot: string; pulse: boolean; key: string }> = {
  active:   { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20',  dot: 'bg-green-400',  pulse: true,  key: 'active' },
  sleeping: { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20',   dot: 'bg-blue-400',   pulse: false, key: 'sleeping' },
  paused:   { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20',  dot: 'bg-amber-400',  pulse: false, key: 'paused' },
  error:    { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20',    dot: 'bg-red-400',    pulse: false, key: 'error' },
  killed:      { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20',    dot: 'bg-red-400',    pulse: false, key: 'killed' },
  restarting:  { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20',  dot: 'bg-amber-400',  pulse: true,  key: 'restarting' },
};

const cardClass = 'card glass-noise';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const PUBLIC_CHAT_SUGGESTIONS = [
  'What are the most important DeFi updates today?',
  'Summarize recent on-chain activity for BTC and ETH.',
  'Find current market research on liquid restaking.',
];

type PublicChatUsage = {
  dailyAiCreditCap: number | null;
  dailyAiCreditsSpent: number | null;
  dailyAiCreditsRemaining: number | null;
};

function formatAiCredits(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value)).toLocaleString()
    : '--';
}

function loadPublicChatMessages(agentId: string, sessionId: string): PublicChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(buildPublicChatStorageKeys(agentId, sessionId).history);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): PublicChatMessage[] => {
      if (!item || typeof item !== 'object') return [];
      const msg = item as Partial<PublicChatMessage>;
      if ((msg.role !== 'user' && msg.role !== 'assistant') || typeof msg.content !== 'string') return [];
      return [{
        id: typeof msg.id === 'string' ? msg.id : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role: msg.role,
        content: msg.content,
        createdAt: typeof msg.createdAt === 'number' ? msg.createdAt : Date.now(),
      }];
    });
  } catch {
    return [];
  }
}

function PublicAgentChat({
  agentId,
  agentName,
  autoFocus,
  usage,
  onUsageChange,
}: {
  agentId: string;
  agentName: string;
  autoFocus: boolean;
  usage: PublicChatUsage | null;
  onUsageChange: (usage: PublicChatUsage) => void;
}) {
  const t = useTranslations('agentPublic.publicChat');
  const [session, setSession] = useState<PublicChatSession | null>(null);
  const [messages, setMessages] = useState<PublicChatMessage[]>([]);
  const [username, setUsername] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(buildPublicChatStorageKeys(agentId).session);
      const parsed = raw ? JSON.parse(raw) as Partial<PublicChatSession> : null;
      if (!parsed?.sessionId || !parsed.username) return;
      const restored = { sessionId: parsed.sessionId, username: parsed.username };
      setSession(restored);
      setUsername(restored.username);
      setMessages(loadPublicChatMessages(agentId, restored.sessionId));
    } catch {
      setSession(null);
      setMessages([]);
    }
  }, [agentId]);

  useEffect(() => {
    if (!session || typeof window === 'undefined') return;
    try {
      const keys = buildPublicChatStorageKeys(agentId, session.sessionId);
      window.localStorage.setItem(keys.session, JSON.stringify(session));
      window.localStorage.setItem(keys.history, JSON.stringify(messages.slice(-80)));
    } catch {
      // Public chat should continue even when browser storage is unavailable.
    }
  }, [agentId, messages, session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  useEffect(() => {
    if (!autoFocus) return;
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => inputRef.current?.focus(), 350);
  }, [autoFocus, session]);

  const startSession = useCallback(async (nameOverride?: string) => {
    const cleanName = (nameOverride ?? username).trim();
    if (!cleanName || busy) return;
    setBusy(true);
    setError(null);
    const res = await api.createAgentPublicChatSession(agentId, cleanName);
    setBusy(false);
    if (!res.success) {
      setError(res.error || t('errors.session'));
      return;
    }
    const nextSession = { sessionId: res.data.sessionId, username: res.data.username };
    setSession(nextSession);
    setUsername(nextSession.username);
    setMessages([]);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(buildPublicChatStorageKeys(agentId).session, JSON.stringify(nextSession));
        window.localStorage.removeItem(buildPublicChatStorageKeys(agentId, nextSession.sessionId).history);
      } catch {
        // Keep the in-memory session if browser storage is unavailable.
      }
    }
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }, [agentId, busy, t, username]);

  const startNewSession = useCallback(() => {
    const currentName = session?.username ?? username;
    setMessages([]);
    setSession(null);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(buildPublicChatStorageKeys(agentId).session);
        if (session?.sessionId) {
          window.localStorage.removeItem(buildPublicChatStorageKeys(agentId, session.sessionId).history);
        }
      } catch {
        // Ignore storage cleanup failures.
      }
    }
    if (currentName.trim()) void startSession(currentName);
  }, [agentId, session, startSession, username]);

  const sendMessage = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? draft).trim();
    if (!text || !session || busy) return;

    const outgoing = createPublicChatMessage('user', text);
    const history = publicChatHistoryForRequest(messages);
    setMessages((prev) => [...prev, outgoing]);
    setDraft('');
    setBusy(true);
    setError(null);

    const res = await api.sendAgentPublicChatMessage(agentId, {
      sessionId: session.sessionId,
      username: session.username,
      message: text,
      history,
    });

    setBusy(false);
    if (!res.success) {
      setError(res.error || t('errors.message'));
      return;
    }
    if (res.data.starting) {
      onUsageChange({
        dailyAiCreditCap: res.data.dailyAiCreditCap ?? usage?.dailyAiCreditCap ?? null,
        dailyAiCreditsSpent: res.data.dailyAiCreditsSpent ?? usage?.dailyAiCreditsSpent ?? null,
        dailyAiCreditsRemaining: res.data.dailyAiCreditsRemaining ?? usage?.dailyAiCreditsRemaining ?? null,
      });
      setError(res.data.content);
      return;
    }
    onUsageChange({
      dailyAiCreditCap: res.data.dailyAiCreditCap ?? usage?.dailyAiCreditCap ?? null,
      dailyAiCreditsSpent: res.data.dailyAiCreditsSpent ?? usage?.dailyAiCreditsSpent ?? null,
      dailyAiCreditsRemaining: res.data.dailyAiCreditsRemaining ?? usage?.dailyAiCreditsRemaining ?? null,
    });
    setMessages((prev) => [...prev, createPublicChatMessage('assistant', res.data.content)]);
  }, [agentId, busy, draft, messages, onUsageChange, session, t, usage]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }, [sendMessage]);

  return (
    <motion.div ref={rootRef} className={`${cardClass} mb-6 scroll-mt-24 overflow-hidden`} variants={itemVariants}>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
            <Sparkles className="h-4 w-4" />
            {t('eyebrow')}
          </div>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{t('heading', { name: agentName })}</h2>
          {usage?.dailyAiCreditCap !== null && usage?.dailyAiCreditCap !== undefined && (
            <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
              <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-accent)]" />
              <span className="truncate">
                {formatAiCredits(usage.dailyAiCreditsRemaining)} / {formatAiCredits(usage.dailyAiCreditCap)} AI Credits today
              </span>
            </div>
          )}
        </div>
        {session && (
          <button
            type="button"
            onClick={startNewSession}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
            disabled={busy}
          >
            <RefreshCw className="h-4 w-4" />
            {t('newSession')}
          </button>
        )}
      </div>

      {!session ? (
        <div className="p-5">
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void startSession();
            }}
          >
            <label className="flex min-h-[44px] flex-1 items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3">
              <UserRound className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                maxLength={40}
                placeholder={t('usernamePlaceholder')}
                className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !username.trim()}
              className="btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MessageSquare className="h-4 w-4" />
              {busy ? t('starting') : t('start')}
            </button>
          </form>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>
      ) : (
        <div className="flex h-[560px] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
            {messages.length === 0 && (
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
                <p className="text-sm text-[var(--text-secondary)]">{t('empty')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PUBLIC_CHAT_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setDraft(suggestion);
                        window.setTimeout(() => inputRef.current?.focus(), 20);
                      }}
                      className="rounded-lg border border-[var(--border-default)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[86%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
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
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-muted)]">
                  {t('thinking')}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="border-t border-[var(--border-default)] px-5 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="border-t border-[var(--border-default)] p-4">
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={4000}
                rows={1}
                placeholder={t('messagePlaceholder', { username: session.username })}
                className="min-h-[44px] flex-1 resize-none rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--color-accent)]/50"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={busy || !draft.trim()}
                className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={t('send')}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function AgentPageClient() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const t = useTranslations('agentPublic');
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publicChatEnabled, setPublicChatEnabled] = useState(false);
  const [publicChatUsage, setPublicChatUsage] = useState<PublicChatUsage | null>(null);
  const [copied, setCopied] = useState(false);
  const [publicStats, setPublicStats] = useState<{
    messagesProcessed: number;
    daysActive: number;
    uptimePercent: number;
    template: string | null;
    createdAt: string;
    lastActiveAt: string;
  } | null>(null);
  const { isAuthenticated: authed, user: authUser } = useAuth();
  const wallet = useWallet();

  useEffect(() => {
    api.getAgent(id).then((res) => {
      setLoading(false);
      if (res.success) setAgent(res.data);
      else setError(res.error ?? 'Agent not found');
    }).catch(() => {
      setLoading(false);
      setError('Network error — is the API running?');
    });

    // Fetch public stats (no auth needed)
    api.getAgentPublicStats(id).then((res) => {
      if (res.success) setPublicStats(res.data);
    }).catch(() => {/* ignore */});

    api.getAgentPublicChat(id).then((res) => {
      const enabled = res.success && res.data.enabled;
      setPublicChatEnabled(enabled);
      setPublicChatUsage(enabled ? {
        dailyAiCreditCap: res.data.dailyAiCreditCap,
        dailyAiCreditsSpent: res.data.dailyAiCreditsSpent,
        dailyAiCreditsRemaining: res.data.dailyAiCreditsRemaining,
      } : null);
    }).catch(() => {
      setPublicChatEnabled(false);
      setPublicChatUsage(null);
    });
  }, [id]);

  const handleShare = useCallback(() => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className={`${cardClass} p-8 animate-pulse`}>
          <div className="flex gap-5 mb-6">
            <div className="w-20 h-20 rounded-2xl shimmer flex-shrink-0" />
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-6 shimmer rounded-lg w-1/2" />
              <div className="h-4 shimmer rounded-lg w-1/3" />
              <div className="h-4 shimmer rounded-lg w-1/4" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 shimmer rounded-lg" />
            <div className="h-4 shimmer rounded-lg w-5/6" />
            <div className="h-4 shimmer rounded-lg w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    const isNetworkError = error?.toLowerCase().includes('network');
    const title = isNetworkError
      ? t('errors.connectionError')
      : error?.toLowerCase().includes('not found') || !error
        ? t('errors.notFound')
        : t('errors.somethingWrong');

    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center mx-auto mb-6">
            <Bot size={32} className="text-[var(--color-accent)]" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">{title}</h1>
          <p className="mb-6 text-[var(--text-secondary)]">
            {error || t('errors.defaultMessage')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.history.back()}
              className="btn-secondary inline-flex items-center gap-2 justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('errors.goBack')}
            </button>
            <Link href="/dashboard/agents" className="btn-secondary inline-flex items-center gap-2 justify-center">
              {t('errors.myAgents')}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const fwAvatar = FRAMEWORK_AVATAR[agent.framework] ?? { gradient: 'from-slate-600 to-slate-400', icon: Bot };
  const FwIcon = fwAvatar.icon;
  const ownerUsername = agent.ownerUsername ?? agent.owner?.username;
  const ownerAddress = agent.ownerAddress ?? agent.owner?.walletAddress ?? '';
  const ownerDisplay = ownerUsername ?? (ownerAddress ? shortenAddress(ownerAddress) : 'Unknown');
  const frameworkMeta = FRAMEWORKS[agent.framework as AgentFramework];
  const isOwner = !!(authed && authUser && agent.ownerId === authUser.id);
  const statusStyle = STATUS_STYLES[agent.status] ?? STATUS_STYLES['paused']!;
  const featureCount = agent.features?.length ?? 0;
  const publicChatAutoFocus = searchParams.get('chat') === '1';

  return (
    <motion.div
      className="mx-auto max-w-2xl px-4 py-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Back navigation — destination depends on how the user arrived */}
      <motion.div variants={itemVariants} className="mb-6">
        <BackLink isOwner={isOwner} />
      </motion.div>

      {/* Agent Profile Card */}
      <motion.div className={`${cardClass} p-8 mb-6`} variants={itemVariants}>
        {/* Avatar + Name */}
        <div className="flex items-start gap-5 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={agent.avatarUrl || generateAgentAvatar(agent.name, agent.framework)}
            alt={agent.name}
            className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 border border-[var(--border-default)]"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{agent.name}</h1>
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} ${statusStyle.pulse ? 'animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.5)]' : ''}`} />
                {t(`status.${statusStyle.key}`)}
              </span>
            </div>

            {/* Framework badge */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {frameworkMeta && (
                <span className="fw-tag">
                  {frameworkMeta.name}
                </span>
              )}
              {featureCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                  <Layers className="w-3 h-3" />
                  {featureCount !== 1 ? t('profile.featuresCountPlural', { count: featureCount }) : t('profile.featuresCount', { count: featureCount })}
                </span>
              )}
            </div>

            <div className="text-xs text-[var(--text-muted)]">
              {t('profile.by')} <span className="font-medium text-[var(--text-secondary)]">{ownerDisplay}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {agent.description && (
          <p className="leading-relaxed mb-6 text-[var(--text-secondary)]">{agent.description}</p>
        )}

        {/* Framework features */}
        {frameworkMeta && (
          <div className="mb-6">
            <div className="section-label mb-2">{t('profile.frameworkFeatures')}</div>
            <div className="flex flex-wrap gap-2">
              {frameworkMeta.features.map((feat) => (
                <span key={feat} className="fw-tag">
                  {feat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between text-xs pt-4 border-t border-[var(--border-default)] text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" />
              {frameworkMeta?.name ?? agent.framework}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {timeAgo(agent.createdAt)}
            </span>
          </div>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--color-accent)] transition-colors duration-200 border border-[var(--border-default)] rounded-lg px-3 py-1.5 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">{t('share.copied')}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                {t('share.button')}
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Owner: manage buttons / Non-owner: stats only */}
      {isOwner ? (
        <motion.div className={`${cardClass} p-6`} variants={itemVariants}>
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
              {t('owner.heading', { name: agent.name })}
            </h2>
            <p className="text-sm mb-5 text-[var(--text-muted)]">
              {t('owner.body')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/dashboard/agent/${id}?tab=config`} className="btn-primary inline-flex items-center gap-2 justify-center">
                <Settings className="w-4 h-4" />
                {t('owner.manageAgent')}
              </Link>
              <Link href={`/dashboard/agent/${id}?tab=chat`} className="btn-secondary inline-flex items-center gap-2 justify-center">
                <MessageSquare className="w-4 h-4" />
                {t('owner.openChat')}
              </Link>
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          {publicChatEnabled && (
            <PublicAgentChat
              agentId={id}
              agentName={agent.name}
              autoFocus={publicChatAutoFocus}
              usage={publicChatUsage}
              onUsageChange={setPublicChatUsage}
            />
          )}

          {/* Analytics Section */}
          <motion.div className={`${cardClass} p-6 mb-6`} variants={itemVariants}>
            <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--color-accent)]" />
              {t('analytics.heading')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Interactions processed — big stat */}
              <div className="rounded-xl bg-[var(--bg-elevated)] p-5 text-center col-span-2 sm:col-span-1">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {t('analytics.messages')}
                </div>
                <div className="text-3xl font-bold text-[var(--color-accent)]">
                  {publicStats ? publicStats.messagesProcessed.toLocaleString() : (agent.messageCount ?? 0).toLocaleString()}
                </div>
              </div>

              {/* Days Active */}
              <div className="rounded-xl bg-[var(--bg-elevated)] p-5 text-center">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  {t('analytics.daysActive')}
                </div>
                <div className="text-3xl font-bold text-[var(--text-primary)]">
                  {publicStats?.daysActive ?? Math.max(1, Math.floor((Date.now() - new Date(agent.createdAt).getTime()) / (1000 * 60 * 60 * 24)))}
                </div>
              </div>

              {/* Uptime */}
              <div className="rounded-xl bg-[var(--bg-elevated)] p-5 text-center">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                  <Activity className="w-3 h-3" />
                  {t('analytics.uptime')}
                </div>
                <div className="text-3xl font-bold text-emerald-400">
                  {publicStats ? `${publicStats.uptimePercent}%` : '--'}
                </div>
              </div>

              {/* Status */}
              <div className="rounded-xl bg-[var(--bg-elevated)] p-4 text-center">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">{t('analytics.status')}</div>
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${statusStyle.text}`}>
                  <span className={`w-2 h-2 rounded-full ${statusStyle.dot} ${statusStyle.pulse ? 'animate-pulse' : ''}`} />
                  {t(`status.${statusStyle.key}`)}
                </span>
              </div>

              {/* Framework */}
              <div className="rounded-xl bg-[var(--bg-elevated)] p-4 text-center">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">{t('analytics.framework')}</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{frameworkMeta?.name ?? agent.framework}</div>
              </div>

              {/* Created */}
              <div className="rounded-xl bg-[var(--bg-elevated)] p-4 text-center">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">{t('analytics.created')}</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{timeAgo(agent.createdAt)}</div>
              </div>
            </div>
          </motion.div>

          {!publicChatEnabled && (
            <motion.div className={`${cardClass} p-6`} variants={itemVariants}>
              <div className="text-center">
                <Rocket className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
                  {t('deploy.heading')}
                </h2>
                <p className="text-sm mb-5 text-[var(--text-muted)]">
                  {t('deploy.body', { framework: frameworkMeta?.name ?? agent.framework })}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/chat-to-hatch"
                    className="btn-primary inline-flex items-center gap-2 justify-center"
                  >
                    <Rocket className="w-4 h-4" />
                    {t('deploy.cta')}
                  </Link>
                  <Link href="/dashboard/agents" className="btn-secondary inline-flex items-center gap-2 justify-center">
                    {t('deploy.myAgents')}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
