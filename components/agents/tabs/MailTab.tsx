'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Send,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  AgentMailDirection,
  AgentMailMessage,
  AgentMailSettings,
  AgentMailboxInfo,
} from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../AgentContext';

type MailFilter = 'all' | AgentMailDirection;

interface ComposerState {
  to: string;
  subject: string;
  body: string;
}

const EMPTY_COMPOSER: ComposerState = {
  to: '',
  subject: '',
  body: '',
};

function normalizeAddresses(value: AgentMailMessage['toAddresses']): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string') return [value];
  return [];
}

function messageDate(message: AgentMailMessage): string | null {
  return message.receivedAt ?? message.sentAt ?? message.createdAt ?? null;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function plainStatus(value: string | null | undefined): string {
  if (!value) return 'unknown';
  return value.replace(/[_-]+/g, ' ');
}

function previewBody(message: AgentMailMessage): string {
  const text = message.textBody?.trim() || message.htmlBody?.replace(/<[^>]+>/g, ' ').trim() || '';
  return text.replace(/\s+/g, ' ').slice(0, 180);
}

function statusTone(status: string | null | undefined): string {
  const key = status ?? 'unknown';
  if (['sent', 'delivered', 'received'].includes(key)) {
    return 'border-[rgba(74,222,128,0.35)] bg-[rgba(74,222,128,0.08)] text-[var(--accent)]';
  }
  if (['failed', 'bounced', 'rejected'].includes(key)) {
    return 'border-[rgba(255,107,107,0.35)] bg-[rgba(255,107,107,0.08)] text-[#ff8a8a]';
  }
  return 'border-[rgba(251,191,36,0.28)] bg-[rgba(251,191,36,0.08)] text-[#fbbf24]';
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const t = useTranslations('dashboard.agentDetail.mail.statusLabels');
  const key =
    status && ['queued', 'sent', 'delivered', 'failed', 'received'].includes(status)
      ? status
      : 'unknown';
  return (
    <span
      className={`inline-flex items-center rounded-[3px] border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${statusTone(status)}`}
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {key === 'unknown' ? plainStatus(status) : t(key)}
    </span>
  );
}

function DirectionBadge({ direction }: { direction: string | undefined }) {
  const t = useTranslations('dashboard.agentDetail.mail.directions');
  const outbound = direction === 'outbound';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${outbound ? 'border-sky-400/25 bg-sky-400/10 text-sky-300' : 'border-violet-400/25 bg-violet-400/10 text-violet-300'}`}
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {outbound ? <ArrowUpRight size={11} /> : <ArrowDownLeft size={11} />}
      {outbound ? t('outbound') : t('inbound')}
    </span>
  );
}

export function MailTab() {
  const { agent, isActive } = useAgentContext();
  const t = useTranslations('dashboard.agentDetail.mail');
  const [mailbox, setMailbox] = useState<AgentMailboxInfo | null>(null);
  const [settings, setSettings] = useState<AgentMailSettings | null>(null);
  const [messages, setMessages] = useState<AgentMailMessage[]>([]);
  const [filter, setFilter] = useState<MailFilter>('all');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [loadingMailbox, setLoadingMailbox] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [composer, setComposer] = useState<ComposerState>(EMPTY_COMPOSER);
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedMessageId) ?? null,
    [messages, selectedMessageId],
  );

  useEffect(() => {
    setSelectedMessageId((current) => {
      if (current && messages.some((message) => message.id === current)) return current;
      return messages[0]?.id ?? null;
    });
  }, [messages]);

  const loadMailbox = useCallback(async () => {
    setLoadingMailbox(true);
    setError(null);
    const res = await api.getAgentMailbox(agent.id);
    if (res.success) {
      setMailbox(res.data.mailbox);
      setSettings(res.data.settings);
    } else {
      setError(res.error ?? t('errors.mailbox'));
    }
    setLoadingMailbox(false);
  }, [agent.id, t]);

  const loadMessages = useCallback(async () => {
    setLoadingMessages(true);
    setError(null);
    const res = await api.getAgentMailMessages(agent.id, {
      limit: 50,
      direction: filter === 'all' ? undefined : filter,
    });
    if (res.success) {
      setMessages(res.data.messages);
    } else {
      setError(res.error ?? t('errors.messages'));
    }
    setLoadingMessages(false);
  }, [agent.id, filter, t]);

  useEffect(() => {
    void loadMailbox();
  }, [loadMailbox]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([loadMailbox(), loadMessages()]);
    setRefreshing(false);
  };

  const copyAddress = () => {
    if (!mailbox?.address) return;
    navigator.clipboard
      .writeText(mailbox.address)
      .then(() => setCopyMsg(t('copied')))
      .catch(() => setCopyMsg(t('copyFailed')))
      .finally(() => window.setTimeout(() => setCopyMsg(null), 1800));
  };

  const toggleAutoSend = async () => {
    const next = !(settings?.autoSendEnabled ?? false);
    setUpdatingSettings(true);
    setError(null);
    const res = await api.updateAgentMailSettings(agent.id, {
      autoSendEnabled: next,
    });
    if (res.success) {
      setSettings(res.data.settings);
    } else {
      setError(res.error ?? t('errors.settings'));
    }
    setUpdatingSettings(false);
  };

  const sendMail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const to = composer.to.trim();
    const subject = composer.subject.trim();
    const body = composer.body.trim();
    if (!to || !subject || !body) {
      setSendError(t('composer.validation'));
      return;
    }

    setSendState('sending');
    setSendError(null);
    const res = await api.sendAgentMail(agent.id, {
      to,
      subject,
      text: body,
    });
    if (res.success) {
      setComposer(EMPTY_COMPOSER);
      setSendState('sent');
      await loadMessages();
      window.setTimeout(() => setSendState('idle'), 2200);
    } else {
      setSendError(res.error ?? t('composer.failed'));
      setSendState('idle');
    }
  };

  const autoSendEnabled = settings?.autoSendEnabled ?? false;
  const filters: Array<{ id: MailFilter; label: string }> = [
    { id: 'all', label: t('filters.all') },
    { id: 'inbound', label: t('filters.inbound') },
    { id: 'outbound', label: t('filters.outbound') },
  ];

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-[var(--accent)]" />
            <h1
              className="text-lg font-bold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {t('title')}
            </h1>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{t('subtitle')}</p>
        </div>
        <button
          onClick={refreshAll}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-[3px] border border-[var(--border-default)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] transition-all hover:border-[var(--accent)] hover:bg-[rgba(74,222,128,0.06)] hover:text-[var(--accent)] disabled:opacity-50"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? t('refreshing') : t('refresh')}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-[3px] border border-[rgba(255,107,107,0.25)] bg-[rgba(255,107,107,0.07)] px-3 py-2 text-sm text-[#ff8a8a]">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <GlassCard>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <p
                  className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {t('mailbox')}
                </p>
                {loadingMailbox ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                    <code className="min-w-0 flex-1 truncate rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)]">
                      {mailbox?.address ?? '-'}
                    </code>
                    <button
                      onClick={copyAddress}
                      disabled={!mailbox?.address}
                      className="inline-flex items-center justify-center gap-2 rounded-[3px] border border-[var(--border-default)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      <Copy size={13} />
                      {t('copy')}
                    </button>
                    {mailbox?.status && <StatusBadge status={mailbox.status} />}
                  </div>
                )}
                {copyMsg && <p className="mt-2 text-xs text-[var(--accent)]">{copyMsg}</p>}
              </div>

              <div className="rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {t('autoSend')}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {autoSendEnabled ? t('autoSendOn') : t('autoSendOff')}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoSendEnabled}
                    onClick={toggleAutoSend}
                    disabled={loadingMailbox || updatingSettings}
                    className={`relative h-6 w-11 rounded-full border transition-colors disabled:opacity-50 ${autoSendEnabled ? 'border-[rgba(74,222,128,0.45)] bg-[rgba(74,222,128,0.22)]' : 'border-[var(--border-default)] bg-[var(--bg-elevated)]'}`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-current transition-transform ${autoSendEnabled ? 'translate-x-5 text-[var(--accent)]' : 'translate-x-0 text-[var(--text-muted)]'}`}
                    />
                  </button>
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-xs text-[var(--text-muted)]">
                  <AlertTriangle
                    size={13}
                    className={isActive ? 'text-[var(--accent)]' : 'text-[#fbbf24]'}
                  />
                  {isActive ? t('runtimeActive') : t('runtimeInactive')}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-0 overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-[var(--border-default)] p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {t('messageList')}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {t('messageCount', { count: messages.length })}
                </p>
              </div>
              <div className="flex rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)] p-0.5">
                {filters.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFilter(item.id)}
                    className={`rounded-[2px] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] transition-colors ${filter === item.id ? 'bg-[rgba(74,222,128,0.1)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingMessages ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((item) => (
                  <Skeleton key={item} className="h-20 w-full" />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                <Inbox size={28} className="mb-3 text-[var(--text-muted)]" />
                <p
                  className="text-sm font-bold text-[var(--text-primary)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {t('emptyTitle')}
                </p>
                <p className="mt-1 max-w-md text-sm text-[var(--text-muted)]">
                  {t('emptySubtitle')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-default)]">
                {messages.map((message) => {
                  const selected = selectedMessageId === message.id;
                  const addresses = normalizeAddresses(message.toAddresses);
                  return (
                    <button
                      key={message.id}
                      onClick={() => setSelectedMessageId(message.id)}
                      className={`block w-full px-4 py-3 text-left transition-colors ${selected ? 'bg-[rgba(74,222,128,0.06)]' : 'hover:bg-[var(--bg-elevated)]'}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <DirectionBadge direction={message.direction} />
                        <StatusBadge status={message.status} />
                        <span className="ml-auto text-xs text-[var(--text-muted)]">
                          {formatDate(messageDate(message))}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold text-[var(--text-primary)]">
                        {message.subject || t('untitled')}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                        {message.direction === 'outbound'
                          ? `${t('to')}: ${addresses.join(', ') || '-'}`
                          : `${t('from')}: ${message.fromAddress || '-'}`}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">
                        {previewBody(message) || t('noBody')}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard>
            <p
              className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {t('details')}
            </p>
            {!selectedMessage ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center text-sm text-[var(--text-muted)]">
                <Inbox size={24} className="mb-2" />
                {t('noSelection')}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <DirectionBadge direction={selectedMessage.direction} />
                  <StatusBadge status={selectedMessage.status} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">{t('subject')}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-[var(--text-primary)]">
                    {selectedMessage.subject || t('untitled')}
                  </p>
                </div>
                <dl className="space-y-2 text-xs">
                  <div>
                    <dt className="text-[var(--text-muted)]">{t('from')}</dt>
                    <dd className="mt-0.5 break-all text-[var(--text-secondary)]">
                      {selectedMessage.fromAddress || '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">{t('to')}</dt>
                    <dd className="mt-0.5 break-all text-[var(--text-secondary)]">
                      {normalizeAddresses(selectedMessage.toAddresses).join(', ') || '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">{t('created')}</dt>
                    <dd className="mt-0.5 text-[var(--text-secondary)]">
                      {formatDate(messageDate(selectedMessage))}
                    </dd>
                  </div>
                </dl>
                {selectedMessage.errorMessage && (
                  <div className="rounded-[3px] border border-[rgba(255,107,107,0.25)] bg-[rgba(255,107,107,0.07)] p-2 text-xs text-[#ff8a8a]">
                    {selectedMessage.errorMessage}
                  </div>
                )}
                <div>
                  <p className="mb-2 text-xs text-[var(--text-muted)]">{t('body')}</p>
                  <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {selectedMessage.textBody?.trim() ||
                      selectedMessage.htmlBody?.trim() ||
                      t('noBody')}
                  </pre>
                </div>
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <div className="mb-4 flex items-start gap-2">
              <Send size={16} className="mt-0.5 text-[var(--accent)]" />
              <div>
                <p
                  className="text-sm font-bold text-[var(--text-primary)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {t('composer.title')}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{t('composer.subtitle')}</p>
              </div>
            </div>
            <form onSubmit={sendMail} className="space-y-3">
              <input
                value={composer.to}
                onChange={(event) =>
                  setComposer((current) => ({
                    ...current,
                    to: event.target.value,
                  }))
                }
                placeholder={t('composer.toPlaceholder')}
                className="w-full rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
              />
              <input
                value={composer.subject}
                onChange={(event) =>
                  setComposer((current) => ({
                    ...current,
                    subject: event.target.value,
                  }))
                }
                placeholder={t('composer.subjectPlaceholder')}
                className="w-full rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
              />
              <textarea
                value={composer.body}
                onChange={(event) =>
                  setComposer((current) => ({
                    ...current,
                    body: event.target.value,
                  }))
                }
                placeholder={t('composer.bodyPlaceholder')}
                rows={7}
                className="w-full resize-none rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
              />
              {sendError && <p className="text-xs text-[#ff8a8a]">{sendError}</p>}
              {sendState === 'sent' && (
                <p className="flex items-center gap-1.5 text-xs text-[var(--accent)]">
                  <CheckCircle2 size={13} />
                  {t('composer.sent')}
                </p>
              )}
              <button
                type="submit"
                disabled={sendState === 'sending'}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[3px] border border-[rgba(74,222,128,0.4)] bg-[rgba(74,222,128,0.08)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--accent)] transition-colors hover:bg-[rgba(74,222,128,0.12)] disabled:opacity-50"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {sendState === 'sending' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                {sendState === 'sending' ? t('composer.sending') : t('composer.send')}
              </button>
            </form>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}
