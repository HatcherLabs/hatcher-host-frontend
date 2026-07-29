'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Gift, Lock } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatStakingTokenAmount } from '@/lib/staking-state';
import {
  benefitProgressPercent,
  buildBenefitThresholdSteps,
  formatBenefitThreshold,
  resolveBoostBenefitState,
  resolveDesignatedAgentName,
  STAKING_BENEFIT_DEFAULT_THRESHOLDS,
  type BoostBenefitState,
} from '@/lib/staking-benefits';
import type {
  Agent,
  StakingBenefitsResponse,
  StakingBoostBenefitKey,
  StakingBoostBenefitStatus,
} from '@/lib/api';

const APPLY_DELAY_NOTE = 'Capacity changes apply to the agent within about a minute.';

function StatusChip({ tone, children }: { tone: 'active' | 'ready' | 'muted' | 'lapsed'; children: React.ReactNode }) {
  const toneClasses = {
    active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    ready: 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]',
    muted: 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)]',
    lapsed: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  } as const;
  return (
    <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

function boostChip(state: BoostBenefitState) {
  if (state === 'active') return <StatusChip tone="active">Active</StatusChip>;
  if (state === 'ready-to-designate') return <StatusChip tone="ready">Pick an agent</StatusChip>;
  if (state === 'lapsed') return <StatusChip tone="lapsed">Lapsed</StatusChip>;
  return <StatusChip tone="muted">Locked</StatusChip>;
}

function BoostBenefitRow({
  title,
  capacityNote,
  thresholdLabel,
  status,
  agents,
  agentsLoaded,
  selection,
  onSelect,
  onApply,
  applying,
  anyActionBusy,
}: {
  title: string;
  capacityNote: string;
  thresholdLabel: string;
  status: StakingBoostBenefitStatus;
  agents: Agent[];
  agentsLoaded: boolean;
  selection: string;
  onSelect: (agentId: string) => void;
  onApply: () => void;
  applying: boolean;
  anyActionBusy: boolean;
}) {
  const state = resolveBoostBenefitState(status);
  const designatedName = resolveDesignatedAgentName(status.designatedAgentId, agents);
  const lapsed = state === 'lapsed';
  const applyDisabled = anyActionBusy
    || !selection
    || selection === status.designatedAgentId;

  return (
    <div className={`grid min-w-0 gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start ${lapsed ? 'opacity-60' : ''}`}>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="font-semibold text-[var(--text-primary)]">{title}</p>
          {boostChip(state)}
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {capacityNote} Requires {thresholdLabel} qualifying HATCHER.
        </p>
        {designatedName && (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Designated to <span className="font-semibold text-[var(--text-primary)]">{designatedName}</span>
            {lapsed && <span className="text-amber-400"> - restake to reactivate.</span>}
          </p>
        )}
        {state === 'ready-to-designate' && (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Pick one of your agents below to receive this boost.
          </p>
        )}
      </div>
      {(state === 'active' || state === 'ready-to-designate') && (
        <div className="flex min-w-0 flex-col gap-2 sm:w-64">
          {agentsLoaded && agents.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">
              No agents yet.{' '}
              <Link href="/create" className="font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]">
                Hatch one
              </Link>{' '}
              to designate this boost.
            </p>
          ) : (
            <>
              <select
                value={selection}
                onChange={(event) => onSelect(event.target.value)}
                disabled={anyActionBusy || !agentsLoaded}
                aria-label={`Agent to receive ${title}`}
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{agentsLoaded ? 'Select an agent' : 'Loading agents...'}</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={onApply}
                disabled={applyDisabled}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {applying
                  ? 'Applying'
                  : status.designatedAgentId
                    ? 'Move boost'
                    : 'Apply boost'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function StakingBenefitsCard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [benefits, setBenefits] = useState<StakingBenefitsResponse | null>(null);
  const [benefitsLoading, setBenefitsLoading] = useState(false);
  const [benefitsError, setBenefitsError] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoaded, setAgentsLoaded] = useState(false);
  const [selections, setSelections] = useState<Record<StakingBoostBenefitKey, string>>({
    boost_s: '',
    boost_l: '',
  });
  const [designating, setDesignating] = useState<StakingBoostBenefitKey | null>(null);
  const [designateError, setDesignateError] = useState<string | null>(null);
  const [designateNotice, setDesignateNotice] = useState<string | null>(null);

  const loadBenefits = useCallback(async () => {
    setBenefitsLoading(true);
    setBenefitsError(null);
    try {
      const res = await api.getStakingBenefits();
      if (res.success) {
        setBenefits(res.data);
        setSelections((current) => ({
          boost_s: current.boost_s || (res.data.benefits.boostS.designatedAgentId ?? ''),
          boost_l: current.boost_l || (res.data.benefits.boostL.designatedAgentId ?? ''),
        }));
      } else if (res.error !== 'Unauthorized') {
        setBenefitsError(res.error);
      }
    } catch (err) {
      setBenefitsError(err instanceof Error ? err.message : 'Could not load staking benefits');
    } finally {
      setBenefitsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    void loadBenefits();
    let cancelled = false;
    api.getMyAgents()
      .then((res) => {
        if (cancelled) return;
        if (res.success) setAgents(res.data);
        setAgentsLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setAgentsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, loadBenefits]);

  const entitlement = benefits?.entitlement ?? null;
  const thresholds = entitlement?.thresholds ?? STAKING_BENEFIT_DEFAULT_THRESHOLDS;
  const qualifying = entitlement?.qualifyingStakedHatcher ?? 0;
  const steps = useMemo(
    () => buildBenefitThresholdSteps(qualifying, thresholds),
    [qualifying, thresholds],
  );
  const progressPercent = benefitProgressPercent(qualifying, thresholds);

  const designate = useCallback(async (benefit: StakingBoostBenefitKey) => {
    const agentId = benefit === 'boost_s' ? selections.boost_s : selections.boost_l;
    if (!agentId || designating) return;
    setDesignating(benefit);
    setDesignateError(null);
    setDesignateNotice(null);
    try {
      const res = await api.designateStakingBenefit(benefit, agentId);
      if (!res.success) throw new Error(res.error);
      const agentName = resolveDesignatedAgentName(res.data.agentId, agents) ?? res.data.agentId;
      setDesignateNotice(
        `${benefit === 'boost_s' ? 'Boost S' : 'Boost L'} designated to ${agentName}. ${APPLY_DELAY_NOTE}`,
      );
      await loadBenefits();
    } catch (err) {
      setDesignateError(err instanceof Error ? err.message : 'Could not designate the boost');
    } finally {
      setDesignating(null);
    }
  }, [agents, designating, loadBenefits, selections]);

  const anyActionBusy = designating !== null;

  return (
    <section className="mb-8 min-w-0 overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]">
      <div className="border-b border-[var(--border-default)] p-5">
        <div className="flex items-center gap-2">
          <Gift size={17} aria-hidden />
          <h2 className="text-lg font-semibold">Platform Benefits</h2>
        </div>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Extra platform perks for HATCHER locked in the 30 day and 90 day pools. Only those locked
          stakes count, each benefit stays active while its lock is active and ends when the lock
          ends - re-staking renews it.
        </p>
      </div>

      {authLoading ? (
        <div className="p-6 text-sm text-[var(--text-muted)]">Loading staking benefits...</div>
      ) : !isAuthenticated ? (
        <div className="p-5">
          <div className="grid min-w-0 gap-2 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.key} className="min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3">
                <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                  {formatBenefitThreshold(step.threshold)}+ locked
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{step.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Sign in to see your benefit progress and designate free boosts.
          </p>
          <Link
            href="/login?return=/staking"
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-base)]"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <div>
          <div className="p-5">
            {entitlement && !entitlement.dataFresh && (
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
                Staking data is temporarily degraded. Benefit progress below may lag your latest
                stakes - refresh in a moment.
              </div>
            )}
            {benefitsError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {benefitsError}
              </div>
            )}

            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Qualifying locked HATCHER</p>
                <p className="mt-1 break-words text-2xl font-semibold text-[var(--text-primary)]">
                  {benefitsLoading && !benefits
                    ? 'Loading...'
                    : benefits
                      ? formatStakingTokenAmount(qualifying, 2)
                      : '-'}
                </p>
              </div>
              <p className="text-xs font-medium text-[var(--text-muted)]">30d and 90d locked stakes only</p>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${progressPercent}%` }}
                aria-hidden
              />
            </div>

            <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-3">
              {steps.map((step) => (
                <div
                  key={step.key}
                  className={`flex min-w-0 items-start gap-2 rounded-lg border p-3 ${
                    step.reached
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-[var(--border-default)] bg-[var(--bg-elevated)]'
                  }`}
                >
                  {step.reached
                    ? <Check size={14} aria-hidden className="mt-0.5 shrink-0 text-emerald-400" />
                    : <Lock size={14} aria-hidden className="mt-0.5 shrink-0 text-[var(--text-muted)]" />}
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold uppercase ${step.reached ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                      {formatBenefitThreshold(step.threshold)}+ locked
                    </p>
                    <p className="mt-0.5 break-words text-sm font-semibold text-[var(--text-primary)]">{step.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {designateNotice && (
            <div className="mx-5 mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {designateNotice}
            </div>
          )}
          {designateError && (
            <div className="mx-5 mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {designateError}
            </div>
          )}

          {benefits && (
            <div className="divide-y divide-[var(--border-default)] border-t border-[var(--border-default)]">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--text-primary)]">+1 agent slot</p>
                    {benefits.benefits.extraAgentSlot
                      ? <StatusChip tone="active">Active</StatusChip>
                      : <StatusChip tone="muted">Locked</StatusChip>}
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    One extra agent slot on top of your tier limit. Requires{' '}
                    {formatBenefitThreshold(thresholds.extraAgentSlot)} qualifying HATCHER.
                  </p>
                </div>
              </div>

              <BoostBenefitRow
                title="Free Boost S"
                capacityNote="+1 vCPU and +1 GB RAM for one designated agent."
                thresholdLabel={formatBenefitThreshold(thresholds.boostS)}
                status={benefits.benefits.boostS}
                agents={agents}
                agentsLoaded={agentsLoaded}
                selection={selections.boost_s}
                onSelect={(agentId) => setSelections((current) => ({ ...current, boost_s: agentId }))}
                onApply={() => void designate('boost_s')}
                applying={designating === 'boost_s'}
                anyActionBusy={anyActionBusy}
              />

              <BoostBenefitRow
                title="Free Boost L"
                capacityNote="+2 vCPU and +3 GB RAM for one designated agent."
                thresholdLabel={formatBenefitThreshold(thresholds.boostL)}
                status={benefits.benefits.boostL}
                agents={agents}
                agentsLoaded={agentsLoaded}
                selection={selections.boost_l}
                onSelect={(agentId) => setSelections((current) => ({ ...current, boost_l: agentId }))}
                onApply={() => void designate('boost_l')}
                applying={designating === 'boost_l'}
                anyActionBusy={anyActionBusy}
              />

              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--text-primary)]">Staker badge</p>
                    {benefits.benefits.stakerBadge
                      ? <StatusChip tone="active">Active</StatusChip>
                      : <StatusChip tone="muted">Locked</StatusChip>}
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    A Staker badge on your account menu. Requires{' '}
                    {formatBenefitThreshold(thresholds.boostL)} qualifying HATCHER.
                  </p>
                </div>
              </div>

              <p className="p-4 text-xs leading-5 text-[var(--text-muted)]">
                Free boosts cannot be cancelled - designating a different agent moves the boost.{' '}
                {APPLY_DELAY_NOTE}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
