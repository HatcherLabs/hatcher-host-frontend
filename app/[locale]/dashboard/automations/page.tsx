'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  Check,
  ChevronRight,
  Clock3,
  ExternalLink,
  FilterX,
  Github,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Webhook,
  X,
  Zap,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  automationMatches,
  normalizeFrameworkSchedules,
  normalizeIronClawAutomations,
  webhookAutomation,
  type AutomationItem,
  type AutomationKind,
  type AutomationStatus,
} from '@/lib/automation-center';
import styles from './automations.module.css';

type StatusFilter = 'all' | AutomationStatus;
type KindFilter = 'all' | AutomationKind;
type LoadResult = { items: AutomationItem[]; error: string | null };

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'attention', label: 'Needs attention' },
];

const KIND_OPTIONS: Array<{ value: KindFilter; label: string }> = [
  { value: 'all', label: 'All triggers' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'ironclaw', label: 'IronClaw native' },
];

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function triggerIcon(kind: AutomationKind) {
  if (kind === 'webhook') return Webhook;
  if (kind === 'ironclaw') return Zap;
  return CalendarClock;
}

async function loadAgentAutomations(agent: Agent): Promise<LoadResult> {
  if (agent.status !== 'active') return { items: [], error: null };
  if (agent.framework === 'ironclaw') {
    const result = await api.getIronClawAutomations(agent.id);
    return result.success
      ? { items: normalizeIronClawAutomations(agent, result.data), error: null }
      : { items: [], error: `${agent.name}: ${result.error ?? 'Could not load automations'}` };
  }
  if (agent.framework !== 'openclaw' && agent.framework !== 'hermes') {
    return { items: [], error: null };
  }

  const [schedulesResult, webhookResult] = await Promise.all([
    api.getAgentSchedules(agent.id),
    api.getWebhookUrl(agent.id),
  ]);
  const items = schedulesResult.success
    ? normalizeFrameworkSchedules(agent, schedulesResult.data)
    : [];
  if (webhookResult.success) {
    const webhook = webhookAutomation(agent, webhookResult.data);
    if (webhook) items.push(webhook);
  }
  return {
    items,
    error: schedulesResult.success
      ? null
      : `${agent.name}: ${schedulesResult.error ?? 'Could not load schedules'}`,
  };
}

function StatusPill({ status }: { status: AutomationStatus }) {
  const label = status === 'attention' ? 'Needs attention' : status;
  return <span className={styles.statusPill} data-status={status}>{label}</span>;
}

function SummaryRail({ items }: { items: AutomationItem[] }) {
  const counts = useMemo(() => ({
    total: items.length,
    active: items.filter((item) => item.status === 'active').length,
    paused: items.filter((item) => item.status === 'paused').length,
    attention: items.filter((item) => item.status === 'attention').length,
  }), [items]);

  const entries = [
    { label: 'Total', value: counts.total, icon: CalendarClock, tone: 'neutral' },
    { label: 'Active', value: counts.active, icon: Play, tone: 'active' },
    { label: 'Paused', value: counts.paused, icon: Pause, tone: 'paused' },
    { label: 'Needs attention', value: counts.attention, icon: AlertTriangle, tone: 'attention' },
  ] as const;

  return (
    <section className={styles.summary} aria-label="Automation summary">
      {entries.map(({ label, value, icon: Icon, tone }) => (
        <div key={label} className={styles.summaryItem} data-tone={tone}>
          <Icon size={18} aria-hidden />
          <span><small>{label}</small><strong>{value}</strong></span>
        </div>
      ))}
    </section>
  );
}

function TriggerSources({ webhookAgentId }: { webhookAgentId: string | null }) {
  const sources = [
    { label: 'Schedule', icon: CalendarClock, live: true },
    { label: 'Webhook', icon: Webhook, live: true },
    { label: 'On-chain', icon: Zap, live: false },
    { label: 'GitHub', icon: Github, live: false },
    { label: 'Price move', icon: RefreshCw, live: false },
  ] as const;
  return (
    <aside className={styles.sources}>
      <h2>Trigger sources</h2>
      <div className={styles.sourceList}>
        {sources.map(({ label, icon: Icon, live }) => (
          <div key={label} className={styles.sourceRow}>
            <Icon size={16} aria-hidden />
            <span>{label}</span>
            <small data-live={live}>{live ? 'Live' : 'Coming next'}</small>
          </div>
        ))}
      </div>
      {webhookAgentId ? (
        <Link href={`/dashboard/agent/${webhookAgentId}?tab=integrations`} className={styles.sourceLink}>
          Configure webhooks <ExternalLink size={13} aria-hidden />
        </Link>
      ) : (
        <p className={styles.sourceHint}>Start an OpenClaw or Hermes agent to configure a webhook.</p>
      )}
    </aside>
  );
}

function CreateAutomationDrawer({
  agents,
  open,
  onClose,
  onCreated,
}: {
  agents: Agent[];
  open: boolean;
  onClose: () => void;
  onCreated: (message: string) => Promise<void>;
}) {
  const [agentId, setAgentId] = useState('');
  const [trigger, setTrigger] = useState<'schedule' | 'webhook'>('schedule');
  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState('0 9 * * *');
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = agents.find((agent) => agent.id === agentId) ?? null;

  useEffect(() => {
    if (open && !agentId && agents[0]) setAgentId(agents[0].id);
  }, [agentId, agents, open]);

  const create = async () => {
    if (!selected || !name.trim() || !schedule.trim() || !instructions.trim()) {
      setError('Agent, name, schedule, and instructions are required.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = selected.framework === 'ironclaw'
      ? await api.createIronClawAutomation(
          selected.id,
          `Create an automation named "${name.trim()}" that runs on "${schedule.trim()}". Instructions: ${instructions.trim()}`,
        )
      : await api.createAgentSchedule(selected.id, {
          name: name.trim(),
          schedule: schedule.trim(),
          prompt: instructions.trim(),
        });
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? 'Could not create automation.');
      return;
    }
    setName('');
    setInstructions('');
    await onCreated(`Automation created for ${selected.name}.`);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <button type="button" className={styles.drawerBackdrop} aria-label="Close automation drawer" onClick={onClose} />
      <aside className={styles.drawer} aria-label="Create automation">
        <div className={styles.drawerHeader}>
          <div><h2>Create automation</h2><p>Choose an agent and a real trigger source.</p></div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <label className={styles.field}>
          <span>Agent</span>
          <select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
            <option value="">Select an agent</option>
            {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} · {agent.framework}</option>)}
          </select>
        </label>

        <fieldset className={styles.triggerChoice}>
          <legend>Trigger type</legend>
          <button type="button" data-active={trigger === 'schedule'} onClick={() => setTrigger('schedule')}>
            <CalendarClock size={17} /><span><strong>Schedule</strong><small>Run recurring instructions</small></span>
          </button>
          <button type="button" data-active={trigger === 'webhook'} onClick={() => setTrigger('webhook')}>
            <Webhook size={17} /><span><strong>Webhook</strong><small>Run when an external event arrives</small></span>
          </button>
        </fieldset>

        {trigger === 'webhook' ? (
          <div className={styles.webhookSetup}>
            <Webhook size={20} />
            <div>
              <strong>Webhook triggers are configured per agent</strong>
              <p>Hatcher provisions a protected endpoint and bearer token inside the agent Integration settings.</p>
              {selected && selected.framework !== 'ironclaw' ? (
                <Link href={`/dashboard/agent/${selected.id}?tab=integrations`} onClick={onClose}>
                  Open webhook settings <ChevronRight size={13} />
                </Link>
              ) : <small>Select an active OpenClaw or Hermes agent.</small>}
            </div>
          </div>
        ) : (
          <>
            <label className={styles.field}>
              <span>Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Morning research brief" maxLength={100} />
            </label>
            <label className={styles.field}>
              <span>Schedule</span>
              <input value={schedule} onChange={(event) => setSchedule(event.target.value)} placeholder="0 9 * * *" maxLength={120} />
              <small>Cron syntax or supported natural language, interpreted by the selected runtime.</small>
            </label>
            <label className={styles.field}>
              <span>Instructions</span>
              <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Describe what the agent should do..." maxLength={5000} rows={6} />
            </label>
            {error && <p className={styles.formError}><AlertTriangle size={14} />{error}</p>}
            <button type="button" className={styles.createButton} disabled={busy || agents.length === 0} onClick={() => void create()}>
              {busy ? <Loader2 size={16} className={styles.spin} /> : <Plus size={16} />}
              Create automation
            </button>
          </>
        )}
      </aside>
    </>
  );
}

export default function AutomationCenterPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [items, setItems] = useState<AutomationItem[]>([]);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [agentFilter, setAgentFilter] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    if (quiet) setRefreshing(true); else setLoading(true);
    const agentsResult = await api.getMyAgents();
    if (!agentsResult.success) {
      setMessage(agentsResult.error ?? 'Could not load agents.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const nextAgents = agentsResult.data.filter((agent) => !agent.archivedAt);
    setAgents(nextAgents);
    const results = await Promise.all(nextAgents.map(loadAgentAutomations));
    setItems(results.flatMap((result) => result.items));
    setLoadErrors(results.flatMap((result) => result.error ? [result.error] : []));
    setLoading(false);
    setRefreshing(false);
  }, [isAuthenticated]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => items.filter((item) =>
    automationMatches(item, query, statusFilter, kindFilter, agentFilter)),
  [agentFilter, items, kindFilter, query, statusFilter]);

  const eligibleAgents = useMemo(() => agents.filter((agent) =>
    agent.status === 'active' && ['openclaw', 'hermes', 'ironclaw'].includes(agent.framework)), [agents]);
  const webhookAgentId = eligibleAgents.find((agent) => agent.framework !== 'ironclaw')?.id ?? null;
  const filtersActive = Boolean(query || statusFilter !== 'all' || kindFilter !== 'all' || agentFilter);

  const clearFilters = () => {
    setQuery('');
    setStatusFilter('all');
    setKindFilter('all');
    setAgentFilter('');
  };

  const mutate = async (item: AutomationItem, action: 'pause' | 'resume' | 'run' | 'delete') => {
    if (item.kind === 'webhook') return;
    if (action === 'delete' && !window.confirm(`Delete "${item.name}"?`)) return;
    setBusy(`${item.agentId}:${item.id}:${action}`);
    setMessage(null);
    let result: { success: boolean; error?: string };
    if (item.kind === 'ironclaw') {
      result = action === 'pause'
        ? await api.pauseIronClawAutomation(item.agentId, item.id)
        : action === 'resume'
          ? await api.resumeIronClawAutomation(item.agentId, item.id)
          : action === 'delete'
            ? await api.deleteIronClawAutomation(item.agentId, item.id)
            : { success: false, error: 'Run now is managed inside the IronClaw agent.' };
    } else {
      result = action === 'pause'
        ? await api.pauseAgentSchedule(item.agentId, item.id)
        : action === 'resume'
          ? await api.resumeAgentSchedule(item.agentId, item.id)
          : action === 'delete'
            ? await api.deleteAgentSchedule(item.agentId, item.id)
            : await api.runAgentSchedule(item.agentId, item.id);
    }
    setBusy(null);
    if (!result.success) {
      setMessage(result.error ?? 'Automation action failed.');
      return;
    }
    await load(true);
    setMessage(action === 'run' ? `“${item.name}” queued.` : `“${item.name}” updated.`);
  };

  if (authLoading || loading) {
    return <div className={styles.center}><Loader2 size={20} className={styles.spin} /> Loading Automation Center</div>;
  }
  if (!isAuthenticated) {
    return <div className={styles.center}><CalendarClock size={25} /><strong>Sign in to manage automations</strong><Link href="/login" className={styles.createButton}>Sign in</Link></div>;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><h1>Automation Center</h1><p>Run recurring work and trigger agents from external events.</p></div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.refreshButton} onClick={() => void load(true)} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? styles.spin : ''} /> Refresh
          </button>
          <button type="button" className={styles.createButton} onClick={() => setDrawerOpen(true)}>
            <Plus size={16} /> New automation
          </button>
        </div>
      </header>

      <SummaryRail items={items} />
      {message && <div className={styles.notice}><Check size={14} />{message}</div>}
      {loadErrors.length > 0 && (
        <div className={styles.warning}><AlertTriangle size={15} /><span>{loadErrors.length} agent source{loadErrors.length === 1 ? '' : 's'} could not be loaded. Start or restart those agents, then refresh.</span></div>
      )}

      <div className={styles.workspace}>
        <section className={styles.automationPanel}>
          <div className={styles.filters}>
            <label className={styles.search}><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search automations..." /></label>
            <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select aria-label="Filter by trigger" value={kindFilter} onChange={(event) => setKindFilter(event.target.value as KindFilter)}>
              {KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select aria-label="Filter by agent" value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}>
              <option value="">All agents</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
            {filtersActive && <button type="button" className={styles.clearButton} onClick={clearFilters}><FilterX size={14} /> Clear</button>}
          </div>

          {filteredItems.length === 0 ? (
            <div className={styles.empty}>
              <CalendarClock size={28} />
              <h2>{items.length === 0 ? 'No automations yet' : 'No automations match these filters'}</h2>
              <p>{items.length === 0 ? 'Create a schedule or configure an authenticated webhook for an active agent.' : 'Clear one or more filters to see the rest of your automations.'}</p>
              {items.length === 0 && <button type="button" className={styles.createButton} onClick={() => setDrawerOpen(true)}><Plus size={15} /> New automation</button>}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Automation</th><th>Agent</th><th>Trigger</th><th>Next run</th><th>Last result</th><th>Status</th><th><span className={styles.srOnly}>Actions</span></th></tr></thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const Icon = triggerIcon(item.kind);
                    const key = `${item.agentId}:${item.id}`;
                    const rowBusy = busy?.startsWith(`${key}:`) ?? false;
                    return (
                      <tr key={key}>
                        <td data-label="Automation"><div className={styles.identity}><span className={styles.kindIcon}><Icon size={15} /></span><span><strong>{item.name}</strong><small>{item.instructions || (item.kind === 'webhook' ? 'Authenticated inbound events' : item.framework)}</small></span></div></td>
                        <td data-label="Agent"><Link href={`/dashboard/agent/${item.agentId}`} className={styles.agentLink}><Bot size={13} />{item.agentName}</Link></td>
                        <td data-label="Trigger"><span className={styles.trigger}><Icon size={13} /><span>{item.kind === 'ironclaw' ? 'IronClaw' : item.kind === 'webhook' ? 'Webhook' : 'Schedule'}<small>{item.triggerLabel}</small></span></span></td>
                        <td data-label="Next run">{formatDate(item.nextRun)}</td>
                        <td data-label="Last result"><span className={styles.lastResult}>{item.lastResult ?? (item.lastRun ? `Ran ${formatDate(item.lastRun)}` : 'Not run yet')}</span></td>
                        <td data-label="Status"><StatusPill status={item.status} /></td>
                        <td data-label="Actions">
                          <div className={styles.rowActions}>
                            {item.kind === 'webhook' ? (
                              <Link href={`/dashboard/agent/${item.agentId}?tab=integrations`} className={styles.iconButton} aria-label={`Configure ${item.agentName} webhook`}><ExternalLink size={14} /></Link>
                            ) : (
                              <>
                                {item.kind === 'schedule' && <button type="button" className={styles.iconButton} disabled={rowBusy} onClick={() => void mutate(item, 'run')} aria-label={`Run ${item.name} now`}>{rowBusy ? <Loader2 size={14} className={styles.spin} /> : <Play size={14} />}</button>}
                                <button type="button" className={styles.iconButton} disabled={rowBusy} onClick={() => void mutate(item, item.status === 'paused' ? 'resume' : 'pause')} aria-label={`${item.status === 'paused' ? 'Resume' : 'Pause'} ${item.name}`}>{item.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}</button>
                                <details className={styles.moreMenu}><summary className={styles.iconButton} aria-label={`More actions for ${item.name}`}><MoreHorizontal size={14} /></summary><div><Link href={`/dashboard/agent/${item.agentId}?tab=schedules`}>Open agent</Link><button type="button" onClick={() => void mutate(item, 'delete')}><Trash2 size={13} /> Delete</button></div></details>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <TriggerSources webhookAgentId={webhookAgentId} />
      </div>

      <CreateAutomationDrawer agents={eligibleAgents} open={drawerOpen} onClose={() => setDrawerOpen(false)} onCreated={async (nextMessage) => { await load(true); setMessage(nextMessage); }} />
    </main>
  );
}
