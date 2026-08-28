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
  ShieldCheck,
  Trash2,
  Webhook,
  X,
  Zap,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import type { Agent, AgentRoutine } from '@/lib/api';
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
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekdays' | 'weekly' | 'six_hours'>('daily');
  const [time, setTime] = useState('09:00');
  const [weekday, setWeekday] = useState('1');
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [budget, setBudget] = useState('');
  const [runtime, setRuntime] = useState('900');
  const [staleAfter, setStaleAfter] = useState('60');
  const [acceptance, setAcceptance] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = agents.find((agent) => agent.id === agentId) ?? null;

  useEffect(() => {
    if (open && !agentId && agents[0]) setAgentId(agents[0].id);
  }, [agentId, agents, open]);

  const schedule = useMemo(() => {
    const [hour = '9', minute = '0'] = time.split(':');
    if (frequency === 'six_hours') return '0 */6 * * *';
    if (frequency === 'weekdays') return `${Number(minute)} ${Number(hour)} * * 1-5`;
    if (frequency === 'weekly') return `${Number(minute)} ${Number(hour)} * * ${weekday}`;
    return `${Number(minute)} ${Number(hour)} * * *`;
  }, [frequency, time, weekday]);

  const scheduleLabel = frequency === 'six_hours'
    ? 'Every 6 hours'
    : frequency === 'weekdays'
      ? `Weekdays at ${time}`
      : frequency === 'weekly'
        ? `Weekly at ${time}`
        : `Every day at ${time}`;

  const close = () => {
    setStep(1);
    setError(null);
    onClose();
  };

  const continueToNext = () => {
    setError(null);
    if (step === 1 && (!selected || !name.trim() || !instructions.trim())) {
      setError('Choose an agent, name the routine, and describe the result you want.');
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  };

  const create = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const result = await api.createRoutine(selected.id, {
      name: name.trim(),
      prompt: instructions.trim(),
      schedule,
      timezone,
      requiresApproval,
      ...(budget ? { budgetAiCredits: Number(budget) } : {}),
      maxRuntimeSeconds: Number(runtime),
      staleAfterMinutes: staleAfter ? Number(staleAfter) : null,
      noDataPolicy: 'pause',
      acceptanceChecks: acceptance.split('\n').map((line) => line.trim()).filter(Boolean),
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? 'Could not create routine.');
      return;
    }
    setName('');
    setInstructions('');
    setAcceptance('');
    setStep(1);
    await onCreated(`“${result.data.routine.name}” is scheduled for ${selected.name}.`);
    close();
  };

  if (!open) return null;

  return (
    <>
      <button type="button" className={styles.drawerBackdrop} aria-label="Close routine drawer" onClick={close} />
      <aside className={styles.drawer} aria-label="Create managed routine">
        <div className={styles.drawerHeader}>
          <div><h2>New managed routine</h2><p>Three simple steps. You can test it before the first scheduled run.</p></div>
          <button type="button" className={styles.iconButton} onClick={close} aria-label="Close"><X size={18} /></button>
        </div>
        <div className={styles.stepper} aria-label={`Step ${step} of 3`}>
          {[['1', 'Work'], ['2', 'Schedule'], ['3', 'Safety']].map(([number, label]) => (
            <span key={number} data-active={step >= Number(number)}><b>{number}</b>{label}</span>
          ))}
        </div>

        {step === 1 && <>
            <label className={styles.field}>
              <span>Which agent should do the work?</span>
              <select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
                <option value="">Select an agent</option>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} · {agent.framework}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              <span>Routine name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Morning research brief" maxLength={100} />
            </label>
            <label className={styles.field}>
              <span>What result do you want?</span>
              <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Review new support tickets, prepare draft replies, and flag anything that needs my decision." maxLength={100000} rows={7} />
              <small>Describe the outcome in plain language. Hatcher keeps every run and artifact in Mission Control.</small>
            </label>
        </>}

        {step === 2 && <>
          <fieldset className={styles.triggerChoice}>
            <legend>How often?</legend>
            {([
              ['daily', 'Every day'],
              ['weekdays', 'Weekdays'],
              ['weekly', 'Once a week'],
              ['six_hours', 'Every 6 hours'],
            ] as const).map(([value, label]) => (
              <button type="button" key={value} data-active={frequency === value} onClick={() => setFrequency(value)}>
                <CalendarClock size={17} /><span><strong>{label}</strong><small>{value === 'six_hours' ? 'Four predictable runs per day' : 'At a time you choose'}</small></span>
              </button>
            ))}
          </fieldset>
          {frequency !== 'six_hours' && <label className={styles.field}><span>Time</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>}
          {frequency === 'weekly' && <label className={styles.field}><span>Day</span><select value={weekday} onChange={(event) => setWeekday(event.target.value)}><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option><option value="0">Sunday</option></select></label>}
          <label className={styles.field}><span>Timezone</span><input value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Europe/Bucharest" /><small>{scheduleLabel} in this timezone.</small></label>
        </>}

        {step === 3 && <>
          <label className={styles.approvalChoice}>
            <input type="checkbox" checked={requiresApproval} onChange={(event) => setRequiresApproval(event.target.checked)} />
            <span><strong>Draft first, then ask me</strong><small>Scheduled runs wait for your approval before the agent starts. Recommended while you tune the routine.</small></span>
          </label>
          <div className={styles.twoColumns}>
            <label className={styles.field}>
              <span>AI Credit limit</span><input inputMode="numeric" value={budget} onChange={(event) => setBudget(event.target.value.replace(/\D/g, ''))} placeholder="Workspace default" />
            </label>
            <label className={styles.field}><span>Maximum runtime</span><select value={runtime} onChange={(event) => setRuntime(event.target.value)}><option value="300">5 minutes</option><option value="900">15 minutes</option><option value="1800">30 minutes</option><option value="3600">60 minutes</option></select></label>
          </div>
          <label className={styles.field}><span>Data freshness</span><select value={staleAfter} onChange={(event) => setStaleAfter(event.target.value)}><option value="15">Pause if older than 15 minutes</option><option value="60">Pause if older than 1 hour</option><option value="1440">Pause if older than 1 day</option><option value="">No freshness rule</option></select></label>
          <label className={styles.field}><span>How will you know it worked? <small>(optional, one check per line)</small></span><textarea value={acceptance} onChange={(event) => setAcceptance(event.target.value)} placeholder={'Every ticket has a draft reply\nUrgent tickets are clearly flagged'} rows={4} /><small>Runs with checks are held for final review after completion.</small></label>
          <div className={styles.reviewCard}><ShieldCheck size={18} /><div><strong>{name || 'New routine'}</strong><p>{selected?.name ?? 'No agent selected'} · {scheduleLabel} · {requiresApproval ? 'approval before every scheduled run' : 'runs automatically within policy'}</p></div></div>
        </>}

        {error && <p className={styles.formError}><AlertTriangle size={14} />{error}</p>}
        <div className={styles.drawerActions}>
          {step > 1 && <button type="button" className={styles.refreshButton} disabled={busy} onClick={() => setStep((current) => current - 1)}>Back</button>}
          {step < 3 ? <button type="button" className={styles.createButton} onClick={continueToNext}>Continue <ChevronRight size={15} /></button> : <button type="button" className={styles.createButton} disabled={busy || agents.length === 0} onClick={() => void create()}>{busy ? <Loader2 size={16} className={styles.spin} /> : <Plus size={16} />} Create routine</button>}
        </div>
      </aside>
    </>
  );
}

function ManagedRoutinesPanel({ agents, refreshKey, onMessage }: { agents: Agent[]; refreshKey: number; onMessage: (message: string) => void }) {
  const [routines, setRoutines] = useState<AgentRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.getRoutines({ limit: 100 });
    if (result.success) setRoutines(result.data.routines);
    else onMessage(result.error ?? 'Could not load managed routines.');
    setLoading(false);
  }, [onMessage]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const mutate = async (routine: AgentRoutine, action: 'run' | 'pause' | 'resume' | 'archive') => {
    if (action === 'archive' && !window.confirm(`Archive “${routine.name}”? Its run history will stay in Mission Control.`)) return;
    setBusy(`${routine.id}:${action}`);
    const result = action === 'run'
      ? await api.runRoutine(routine.agentId, routine.id)
      : action === 'pause'
        ? await api.pauseRoutine(routine.agentId, routine.id)
        : action === 'resume'
          ? await api.resumeRoutine(routine.agentId, routine.id)
          : await api.archiveRoutine(routine.agentId, routine.id);
    setBusy(null);
    if (!result.success) { onMessage(result.error ?? 'Routine action failed.'); return; }
    await load();
    onMessage(action === 'run' ? `Test run for “${routine.name}” is queued.` : `“${routine.name}” updated.`);
  };

  return (
    <section className={styles.routinesPanel} aria-labelledby="managed-routines-title">
      <div className={styles.routinesHeading}><div><span>Routines v2</span><h2 id="managed-routines-title">Managed routines</h2><p>Framework-independent schedules with budgets, approvals, artifacts, and run history.</p></div><strong>{routines.filter((routine) => routine.status === 'active').length} active</strong></div>
      {loading ? <div className={styles.routineEmpty}><Loader2 size={18} className={styles.spin} /> Loading routines</div> : routines.length === 0 ? <div className={styles.routineEmpty}><CalendarClock size={22} /><strong>No managed routines yet</strong><p>Use “New routine” to automate recurring work without writing cron syntax.</p></div> : <div className={styles.routineGrid}>
        {routines.map((routine) => {
          const latest = routine.recentRuns[0];
          const rowBusy = busy?.startsWith(`${routine.id}:`) ?? false;
          return <article className={styles.routineCard} key={routine.id}>
            <div className={styles.routineTop}><span className={styles.kindIcon}><CalendarClock size={15} /></span><div><h3>{routine.name}</h3><p><Bot size={12} /> {routine.agent.name}</p></div><StatusPill status={routine.status === 'active' ? 'active' : 'paused'} /></div>
            <p className={styles.routinePrompt}>{routine.prompt}</p>
            <dl className={styles.routineFacts}><div><dt>Next run</dt><dd>{formatDate(routine.nextRunAt)}</dd></div><div><dt>Safety</dt><dd>{routine.requiresApproval ? 'Approval first' : `${routine.budgetAiCredits ?? 'Policy'} credits`}</dd></div><div><dt>Last result</dt><dd>{latest ? latest.status.replace('_', ' ') : 'Not run yet'}</dd></div></dl>
            <div className={styles.routineActions}>
              <button type="button" disabled={rowBusy} onClick={() => void mutate(routine, 'run')}>{busy === `${routine.id}:run` ? <Loader2 size={13} className={styles.spin} /> : <Play size={13} />} Test run</button>
              <button type="button" disabled={rowBusy} onClick={() => void mutate(routine, routine.status === 'paused' ? 'resume' : 'pause')}>{routine.status === 'paused' ? <Play size={13} /> : <Pause size={13} />}{routine.status === 'paused' ? 'Resume' : 'Pause'}</button>
              {latest && <Link href={`/dashboard/missions?task=${latest.taskId}`}>History <ExternalLink size={12} /></Link>}
              <button type="button" className={styles.archiveButton} disabled={rowBusy} onClick={() => void mutate(routine, 'archive')} aria-label={`Archive ${routine.name}`}><Trash2 size={13} /></button>
            </div>
          </article>;
        })}
      </div>}
    </section>
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
  const [routineRefreshKey, setRoutineRefreshKey] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [agentFilter, setAgentFilter] = useState('');
  const handleRoutineMessage = useCallback((nextMessage: string) => setMessage(nextMessage), []);

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
        <div><h1>Automation Center</h1><p>Create safe recurring work, test it, and review every result in one place.</p></div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.refreshButton} onClick={() => void load(true)} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? styles.spin : ''} /> Refresh
          </button>
          <button type="button" className={styles.createButton} onClick={() => setDrawerOpen(true)}>
            <Plus size={16} /> New routine
          </button>
        </div>
      </header>

      {message && <div className={styles.notice}><Check size={14} />{message}</div>}
      {loadErrors.length > 0 && (
        <div className={styles.warning}><AlertTriangle size={15} /><span>{loadErrors.length} agent source{loadErrors.length === 1 ? '' : 's'} could not be loaded. Start or restart those agents, then refresh.</span></div>
      )}

      <ManagedRoutinesPanel agents={eligibleAgents} refreshKey={routineRefreshKey} onMessage={handleRoutineMessage} />

      <div className={styles.legacyHeading}><div><span>Runtime sources</span><h2>Agent-native automations</h2><p>Existing framework schedules, webhooks, and IronClaw automations remain available below.</p></div></div>
      <SummaryRail items={items} />

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

      <CreateAutomationDrawer agents={eligibleAgents} open={drawerOpen} onClose={() => setDrawerOpen(false)} onCreated={async (nextMessage) => { setRoutineRefreshKey((value) => value + 1); setMessage(nextMessage); }} />
    </main>
  );
}
