'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Check,
  Clock3,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Trash2,
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import type { Agent, McpActionGrant, McpActionInboxResponse, McpActionRequest, McpActionStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import styles from './approvals.module.css';

const FILTERS: Array<{ value: 'all' | McpActionStatus; label: string }> = [
  { value: 'all', label: 'All activity' },
  { value: 'pending', label: 'Pending' },
  { value: 'executed', label: 'Executed' },
  { value: 'failed', label: 'Failed' },
  { value: 'rejected', label: 'Rejected' },
];

const EMPTY_INBOX: McpActionInboxResponse = {
  actions: [],
  grants: [],
  summary: { pending: 0, activeGrants: 0 },
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
}

function ActionRow({
  action,
  busy,
  onApprove,
  onReject,
}: {
  action: McpActionRequest;
  busy: string | null;
  onApprove: (action: McpActionRequest, scope: 'once' | 'tool') => void;
  onReject: (action: McpActionRequest) => void;
}) {
  const pending = action.status === 'pending';
  const preview = JSON.stringify(action.argumentsPreview, null, 2);
  return (
    <article className={styles.actionRow} data-status={action.status}>
      <div className={styles.actionIdentity}>
        <div className={styles.statusIcon} aria-hidden>
          {pending ? <Clock3 size={15} /> : action.status === 'executed' ? <Check size={15} /> : <ShieldX size={15} />}
        </div>
        <div className={styles.actionMain}>
          <div className={styles.actionTitleLine}>
            <strong>{action.tool}</strong>
            <span className={styles.status} data-status={action.status}>{action.status.replace('_', ' ')}</span>
          </div>
          <p>{action.agent.name} · {action.connector.name}</p>
          <span className={styles.time}>{formatDate(action.createdAt)}</span>
        </div>
      </div>

      <details className={styles.payload}>
        <summary>Argument preview</summary>
        <pre>{preview}</pre>
        <small>Secret-like fields are redacted. Approval is bound to the exact original payload hash.</small>
      </details>

      {action.failureMessage && <p className={styles.failure}>{action.failureMessage}</p>}

      {pending && (
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => onApprove(action, 'once')}
            disabled={busy !== null}
            className={styles.primaryButton}
          >
            {busy === `${action.id}:once` ? <Loader2 size={14} className={styles.spin} /> : <Check size={14} />}
            Approve once
          </button>
          <button
            type="button"
            onClick={() => onApprove(action, 'tool')}
            disabled={busy !== null}
            className={styles.secondaryButton}
            title="Allow this tool for this agent and connector for 24 hours"
          >
            {busy === `${action.id}:tool` ? <Loader2 size={14} className={styles.spin} /> : <KeyRound size={14} />}
            Trust tool · 24h
          </button>
          <button
            type="button"
            onClick={() => onReject(action)}
            disabled={busy !== null}
            className={styles.rejectButton}
          >
            {busy === `${action.id}:reject` ? <Loader2 size={14} className={styles.spin} /> : <ShieldX size={14} />}
            Reject
          </button>
        </div>
      )}
    </article>
  );
}

function GrantRow({ grant, busy, onRevoke }: {
  grant: McpActionGrant;
  busy: string | null;
  onRevoke: (grant: McpActionGrant) => void;
}) {
  return (
    <div className={styles.grantRow}>
      <KeyRound size={15} aria-hidden />
      <div>
        <strong>{grant.tool}</strong>
        <p>{grant.agent.name} · {grant.connector.name}</p>
      </div>
      <span>Expires {formatDate(grant.expiresAt)}</span>
      <button
        type="button"
        onClick={() => onRevoke(grant)}
        disabled={busy !== null}
        title="Revoke grant"
        aria-label={`Revoke ${grant.tool} grant`}
      >
        {busy === `grant:${grant.id}` ? <Loader2 size={14} className={styles.spin} /> : <Trash2 size={14} />}
      </button>
    </div>
  );
}

export default function ActionApprovalsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [inbox, setInbox] = useState<McpActionInboxResponse>(EMPTY_INBOX);
  const [status, setStatus] = useState<'all' | McpActionStatus>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const agentId = searchParams.get('agent') ?? '';

  const load = useCallback(async (quiet = false) => {
    if (!isAuthenticated) return;
    if (!quiet) {
      setLoading(true);
      setMessage(null);
    }
    const [agentsResult, inboxResult] = await Promise.all([
      api.getMyAgents(),
      api.getMcpActionInbox({
        ...(agentId ? { agentId } : {}),
        ...(status !== 'all' ? { status } : {}),
        limit: 75,
      }),
    ]);
    if (agentsResult.success) setAgents(agentsResult.data);
    if (inboxResult.success) {
      setInbox(inboxResult.data);
    } else {
      setMessage(inboxResult.error ?? 'Could not load action approvals.');
    }
    setLoading(false);
  }, [agentId, isAuthenticated, status]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 10_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const selectedAgentName = useMemo(
    () => agents.find((agent) => agent.id === agentId)?.name ?? 'All agents',
    [agentId, agents],
  );

  const run = async (key: string, operation: () => Promise<{ success: boolean; error?: string }>, success: string) => {
    setBusy(key);
    setMessage(null);
    const result = await operation();
    setBusy(null);
    if (!result.success) {
      setMessage(result.error ?? 'Action failed.');
      return;
    }
    await load(true);
    setMessage(success);
  };

  if (authLoading || loading) {
    return <div className={styles.center}><Loader2 size={20} className={styles.spin} /> Loading approvals</div>;
  }
  if (!isAuthenticated) {
    return (
      <div className={styles.center}>
        <ShieldCheck size={24} />
        <strong>Sign in to review agent actions</strong>
        <Link href="/login" className={styles.primaryButton}>Sign in</Link>
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Owner safety control</span>
            <h1>Action approvals</h1>
            <p>Review effectful MCP calls before execution and manage narrowly scoped trust.</p>
          </div>
          <button type="button" className={styles.refreshButton} onClick={() => void load()} disabled={busy !== null}>
            <RefreshCw size={14} /> Refresh
          </button>
        </header>

        <section className={styles.summary} aria-label="Approval summary">
          <div><span>Pending</span><strong>{inbox.summary.pending}</strong></div>
          <div><span>Active grants</span><strong>{inbox.summary.activeGrants}</strong></div>
          <div><span>Scope</span><strong>{selectedAgentName}</strong></div>
        </section>

        <div className={styles.controls}>
          <label>
            <span>Agent</span>
            <select value={agentId} onChange={(event) => {
              const query = event.target.value ? `?agent=${encodeURIComponent(event.target.value)}` : '';
              router.replace(`/dashboard/approvals${query}`, { scroll: false });
            }}>
              <option value="">All agents</option>
              {agents.map((agent) => <option value={agent.id} key={agent.id}>{agent.name}</option>)}
            </select>
          </label>
          <div className={styles.filters} role="group" aria-label="Activity status">
            {FILTERS.map((filter) => (
              <button
                type="button"
                key={filter.value}
                aria-pressed={status === filter.value}
                onClick={() => setStatus(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {message && <div className={styles.message}>{message}</div>}

        {inbox.grants.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div><h2>Active tool grants</h2><p>Reusable permission is restricted to one agent, connector, and tool.</p></div>
            </div>
            <div className={styles.grants}>
              {inbox.grants.map((grant) => (
                <GrantRow
                  key={grant.id}
                  grant={grant}
                  busy={busy}
                  onRevoke={(item) => void run(
                    `grant:${item.id}`,
                    () => api.revokeMcpActionGrant(item.id),
                    `${item.tool} grant revoked.`,
                  )}
                />
              ))}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div><h2>Request and execution history</h2><p>Newest activity first. Pending requests require an owner decision.</p></div>
            <span>{inbox.actions.length} records</span>
          </div>
          {inbox.actions.length === 0 ? (
            <div className={styles.empty}><ShieldCheck size={22} /><strong>No matching action activity</strong><p>New effectful MCP calls will appear here before they run.</p></div>
          ) : (
            <div className={styles.actionList}>
              {inbox.actions.map((action) => (
                <ActionRow
                  key={action.id}
                  action={action}
                  busy={busy}
                  onApprove={(item, scope) => void run(
                    `${item.id}:${scope}`,
                    () => api.approveMcpAction(item.id, {
                      scope,
                      ...(scope === 'tool' ? { expiresInMinutes: 1_440 } : {}),
                    }),
                    scope === 'tool' ? `${item.tool} trusted for 24 hours.` : `${item.tool} approved once.`,
                  )}
                  onReject={(item) => void run(
                    `${item.id}:reject`,
                    () => api.rejectMcpAction(item.id),
                    `${item.tool} rejected.`,
                  )}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
