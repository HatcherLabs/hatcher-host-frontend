'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Github,
  Loader2,
  Pause,
  Play,
  RadioTower,
  ShieldCheck,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import type {
  Agent,
  AgentTrigger,
  AgentTriggerConfig,
  AgentTriggerType,
  CreateAgentTriggerBody,
} from '@/lib/api';
import { describeTriggerConfig, triggerSourceLabel } from '@/lib/trigger-center';
import styles from './automations.module.css';

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

function triggerMeta(type: AgentTriggerType) {
  if (type === 'github') return { label: triggerSourceLabel(type), icon: Github };
  if (type === 'price_move') return { label: triggerSourceLabel(type), icon: TrendingUp };
  return { label: triggerSourceLabel(type), icon: RadioTower };
}

function TriggerStatus({ trigger }: { trigger: AgentTrigger }) {
  const status = trigger.lastError ? 'attention' : trigger.status === 'active' ? 'active' : 'paused';
  const label = status === 'attention' ? 'Needs attention' : status;
  return <span className={styles.statusPill} data-status={status}>{label}</span>;
}

export function ManagedTriggersPanel({
  refreshKey,
  onMessage,
}: {
  refreshKey: number;
  onMessage: (message: string) => void;
}) {
  const [triggers, setTriggers] = useState<AgentTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await api.getTriggers({ limit: 100 });
    if (result.success) setTriggers(result.data.triggers);
    else onMessage(result.error ?? 'Could not load event triggers.');
    setLoading(false);
  }, [onMessage]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const mutate = async (trigger: AgentTrigger, action: 'test' | 'pause' | 'resume' | 'archive') => {
    if (action === 'archive' && !window.confirm(`Archive “${trigger.name}”? Its run history will remain available.`)) return;
    setBusy(`${trigger.id}:${action}`);
    const result = action === 'test'
      ? await api.testTrigger(trigger.agentId, trigger.id)
      : action === 'archive'
        ? await api.archiveTrigger(trigger.agentId, trigger.id)
        : await api.updateTrigger(trigger.agentId, trigger.id, { status: action === 'pause' ? 'paused' : 'active' });
    setBusy(null);
    if (!result.success) {
      onMessage(result.error ?? 'Trigger action failed.');
      return;
    }
    await load();
    onMessage(action === 'test' ? `Test event for “${trigger.name}” is queued.` : `“${trigger.name}” updated.`);
  };

  return (
    <section className={styles.routinesPanel} aria-labelledby="managed-triggers-title">
      <div className={styles.routinesHeading}>
        <div>
          <span>Event sources</span>
          <h2 id="managed-triggers-title">Managed triggers</h2>
          <p>GitHub webhooks, token thresholds, and live Solana address activity routed through Mission Control.</p>
        </div>
        <strong>{triggers.filter((trigger) => trigger.status === 'active').length} active</strong>
      </div>
      {loading ? (
        <div className={styles.routineEmpty}><Loader2 size={18} className={styles.spin} /> Loading triggers</div>
      ) : triggers.length === 0 ? (
        <div className={styles.routineEmpty}><Zap size={22} /><strong>No managed triggers yet</strong><p>Use “New trigger” to react to GitHub, price, or on-chain events.</p></div>
      ) : (
        <div className={styles.routineGrid}>
          {triggers.map((trigger) => {
            const { label, icon: Icon } = triggerMeta(trigger.type);
            const latest = trigger.recentRuns[0];
            const rowBusy = busy?.startsWith(`${trigger.id}:`) ?? false;
            return (
              <article className={styles.routineCard} key={trigger.id}>
                <div className={styles.routineTop}>
                  <span className={styles.kindIcon}><Icon size={15} /></span>
                  <div><h3>{trigger.name}</h3><p><Bot size={12} /> {trigger.agent.name}</p></div>
                  <TriggerStatus trigger={trigger} />
                </div>
                <p className={styles.triggerConfig}><strong>{label}</strong><span>{describeTriggerConfig(trigger.config)}</span></p>
                <p className={styles.routinePrompt}>{trigger.prompt}</p>
                <dl className={styles.routineFacts}>
                  <div><dt>Last event</dt><dd>{formatDate(trigger.lastEventAt)}</dd></div>
                  <div><dt>Cooldown</dt><dd>{trigger.cooldownSeconds === 0 ? 'None' : `${trigger.cooldownSeconds}s`}</dd></div>
                  <div><dt>Last result</dt><dd>{latest ? latest.status.replaceAll('_', ' ') : 'Not fired yet'}</dd></div>
                </dl>
                {trigger.lastError && <p className={styles.inlineError}><AlertTriangle size={12} />{trigger.lastError}</p>}
                <div className={styles.routineActions}>
                  <button type="button" disabled={rowBusy} onClick={() => void mutate(trigger, 'test')}>
                    {busy === `${trigger.id}:test` ? <Loader2 size={13} className={styles.spin} /> : <Play size={13} />} Test
                  </button>
                  <button type="button" disabled={rowBusy} onClick={() => void mutate(trigger, trigger.status === 'paused' ? 'resume' : 'pause')}>
                    {trigger.status === 'paused' ? <Play size={13} /> : <Pause size={13} />}{trigger.status === 'paused' ? 'Resume' : 'Pause'}
                  </button>
                  {latest?.taskId && <Link href={`/dashboard/missions?task=${latest.taskId}`}>History <ExternalLink size={12} /></Link>}
                  <button type="button" className={styles.archiveButton} disabled={rowBusy} onClick={() => void mutate(trigger, 'archive')} aria-label={`Archive ${trigger.name}`}><Trash2 size={13} /></button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

interface GithubSetup {
  name: string;
  webhookUrl: string;
  secret: string;
}

export function CreateTriggerDrawer({
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
  const [step, setStep] = useState(1);
  const [agentId, setAgentId] = useState('');
  const [type, setType] = useState<AgentTriggerType>('github');
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('Summarize what happened, explain why it matters, and tell me the next safe action.');
  const [repository, setRepository] = useState('');
  const [githubEvents, setGithubEvents] = useState<Array<'push' | 'pull_request' | 'issues' | 'issue_comment' | 'release'>>(['push', 'pull_request']);
  const [branches, setBranches] = useState('main');
  const [mint, setMint] = useState('');
  const [symbol, setSymbol] = useState('');
  const [priceCondition, setPriceCondition] = useState<'above' | 'below' | 'change_up' | 'change_down'>('below');
  const [priceValue, setPriceValue] = useState('');
  const [windowMinutes, setWindowMinutes] = useState('60');
  const [address, setAddress] = useState('');
  const [commitment, setCommitment] = useState<'confirmed' | 'finalized'>('confirmed');
  const [includeFailed, setIncludeFailed] = useState(false);
  const [cooldown, setCooldown] = useState('300');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [budget, setBudget] = useState('');
  const [runtime, setRuntime] = useState('900');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubSetup, setGithubSetup] = useState<GithubSetup | null>(null);
  const selected = useMemo(() => agents.find((agent) => agent.id === agentId) ?? null, [agentId, agents]);

  useEffect(() => {
    if (open && !agentId && agents[0]) setAgentId(agents[0].id);
  }, [agentId, agents, open]);

  const resetAndClose = () => {
    setStep(1);
    setError(null);
    setGithubSetup(null);
    onClose();
  };

  const next = () => {
    setError(null);
    if (step === 1 && (!selected || !name.trim())) {
      setError('Choose an agent and give this trigger a name.');
      return;
    }
    if (step === 2) {
      if (!prompt.trim()) { setError('Add the instructions the agent should follow.'); return; }
      if (type === 'github' && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository.trim())) {
        setError('Use a GitHub repository in owner/name format.');
        return;
      }
      if (type === 'github' && githubEvents.length === 0) {
        setError('Choose at least one GitHub event.');
        return;
      }
      if (type === 'price_move' && (!mint.trim() || !Number(priceValue))) {
        setError('Add a token mint and a positive price or percentage threshold.');
        return;
      }
      if (type === 'solana_onchain' && !address.trim()) {
        setError('Add the Solana address you want to watch.');
        return;
      }
    }
    setStep((value) => Math.min(3, value + 1));
  };

  const config = (): AgentTriggerConfig => {
    if (type === 'github') {
      return {
        repository: repository.trim(),
        events: githubEvents,
        branches: branches.split(',').map((branch) => branch.trim()).filter(Boolean),
      };
    }
    if (type === 'solana_onchain') {
      return { address: address.trim(), commitment, includeFailed };
    }
    if (priceCondition === 'above' || priceCondition === 'below') {
      return {
        mint: mint.trim(),
        ...(symbol.trim() ? { symbol: symbol.trim().toUpperCase() } : {}),
        condition: priceCondition,
        targetPriceUsd: Number(priceValue),
      };
    }
    return {
      mint: mint.trim(),
      ...(symbol.trim() ? { symbol: symbol.trim().toUpperCase() } : {}),
      condition: priceCondition,
      changePercent: Number(priceValue),
      windowMinutes: Number(windowMinutes),
    };
  };

  const create = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const body: CreateAgentTriggerBody = {
      name: name.trim(),
      type,
      prompt: prompt.trim(),
      config: config(),
      cooldownSeconds: Number(cooldown),
      requiresApproval,
      ...(budget ? { budgetAiCredits: Number(budget) } : {}),
      maxRuntimeSeconds: Number(runtime),
    };
    const result = await api.createTrigger(selected.id, body);
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? 'Could not create trigger.');
      return;
    }
    await onCreated(`“${result.data.trigger.name}” is live for ${selected.name}.`);
    if (result.data.githubWebhookSecret && result.data.trigger.webhookUrl) {
      setGithubSetup({
        name: result.data.trigger.name,
        webhookUrl: result.data.trigger.webhookUrl,
        secret: result.data.githubWebhookSecret,
      });
      return;
    }
    resetAndClose();
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
  };

  if (!open) return null;

  return (
    <>
      <button type="button" className={styles.drawerBackdrop} aria-label="Close trigger drawer" onClick={resetAndClose} />
      <aside className={styles.drawer} aria-label="Create event trigger">
        <div className={styles.drawerHeader}>
          <div><h2>{githubSetup ? 'Connect GitHub' : 'New event trigger'}</h2><p>{githubSetup ? 'Add these one-time credentials to the repository webhook.' : 'Route a verified external event into a durable agent task.'}</p></div>
          <button type="button" className={styles.iconButton} onClick={resetAndClose} aria-label="Close"><X size={18} /></button>
        </div>

        {githubSetup ? (
          <div className={styles.setupPanel}>
            <div className={styles.setupSuccess}><Check size={18} /><span><strong>{githubSetup.name} is live</strong><small>The secret is only shown once.</small></span></div>
            <label className={styles.field}><span>Payload URL</span><div className={styles.copyField}><input readOnly value={githubSetup.webhookUrl} /><button type="button" onClick={() => void copy(githubSetup.webhookUrl)} aria-label="Copy payload URL"><Copy size={15} /></button></div></label>
            <label className={styles.field}><span>Webhook secret</span><div className={styles.copyField}><input readOnly value={githubSetup.secret} /><button type="button" onClick={() => void copy(githubSetup.secret)} aria-label="Copy webhook secret"><Copy size={15} /></button></div></label>
            <div className={styles.setupInstructions}><Github size={18} /><div><strong>GitHub repository settings</strong><ol><li>Open Settings → Webhooks → Add webhook.</li><li>Use content type application/json.</li><li>Paste the URL and secret above.</li><li>Select the events configured for this trigger.</li></ol></div></div>
            <button type="button" className={styles.createButton} onClick={resetAndClose}>I saved the secret</button>
          </div>
        ) : (
          <>
            <div className={styles.stepper} aria-label={`Step ${step} of 3`}>
              {[['1', 'Source'], ['2', 'Rules'], ['3', 'Safety']].map(([number, label]) => (
                <span key={number} data-active={step >= Number(number)}><b>{number}</b>{label}</span>
              ))}
            </div>

            {step === 1 && <>
              <label className={styles.field}><span>Agent</span><select value={agentId} onChange={(event) => setAgentId(event.target.value)}><option value="">Select an agent</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} · {agent.framework}</option>)}</select></label>
              <fieldset className={styles.triggerChoice}>
                <legend>Trigger source</legend>
                {([
                  ['github', 'GitHub', 'Signed repository events', Github],
                  ['price_move', 'Price move', 'Token price threshold or percentage', TrendingUp],
                  ['solana_onchain', 'Solana on-chain', 'Live address activity over WebSocket', RadioTower],
                ] as const).map(([value, label, detail, Icon]) => (
                  <button type="button" key={value} data-active={type === value} onClick={() => setType(value)}><Icon size={17} /><span><strong>{label}</strong><small>{detail}</small></span></button>
                ))}
              </fieldset>
              <label className={styles.field}><span>Trigger name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Solana dip alert" maxLength={200} /></label>
            </>}

            {step === 2 && <>
              {type === 'github' && <>
                <label className={styles.field}><span>Repository</span><input value={repository} onChange={(event) => setRepository(event.target.value)} placeholder="HatcherLabs/Hatcher" /></label>
                <fieldset className={styles.checkboxGrid}><legend>Events</legend>{(['push', 'pull_request', 'issues', 'issue_comment', 'release'] as const).map((eventName) => <label key={eventName}><input type="checkbox" checked={githubEvents.includes(eventName)} onChange={(event) => setGithubEvents((current) => event.target.checked ? [...current, eventName] : current.filter((item) => item !== eventName))} />{eventName.replaceAll('_', ' ')}</label>)}</fieldset>
                <label className={styles.field}><span>Branches <small>(comma separated)</small></span><input value={branches} onChange={(event) => setBranches(event.target.value)} placeholder="main, release" /><small>Applied to push and pull request events. Leave empty for every branch.</small></label>
              </>}
              {type === 'price_move' && <>
                <label className={styles.field}><span>Solana token mint</span><input value={mint} onChange={(event) => setMint(event.target.value)} placeholder="So11111111111111111111111111111111111111112" /></label>
                <div className={styles.twoColumns}><label className={styles.field}><span>Symbol <small>(optional)</small></span><input value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="SOL" /></label><label className={styles.field}><span>Condition</span><select value={priceCondition} onChange={(event) => setPriceCondition(event.target.value as typeof priceCondition)}><option value="above">Price above</option><option value="below">Price below</option><option value="change_up">Moves up by</option><option value="change_down">Moves down by</option></select></label></div>
                <div className={styles.twoColumns}><label className={styles.field}><span>{priceCondition.startsWith('change_') ? 'Change percent' : 'Target USD price'}</span><input inputMode="decimal" value={priceValue} onChange={(event) => setPriceValue(event.target.value.replace(/[^0-9.]/g, ''))} placeholder={priceCondition.startsWith('change_') ? '5' : '120'} /></label>{priceCondition.startsWith('change_') && <label className={styles.field}><span>Window</span><select value={windowMinutes} onChange={(event) => setWindowMinutes(event.target.value)}><option value="5">5 minutes</option><option value="15">15 minutes</option><option value="60">1 hour</option><option value="240">4 hours</option><option value="1440">24 hours</option></select></label>}</div>
              </>}
              {type === 'solana_onchain' && <>
                <label className={styles.field}><span>Solana address</span><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Wallet, program, or token account" /><small>Hatcher subscribes through the platform Helius stream; your agent does not need a separate key.</small></label>
                <label className={styles.field}><span>Confirmation</span><select value={commitment} onChange={(event) => setCommitment(event.target.value as typeof commitment)}><option value="confirmed">Confirmed · faster</option><option value="finalized">Finalized · strongest confirmation</option></select></label>
                <label className={styles.approvalChoice}><input type="checkbox" checked={includeFailed} onChange={(event) => setIncludeFailed(event.target.checked)} /><span><strong>Include failed transactions</strong><small>Useful for debugging programs; usually off for alerts.</small></span></label>
              </>}
              <label className={styles.field}><span>Agent instructions</span><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={6} maxLength={100000} /><small>Event fields are treated as untrusted data and cannot override these instructions.</small></label>
            </>}

            {step === 3 && <>
              <div className={styles.twoColumns}><label className={styles.field}><span>Cooldown</span><select value={cooldown} onChange={(event) => setCooldown(event.target.value)}><option value="0">No cooldown</option><option value="60">1 minute</option><option value="300">5 minutes</option><option value="900">15 minutes</option><option value="3600">1 hour</option></select></label><label className={styles.field}><span>Maximum runtime</span><select value={runtime} onChange={(event) => setRuntime(event.target.value)}><option value="300">5 minutes</option><option value="900">15 minutes</option><option value="1800">30 minutes</option><option value="3600">60 minutes</option></select></label></div>
              <label className={styles.approvalChoice}><input type="checkbox" checked={requiresApproval} onChange={(event) => setRequiresApproval(event.target.checked)} /><span><strong>Require approval before each run</strong><small>The workspace automation policy can still require approval even when this is off.</small></span></label>
              <label className={styles.field}><span>AI Credit limit <small>(optional)</small></span><input inputMode="numeric" value={budget} onChange={(event) => setBudget(event.target.value.replace(/\D/g, ''))} placeholder="Workspace default" /></label>
              <div className={styles.reviewCard}><ShieldCheck size={18} /><div><strong>{name || 'New trigger'}</strong><p>{selected?.name ?? 'No agent selected'} · {triggerMeta(type).label} · {requiresApproval ? 'approval first' : 'workspace policy applies'}</p></div></div>
            </>}

            {error && <p className={styles.formError}><AlertTriangle size={14} />{error}</p>}
            <div className={styles.drawerActions}>
              {step > 1 && <button type="button" className={styles.refreshButton} disabled={busy} onClick={() => setStep((value) => value - 1)}>Back</button>}
              {step < 3 ? <button type="button" className={styles.createButton} onClick={next}>Continue <ChevronRight size={15} /></button> : <button type="button" className={styles.createButton} disabled={busy || agents.length === 0} onClick={() => void create()}>{busy ? <Loader2 size={16} className={styles.spin} /> : <Zap size={16} />} Create trigger</button>}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
