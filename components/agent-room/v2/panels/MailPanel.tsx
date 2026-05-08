'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Inbox, RefreshCw } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import type { AgentMailMessage, AgentMailSettings, AgentMailboxInfo } from '@/lib/api';
import { PanelShell } from './PanelShell';

interface Props {
  agentId: string;
  framework: string;
  onClose: () => void;
  onRefreshSummary?: () => void;
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

function statusTone(status: string | null | undefined): string {
  if (status === 'replied' || status === 'sent' || status === 'received' || status === 'mocked') {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
  }
  if (status === 'failed') return 'border-red-400/30 bg-red-400/10 text-red-300';
  if (status === 'skipped') return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
  return 'border-neutral-600 bg-neutral-800 text-neutral-300';
}

function statusLabel(status: string | null | undefined): string {
  return (status || 'unknown').replace(/[_-]+/g, ' ');
}

function previewBody(message: AgentMailMessage): string {
  const body = message.textBody?.trim() || message.htmlBody?.replace(/<[^>]+>/g, ' ').trim() || '';
  return body.replace(/\s+/g, ' ').slice(0, 120);
}

export function MailPanel({ agentId, framework, onClose, onRefreshSummary }: Props) {
  const [mailbox, setMailbox] = useState<AgentMailboxInfo | null>(null);
  const [settings, setSettings] = useState<AgentMailSettings | null>(null);
  const [messages, setMessages] = useState<AgentMailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const recent = useMemo(() => messages.slice(0, 5), [messages]);

  const loadMail = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [mailboxRes, messagesRes] = await Promise.all([
        api.getAgentMailbox(agentId),
        api.getAgentMailMessages(agentId, { limit: 5 }),
      ]);
      if (mailboxRes.success) {
        setMailbox(mailboxRes.data.mailbox);
        setSettings(mailboxRes.data.settings);
      } else {
        setError(mailboxRes.error ?? 'Could not load mailbox');
      }
      if (messagesRes.success) {
        setMessages(messagesRes.data.messages);
      } else {
        setError(messagesRes.error ?? 'Could not load mail');
      }
      onRefreshSummary?.();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [agentId, onRefreshSummary]);

  useEffect(() => {
    void loadMail('initial');
  }, [loadMail]);

  const copyAddress = () => {
    if (!mailbox?.address) return;
    navigator.clipboard
      .writeText(mailbox.address)
      .then(() => setCopyMsg('Copied'))
      .catch(() => setCopyMsg('Copy failed'))
      .finally(() => window.setTimeout(() => setCopyMsg(null), 1600));
  };

  return (
    <PanelShell title="Mail" framework={framework} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg border border-neutral-700 bg-neutral-950/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Agent address
              </p>
              {loading ? (
                <div className="mt-2 h-8 w-56 animate-pulse rounded bg-neutral-800" />
              ) : (
                <code className="mt-2 block truncate rounded-md border border-neutral-700 bg-black/40 px-2 py-1.5 text-xs text-neutral-100">
                  {mailbox?.address ?? '-'}
                </code>
              )}
            </div>
            <button
              type="button"
              onClick={copyAddress}
              disabled={!mailbox?.address}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-700 text-neutral-300 transition hover:border-emerald-400 hover:text-emerald-300 disabled:opacity-40"
              aria-label="Copy mail address"
              title="Copy mail address"
            >
              <Copy size={14} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <span
              className={`rounded-full border px-2 py-0.5 ${settings?.autoSendEnabled ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-neutral-700 bg-neutral-900 text-neutral-400'}`}
            >
              auto-send {settings?.autoSendEnabled ? 'on' : 'off'}
            </span>
            <span>auto-reply only runs while the agent is active</span>
          </div>
          {copyMsg && <p className="mt-2 text-xs text-emerald-300">{copyMsg}</p>}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Inbox size={15} className="text-emerald-300" />
            Recent mail
          </div>
          <button
            type="button"
            onClick={() => void loadMail('refresh')}
            disabled={refreshing}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-700 text-neutral-300 transition hover:border-emerald-400 hover:text-emerald-300 disabled:opacity-50"
            aria-label="Refresh mail"
            title="Refresh mail"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-lg bg-neutral-800" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-700 p-6 text-center text-sm text-neutral-400">
            No mail yet.
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((message) => (
              <div key={message.id} className="rounded-lg border border-neutral-800 bg-neutral-950/45 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-[0.1em] text-neutral-500">
                    {message.direction === 'outbound' ? 'outbound' : 'inbound'}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${statusTone(message.status)}`}>
                    {statusLabel(message.status)}
                  </span>
                  <span className="ml-auto text-[11px] text-neutral-500">
                    {formatDate(messageDate(message))}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-medium text-neutral-100">
                  {message.subject || '(no subject)'}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-neutral-400">
                  {previewBody(message) || 'No body preview'}
                </p>
              </div>
            ))}
          </div>
        )}

        <Link
          href={`/dashboard/agent/${agentId}?tab=mail`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
        >
          Open mailbox
          <ExternalLink size={14} />
        </Link>
      </div>
    </PanelShell>
  );
}
