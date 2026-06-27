'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileJson,
  Handshake,
  Loader2,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  VirtualsAgentSummary,
  VirtualsAcpCliExecutionResponse,
  VirtualsAcpOperatorStatus,
  VirtualsAcpPublishServicesResponse,
  VirtualsConfigBody,
  VirtualsConfigStatus,
  VirtualsHatcherService,
  VirtualsJobDraftResponse,
  VirtualsOfferingSummary,
  VirtualsScoutResult,
} from '@/lib/api';
import { GlassCard, Skeleton } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

type VirtualsSettingsForm = {
  enabled: boolean;
  allowRuntimeSearch: boolean;
  allowJobDrafts: boolean;
  dailyBudgetUsd: string;
  maxPerJobUsd: string;
  preferredModel: string;
  scoutQueries: string;
};

const DEFAULT_FORM: VirtualsSettingsForm = {
  enabled: false,
  allowRuntimeSearch: true,
  allowJobDrafts: true,
  dailyBudgetUsd: '25',
  maxPerJobUsd: '1',
  preferredModel: 'moonshotai-kimi-k2-5',
  scoutQueries: 'mcp\ncode review\nsecurity audit\ntrading\nagent hosting\ndata analysis',
};

export const VIRTUALS_BUDGET_PRESETS = [
  { id: 'safe', label: 'Safe', dailyBudgetUsd: '5', maxPerJobUsd: '1' },
  { id: 'standard', label: 'Standard', dailyBudgetUsd: '25', maxPerJobUsd: '5' },
  { id: 'custom', label: 'Custom', dailyBudgetUsd: null, maxPerJobUsd: null },
] as const;

type VirtualsBudgetPresetId = typeof VIRTUALS_BUDGET_PRESETS[number]['id'];

export function applyVirtualsBudgetPreset(form: VirtualsSettingsForm, presetId: VirtualsBudgetPresetId): VirtualsSettingsForm {
  const preset = VIRTUALS_BUDGET_PRESETS.find((item) => item.id === presetId);
  if (!preset || preset.id === 'custom') return form;
  return {
    ...form,
    dailyBudgetUsd: preset.dailyBudgetUsd,
    maxPerJobUsd: preset.maxPerJobUsd,
  };
}

function short(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 22) return value;
  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function parseUsd(value: string, label: string): number {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive USD amount`);
  }
  return parsed;
}

function parseQueries(value: string): string[] {
  const seen = new Set<string>();
  for (const item of value.split(/[\n,]+/)) {
    const trimmed = item.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}

function parseJsonObject(value: string, label: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

function buildRequirements(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith('{')) return parseJsonObject(trimmed, 'Advanced requirements');
  return { task: trimmed };
}

function formFromConfig(config: VirtualsConfigStatus): VirtualsSettingsForm {
  return {
    enabled: config.settings.enabled,
    allowRuntimeSearch: config.settings.allowRuntimeSearch,
    allowJobDrafts: config.settings.allowJobDrafts,
    dailyBudgetUsd: String(config.settings.dailyBudgetUsd),
    maxPerJobUsd: String(config.settings.maxPerJobUsd),
    preferredModel: config.settings.preferredModel,
    scoutQueries: config.settings.scoutQueries.join('\n'),
  };
}

export function buildVirtualsSettingsPayload(form: VirtualsSettingsForm): VirtualsConfigBody {
  return {
    enabled: form.enabled,
    allowRuntimeSearch: form.allowRuntimeSearch,
    allowJobDrafts: form.allowJobDrafts,
    dailyBudgetUsd: parseUsd(form.dailyBudgetUsd, 'Daily budget'),
    maxPerJobUsd: parseUsd(form.maxPerJobUsd, 'Max per job'),
    preferredModel: form.preferredModel.trim() || undefined,
    scoutQueries: parseQueries(form.scoutQueries),
  };
}

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  const fixed = value < 0.01 ? value.toFixed(3) : value.toFixed(2);
  return `$${fixed.replace(/0+$/, '').replace(/\.$/, '')}`;
}

export function getHatcherServiceCardCopy(service: VirtualsHatcherService) {
  const hours = service.slaMinutes / 60;
  return {
    statusLabel: service.publishable ? 'Ready to publish' : 'Needs Virtuals wallet',
    priceLabel: formatPrice(service.priceValue),
    slaLabel: Number.isInteger(hours) ? `${hours}h SLA` : `${service.slaMinutes}m SLA`,
    primaryUse: service.idealFor[0] ?? 'agent services',
    firstOutcome: service.outcomes[0] ?? 'Delivery summary',
  };
}

export function getSelectedHatcherService(
  services: ReadonlyArray<VirtualsHatcherService>,
  selectedServiceId: string | null | undefined,
): VirtualsHatcherService | null {
  if (services.length === 0) return null;
  return services.find((service) => service.id === selectedServiceId) ?? services[0] ?? null;
}

export function getVirtualsOperatorCopy(status: VirtualsAcpOperatorStatus | null | undefined): {
  statusLabel: string;
  detailLabel: string;
  tone: 'good' | 'warn' | 'muted';
} {
  if (!status) {
    return {
      statusLabel: 'Operator unknown',
      detailLabel: 'Refresh to check ACP CLI access',
      tone: 'muted',
    };
  }
  if (!status.enabled) {
    return {
      statusLabel: 'Operator needs setup',
      detailLabel: 'Connect HatcherLabs agent and signer',
      tone: 'warn',
    };
  }
  return {
    statusLabel: 'Operator ready',
    detailLabel: status.listenCommand?.display ? 'Listening plan configured' : 'CLI configured',
    tone: 'good',
  };
}

export function getVirtualsPublishResultCopy(result: Pick<VirtualsAcpPublishServicesResponse, 'dryRun' | 'results'> | null | undefined): {
  title: string;
  detail: string;
} | null {
  if (!result) return null;
  const count = result.results.length;
  const suffix = count === 1 ? 'service command' : 'service commands';
  if (result.dryRun) {
    return {
      title: 'Publish preview ready',
      detail: `${count} ${suffix} prepared`,
    };
  }
  const executed = result.results.filter((item) => item.executed).length;
  return {
    title: 'Publish submitted',
    detail: `${executed}/${count} ${suffix} executed`,
  };
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function firstOffering(agent: VirtualsAgentSummary | VirtualsScoutResult): VirtualsOfferingSummary | null {
  return agent.offerings.find((offering) => !offering.isHidden) ?? agent.offerings[0] ?? null;
}

function isScoutResult(agent: VirtualsAgentSummary | VirtualsScoutResult): agent is VirtualsScoutResult {
  return Array.isArray((agent as VirtualsScoutResult).reasons);
}

function StatusTile({
  label,
  value,
  description,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  tone: 'good' | 'warn' | 'muted';
  icon: typeof CheckCircle2;
}) {
  const toneClass = tone === 'good'
    ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
    : tone === 'warn'
      ? 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
      : 'border-[var(--border-subtle)] bg-black/20 text-[var(--text-muted)]';

  return (
    <div className={`rounded-md border px-3 py-3 ${toneClass}`}>
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] opacity-80">
        <Icon size={13} /> {label}
      </div>
      <div className="mt-2 break-all text-sm font-semibold text-[var(--text-primary)]">{value}</div>
      <p className="mt-1 text-xs leading-relaxed opacity-80">{description}</p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  step,
  title,
  aside,
}: {
  icon: typeof CheckCircle2;
  step: string;
  title: string;
  aside?: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-black/30 text-[10px] font-semibold text-[var(--text-primary)]">
          {step}
        </span>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
          <Icon size={12} /> {title}
        </div>
      </div>
      {aside && <span className="text-[11px] text-[var(--text-muted)]">{aside}</span>}
    </div>
  );
}

export function VirtualsWalletPanel({ agentId }: { agentId: string }) {
  const { toast } = useToast();
  const [config, setConfig] = useState<VirtualsConfigStatus | null>(null);
  const [operatorStatus, setOperatorStatus] = useState<VirtualsAcpOperatorStatus | null>(null);
  const [form, setForm] = useState<VirtualsSettingsForm>(DEFAULT_FORM);
  const [searchQuery, setSearchQuery] = useState('security audit');
  const [searchTopK, setSearchTopK] = useState('5');
  const [searchResults, setSearchResults] = useState<VirtualsAgentSummary[]>([]);
  const [scoutResults, setScoutResults] = useState<VirtualsScoutResult[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<VirtualsAgentSummary | VirtualsScoutResult | null>(null);
  const [selectedOffering, setSelectedOffering] = useState<VirtualsOfferingSummary | null>(null);
  const [jobBrief, setJobBrief] = useState('Review this MCP server for launch readiness and return the highest-risk issues first.');
  const [maxBudgetUsd, setMaxBudgetUsd] = useState('1');
  const [draft, setDraft] = useState<VirtualsJobDraftResponse | null>(null);
  const [publishResult, setPublishResult] = useState<VirtualsAcpPublishServicesResponse | null>(null);
  const [eventsResult, setEventsResult] = useState<VirtualsAcpCliExecutionResponse | null>(null);
  const [selectedHatcherServiceId, setSelectedHatcherServiceId] = useState('');
  const [mode, setMode] = useState<'hire' | 'auto' | 'publish'>('hire');
  const [budgetPreset, setBudgetPreset] = useState<VirtualsBudgetPresetId>('standard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [scouting, setScouting] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [publishingServiceId, setPublishingServiceId] = useState<string | null>(null);
  const [checkingEvents, setCheckingEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, operatorRes] = await Promise.all([
        api.getAgentVirtualsConfig(agentId),
        api.getAgentVirtualsAcpOperator(agentId),
      ]);
      if (res.success) {
        setConfig(res.data);
        setForm(formFromConfig(res.data));
        setMaxBudgetUsd(String(res.data.settings.maxPerJobUsd));
      } else {
        setError(res.error || 'Virtuals status unavailable');
      }
      if (operatorRes.success) {
        setOperatorStatus(operatorRes.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Virtuals status unavailable');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const enabled = Boolean(config?.settings.enabled);
  const hatcherLabs = config?.hatcherLabsAgent;
  const selectedCanDraft = Boolean(selectedAgent?.walletAddress && selectedOffering?.name);
  const visibleAgents = useMemo(() => (scoutResults.length > 0 ? scoutResults : searchResults), [scoutResults, searchResults]);
  const hatcherServices = config?.hatcherServices ?? [];
  const selectedHatcherService = getSelectedHatcherService(hatcherServices, selectedHatcherServiceId);
  const operatorCopy = getVirtualsOperatorCopy(operatorStatus);
  const publishCopy = getVirtualsPublishResultCopy(publishResult);
  const selectedHatcherServiceCopy = selectedHatcherService ? getHatcherServiceCardCopy(selectedHatcherService) : null;
  const previewingSelectedHatcherService = selectedHatcherService
    ? publishingServiceId === `${selectedHatcherService.id}:preview`
    : false;
  const publishingSelectedHatcherService = selectedHatcherService
    ? publishingServiceId === `${selectedHatcherService.id}:publish`
    : false;

  const setBudgetMode = (presetId: VirtualsBudgetPresetId) => {
    setBudgetPreset(presetId);
    setForm((current) => applyVirtualsBudgetPreset(current, presetId));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = buildVirtualsSettingsPayload(form);
      const res = await api.updateAgentVirtualsConfig(agentId, payload);
      if (res.success) {
        setConfig(res.data);
        setForm(formFromConfig(res.data));
        toast.success(res.data.settings.enabled ? 'Virtuals enabled for this agent' : 'Virtuals disabled for this agent');
      } else {
        setError(res.error || 'Could not save Virtuals settings');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save Virtuals settings');
    } finally {
      setSaving(false);
    }
  };

  const search = async () => {
    setSearching(true);
    setError(null);
    setDraft(null);
    try {
      const topK = Number(searchTopK.trim());
      const res = await api.searchAgentVirtualsAcp(agentId, {
        q: searchQuery.trim() || 'agent services',
        topK: Number.isFinite(topK) && topK > 0 ? topK : 5,
      });
      if (res.success) {
        setSearchResults(res.data);
        setScoutResults([]);
      } else {
        setError(res.error || 'Virtuals ACP search failed');
      }
    } finally {
      setSearching(false);
    }
  };

  const scout = async () => {
    setScouting(true);
    setError(null);
    setDraft(null);
    try {
      const res = await api.scoutAgentVirtualsAcp(agentId, {
        queries: parseQueries(form.scoutQueries),
        topK: 3,
        maxResults: 20,
      });
      if (res.success) {
        setScoutResults(res.data);
        setSearchResults([]);
      } else {
        setError(res.error || 'Virtuals ACP scout failed');
      }
    } finally {
      setScouting(false);
    }
  };

  const selectAgentOffering = (agent: VirtualsAgentSummary | VirtualsScoutResult, offering?: VirtualsOfferingSummary | null) => {
    setSelectedAgent(agent);
    setSelectedOffering(offering ?? firstOffering(agent));
    setDraft(null);
  };

  const selectHatcherService = (service: VirtualsHatcherService) => {
    setSelectedHatcherServiceId(service.id);
    if (!service.providerWalletAddress) {
      setError('Connect the HatcherLabs Virtuals wallet before preparing this service.');
      return;
    }
    const offering: VirtualsOfferingSummary = {
      id: service.id,
      name: service.offeringName,
      description: service.summary,
      priceValue: service.priceValue,
      priceType: service.priceType,
      slaMinutes: service.slaMinutes,
      requiredFunds: false,
      isHidden: false,
      requirement: service.requirementTemplate,
      deliverable: service.deliverableTemplate,
    };
    const agent: VirtualsAgentSummary = {
      id: service.id,
      name: service.providerName,
      description: service.summary,
      imageUrl: null,
      walletAddress: service.providerWalletAddress,
      solWalletAddress: hatcherLabs?.solWalletAddress ?? null,
      role: 'provider',
      rating: null,
      successRate: null,
      builderCode: hatcherLabs?.builderCode ?? null,
      consoleAgentId: service.providerConsoleAgentId,
      isHidden: false,
      createdAt: null,
      updatedAt: null,
      lastActiveAt: null,
      offerings: [offering],
      resourcesCount: 0,
      subscriptionsCount: 0,
    };
    selectAgentOffering(agent, offering);
    setJobBrief(service.summary);
    setMaxBudgetUsd(String(service.priceValue));
    setMode('hire');
  };

  const copyHatcherServicePayload = async (service: VirtualsHatcherService) => {
    try {
      await navigator.clipboard.writeText(pretty(service.publishPayload));
      toast.success('Hatcher service payload copied');
    } catch {
      setError('Could not copy the Hatcher service payload');
    }
  };

  const publishHatcherService = async (service: VirtualsHatcherService, dryRun: boolean) => {
    setPublishingServiceId(`${service.id}:${dryRun ? 'preview' : 'publish'}`);
    setError(null);
    try {
      const res = await api.publishAgentVirtualsHatcherServices(agentId, {
        serviceIds: [service.id],
        dryRun,
      });
      if (res.success) {
        setPublishResult(res.data);
        toast.success(dryRun ? 'Publish preview prepared' : 'Virtuals publish command submitted');
      } else {
        setError(res.error || 'Could not publish Hatcher service');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not publish Hatcher service');
    } finally {
      setPublishingServiceId(null);
    }
  };

  const checkIncomingJobs = async () => {
    setCheckingEvents(true);
    setError(null);
    try {
      const res = await api.drainAgentVirtualsAcpEvents(agentId, { limit: 20 });
      if (res.success) {
        setEventsResult(res.data);
        toast.success('ACP jobs checked');
      } else {
        setError(res.error || 'Could not check incoming ACP jobs');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check incoming ACP jobs');
    } finally {
      setCheckingEvents(false);
    }
  };

  const createDraft = async () => {
    if (!selectedAgent?.walletAddress || !selectedOffering) return;
    setDrafting(true);
    setError(null);
    setDraft(null);
    try {
      const requirements = buildRequirements(jobBrief);
      const maxBudget = maxBudgetUsd.trim() ? parseUsd(maxBudgetUsd, 'Max budget') : undefined;
      const res = await api.draftAgentVirtualsJob(agentId, {
        providerWalletAddress: selectedAgent.walletAddress,
        providerName: selectedAgent.name,
        offeringId: selectedOffering.id ?? undefined,
        offeringName: selectedOffering.name,
        offering: { ...selectedOffering },
        requirements,
        maxBudgetUsd: maxBudget,
        chainId: config?.defaultChainId,
      });
      if (res.success) {
        setDraft(res.data);
        toast.success('Virtuals ACP job draft created');
      } else {
        setError(res.error || 'Could not create Virtuals job draft');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create Virtuals job draft');
    } finally {
      setDrafting(false);
    }
  };

  return (
    <GlassCard className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <Sparkles size={12} /> Virtuals Network
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Services for this agent</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--text-muted)]">
            Match Virtuals providers, prepare review-first jobs, and package HatcherLabs services for the same network.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className="btn-secondary inline-flex items-center gap-2" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-xs text-[var(--color-warning)]">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {loading ? (
          [1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-24 w-full" />)
        ) : (
          <>
            <StatusTile
              label="Access"
              value={enabled ? 'On' : 'Off'}
              description={enabled ? 'This agent can prepare Virtuals work.' : 'Turn it on before matching or drafting jobs.'}
              tone={enabled ? 'good' : 'muted'}
              icon={Power}
            />
            <StatusTile
              label="Spend limit"
              value={`${formatPrice(config?.settings.maxPerJobUsd)} per job`}
              description={`${formatPrice(config?.settings.dailyBudgetUsd)} daily cap. Funding remains approval-first.`}
              tone="muted"
              icon={ShieldCheck}
            />
            <StatusTile
              label="Hatcher services"
              value={`${hatcherServices.length} ready`}
              description={hatcherLabs?.walletAddress ? 'HatcherLabs can be prepared as a provider.' : 'Virtuals wallet is needed for publishing.'}
              tone={hatcherLabs?.walletAddress ? 'good' : 'warn'}
              icon={Handshake}
            />
            <StatusTile
              label="ACP operator"
              value={operatorCopy.statusLabel}
              description={operatorCopy.detailLabel}
              tone={operatorCopy.tone}
              icon={Terminal}
            />
          </>
        )}
      </div>

      <div className="mt-5 grid gap-2 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setMode('hire')}
          className={`rounded-md border px-3 py-3 text-left transition-colors ${mode === 'hire' ? 'border-[var(--phosphor)]/60 bg-[var(--phosphor)]/10' : 'border-[var(--border-subtle)] bg-black/20 hover:border-[var(--border-hover)]'}`}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"><Search size={14} /> Find help</span>
          <span className="mt-1 block text-xs text-[var(--text-muted)]">Describe a need and match providers.</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('auto')}
          className={`rounded-md border px-3 py-3 text-left transition-colors ${mode === 'auto' ? 'border-[var(--phosphor)]/60 bg-[var(--phosphor)]/10' : 'border-[var(--border-subtle)] bg-black/20 hover:border-[var(--border-hover)]'}`}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"><ShieldCheck size={14} /> Auto-hire guard</span>
          <span className="mt-1 block text-xs text-[var(--text-muted)]">Set limits for runtime-created drafts.</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('publish')}
          className={`rounded-md border px-3 py-3 text-left transition-colors ${mode === 'publish' ? 'border-[var(--phosphor)]/60 bg-[var(--phosphor)]/10' : 'border-[var(--border-subtle)] bg-black/20 hover:border-[var(--border-hover)]'}`}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"><Handshake size={14} /> Hatcher services</span>
          <span className="mt-1 block text-xs text-[var(--text-muted)]">Package our agents as hireable services.</span>
        </button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          {mode === 'hire' && (
            <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
              <SectionTitle icon={Search} step="1" title="Describe need" aside={scoutResults.length > 0 ? 'Matched' : 'Ready'} />
              <label className="block text-xs text-[var(--text-muted)]">
                Job brief
                <textarea
                  value={jobBrief}
                  onChange={(event) => setJobBrief(event.target.value)}
                  className="mt-1 min-h-28 w-full resize-y border border-[var(--border-subtle)] bg-black/30 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                />
              </label>
              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_96px_120px]">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="min-w-0 border border-[var(--border-subtle)] bg-black/30 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                  placeholder="security review, market research, mcp audit"
                />
                <input
                  value={searchTopK}
                  onChange={(event) => setSearchTopK(event.target.value)}
                  className="border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                  inputMode="numeric"
                  aria-label="Result limit"
                />
                <input
                  value={maxBudgetUsd}
                  onChange={(event) => setMaxBudgetUsd(event.target.value)}
                  className="border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                  inputMode="decimal"
                  aria-label="Maximum spend"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void scout()} className="btn-primary inline-flex items-center gap-2" disabled={scouting || !enabled}>
                  {scouting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {scouting ? 'Matching...' : 'Auto-match providers'}
                </button>
                <button type="button" onClick={() => void search()} className="btn-secondary inline-flex items-center gap-2" disabled={searching || !enabled}>
                  <RefreshCw size={14} className={searching ? 'animate-spin' : ''} />
                  {searching ? 'Searching...' : 'Search marketplace'}
                </button>
              </div>
            </div>
          )}

          {mode === 'auto' && (
            <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
              <SectionTitle icon={ShieldCheck} step="1" title="Auto-hire guard" aside={enabled ? 'On' : 'Off'} />
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Virtuals access</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">Runtime-created jobs stay as drafts until reviewed.</p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
                    className="h-4 w-4 accent-[var(--phosphor)]"
                  />
                  Enabled
                </label>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {VIRTUALS_BUDGET_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setBudgetMode(preset.id)}
                    className={`rounded-md border px-3 py-2 text-left text-sm ${budgetPreset === preset.id ? 'border-[var(--phosphor)]/60 bg-[var(--phosphor)]/10 text-[var(--text-primary)]' : 'border-[var(--border-subtle)] bg-black/20 text-[var(--text-muted)] hover:border-[var(--border-hover)]'}`}
                  >
                    <span className="block font-semibold">{preset.label}</span>
                    <span className="mt-1 block text-[11px]">{preset.id === 'custom' ? 'Manual limits' : `${formatPrice(Number(preset.maxPerJobUsd))}/job`}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="text-xs text-[var(--text-muted)]">
                  Daily cap
                  <input
                    value={form.dailyBudgetUsd}
                    onChange={(event) => {
                      setBudgetPreset('custom');
                      setForm((current) => ({ ...current, dailyBudgetUsd: event.target.value }));
                    }}
                    className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                    inputMode="decimal"
                  />
                </label>
                <label className="text-xs text-[var(--text-muted)]">
                  Max per job
                  <input
                    value={form.maxPerJobUsd}
                    onChange={(event) => {
                      setBudgetPreset('custom');
                      setForm((current) => ({ ...current, maxPerJobUsd: event.target.value }));
                    }}
                    className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                    inputMode="decimal"
                  />
                </label>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="inline-flex items-center gap-2 text-xs text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={form.allowRuntimeSearch}
                    onChange={(event) => setForm((current) => ({ ...current, allowRuntimeSearch: event.target.checked }))}
                    className="h-4 w-4 accent-[var(--phosphor)]"
                  />
                  Runtime can match providers
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={form.allowJobDrafts}
                    onChange={(event) => setForm((current) => ({ ...current, allowJobDrafts: event.target.checked }))}
                    className="h-4 w-4 accent-[var(--phosphor)]"
                  />
                  Runtime can prepare drafts
                </label>
              </div>
              <label className="mt-3 block text-xs text-[var(--text-muted)]">
                Service needs
                <textarea
                  value={form.scoutQueries}
                  onChange={(event) => setForm((current) => ({ ...current, scoutQueries: event.target.value }))}
                  className="mt-1 min-h-24 w-full resize-y border border-[var(--border-subtle)] bg-black/30 px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                />
              </label>
              <button type="button" onClick={() => void save()} className="btn-primary mt-3 inline-flex items-center gap-2" disabled={saving || loading}>
                <CheckCircle2 size={14} />
                {saving ? 'Saving...' : 'Save limits'}
              </button>
            </div>
          )}

          {mode === 'publish' && (
            <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
              <SectionTitle icon={Handshake} step="1" title="Hatcher services" aside={`${hatcherServices.length} services`} />
              <div className="mb-3 rounded-md border border-[var(--border-subtle)] bg-black/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                      <Terminal size={14} /> {operatorCopy.statusLabel}
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{operatorCopy.detailLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void checkIncomingJobs()}
                    className="btn-secondary inline-flex items-center gap-2 text-xs"
                    disabled={checkingEvents || !operatorStatus?.enabled}
                  >
                    {checkingEvents ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    {checkingEvents ? 'Checking...' : 'Check incoming jobs'}
                  </button>
                </div>
                {eventsResult && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-[var(--text-muted)]">Incoming job data</summary>
                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-[var(--border-subtle)] bg-black/30 p-3 text-xs text-[var(--text-primary)]">
                      {pretty(eventsResult.parsedOutput)}
                    </pre>
                  </details>
                )}
              </div>
              {publishCopy && (
                <div className="mb-3 rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-3">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{publishCopy.title}</div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{publishCopy.detail}</p>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-[var(--text-muted)]">Command result</summary>
                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-[var(--border-subtle)] bg-black/30 p-3 text-xs text-[var(--text-primary)]">
                      {pretty(publishResult)}
                    </pre>
                  </details>
                </div>
              )}
              <label className="block text-xs font-medium text-[var(--text-muted)]">
                Service
                <select
                  value={selectedHatcherService?.id ?? ''}
                  onChange={(event) => setSelectedHatcherServiceId(event.target.value)}
                  className="mt-1 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
                  disabled={hatcherServices.length === 0}
                >
                  {hatcherServices.map((service) => {
                    const copy = getHatcherServiceCardCopy(service);
                    return (
                      <option key={service.id} value={service.id}>
                        {service.title} - {copy.priceLabel} - {copy.slaLabel}
                      </option>
                    );
                  })}
                </select>
              </label>

              {selectedHatcherService && selectedHatcherServiceCopy ? (
                <div className="mt-3 rounded-md border border-[var(--border-subtle)] bg-black/20 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{selectedHatcherService.title}</div>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{selectedHatcherService.summary}</p>
                    </div>
                    <span className={`rounded border px-2 py-1 text-[10px] uppercase tracking-wider ${selectedHatcherService.publishable ? 'border-[var(--color-success-border)] text-[var(--color-success)]' : 'border-[var(--color-warning-border)] text-[var(--color-warning)]'}`}>
                      {selectedHatcherServiceCopy.statusLabel}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--text-muted)]">
                    <span className="rounded border border-[var(--border-default)] px-2 py-1">{selectedHatcherServiceCopy.priceLabel}</span>
                    <span className="rounded border border-[var(--border-default)] px-2 py-1">{selectedHatcherServiceCopy.slaLabel}</span>
                    <span className="rounded border border-[var(--border-default)] px-2 py-1">{selectedHatcherServiceCopy.primaryUse}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void publishHatcherService(selectedHatcherService, true)}
                      className="btn-secondary inline-flex items-center gap-2 text-xs"
                      disabled={!selectedHatcherService.publishable || previewingSelectedHatcherService || publishingSelectedHatcherService}
                    >
                      {previewingSelectedHatcherService ? <Loader2 size={13} className="animate-spin" /> : <Terminal size={13} />}
                      {previewingSelectedHatcherService ? 'Preparing...' : 'Preview publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void publishHatcherService(selectedHatcherService, false)}
                      className="btn-primary inline-flex items-center gap-2 text-xs"
                      disabled={!selectedHatcherService.publishable || previewingSelectedHatcherService || publishingSelectedHatcherService || !operatorStatus?.enabled}
                    >
                      {publishingSelectedHatcherService ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      {publishingSelectedHatcherService ? 'Publishing...' : 'Publish via ACP'}
                    </button>
                    <button
                      type="button"
                      onClick={() => selectHatcherService(selectedHatcherService)}
                      className="btn-secondary inline-flex items-center gap-2 text-xs"
                      disabled={!selectedHatcherService.publishable}
                    >
                      <FileJson size={13} /> Prepare as job
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyHatcherServicePayload(selectedHatcherService)}
                      className="btn-secondary inline-flex items-center gap-2 text-xs"
                    >
                      <CheckCircle2 size={13} /> Copy publish payload
                    </button>
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-[var(--text-muted)]">Advanced</summary>
                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-[var(--border-subtle)] bg-black/30 p-3 text-xs text-[var(--text-primary)]">
                      {pretty(selectedHatcherService.publishPayload)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="mt-3 rounded-md border border-[var(--border-subtle)] bg-black/20 p-3 text-sm text-[var(--text-muted)]">
                  No Hatcher services are available for this agent yet.
                </div>
              )}
            </div>
          )}

          <details className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
            <summary className="cursor-pointer text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Advanced</summary>
            <div className="mt-3 grid gap-3 text-xs md:grid-cols-2">
              <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-3">
                <span className="block text-[var(--text-muted)]">HatcherLabs agent</span>
                <span className="mt-1 block break-all font-mono text-[var(--text-primary)]">{short(hatcherLabs?.walletAddress)}</span>
                <span className="mt-1 block text-[var(--text-muted)]">Builder {hatcherLabs?.builderCode ?? '-'}</span>
              </div>
              <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-3">
                <span className="block text-[var(--text-muted)]">Network</span>
                <span className="mt-1 block text-[var(--text-primary)]">Chain {config?.defaultChainId ?? 8453}</span>
                <span className="mt-1 block text-[var(--text-muted)]">{config?.computeConfigured ? 'Compute key configured' : 'Compute key missing'}</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="https://app.virtuals.io/acp/scan" target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2 text-xs">
                <ExternalLink size={13} />
                ACP Scan
              </a>
            </div>
          </details>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
            <SectionTitle icon={Handshake} step="2" title="Choose provider" aside={`${visibleAgents.length} shown`} />
            {visibleAgents.length === 0 ? (
              <div className="py-8 text-center">
                <Search size={20} className="mx-auto mb-2 text-[var(--text-muted)]" />
                <p className="text-sm font-medium text-[var(--text-primary)]">No providers selected</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Auto-match, search, or prepare a Hatcher service.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleAgents.map((agent) => {
                  const offering = firstOffering(agent);
                  const scoutAgent = isScoutResult(agent) ? agent : null;
                  const isSelected = selectedAgent?.walletAddress === agent.walletAddress && selectedAgent?.id === agent.id;
                  return (
                    <div
                      key={agent.walletAddress ?? agent.id}
                      className={`rounded-md border p-3 transition-colors ${
                        isSelected
                          ? 'border-[var(--phosphor)]/50 bg-[var(--phosphor)]/10'
                          : 'border-[var(--border-subtle)] bg-black/20'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{agent.name}</div>
                          <div className="mt-1 text-xs text-[var(--text-muted)]">{offering?.name ?? `${agent.offerings.length} services`}</div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                          {scoutAgent && <span>match {scoutAgent.hatcherScore}</span>}
                          <span>{agent.successRate ?? 0}% success</span>
                          <span>{formatPrice(offering?.priceValue)}</span>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">{agent.description ?? 'No description.'}</p>
                      {scoutAgent && scoutAgent.reasons.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {scoutAgent.reasons.slice(0, 3).map((reason) => (
                            <span key={reason} className="rounded border border-[var(--border-default)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {agent.offerings.slice(0, 4).map((item) => (
                          <button
                            key={`${agent.id}:${item.id ?? item.name}`}
                            type="button"
                            onClick={() => selectAgentOffering(agent, item)}
                            className="rounded-md border border-[var(--border-default)] px-2 py-1 text-left text-[11px] text-[var(--text-primary)] hover:border-[var(--phosphor)]/50"
                          >
                            {item.name} <span className="text-[var(--text-muted)]">{formatPrice(item.priceValue)}</span>
                          </button>
                        ))}
                        {offering && (
                          <button
                            type="button"
                            onClick={() => selectAgentOffering(agent, offering)}
                            className="btn-secondary inline-flex items-center gap-2 px-2 py-1 text-[11px]"
                          >
                            <FileJson size={12} /> Select
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-4">
            <SectionTitle icon={FileJson} step="3" title="Review draft" aside={selectedCanDraft ? 'Ready' : 'Waiting'} />
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-3">
                <span className="block text-[11px] text-[var(--text-muted)]">Provider</span>
                <span className="mt-1 block truncate text-sm font-semibold text-[var(--text-primary)]">{selectedAgent?.name ?? 'None'}</span>
              </div>
              <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-3">
                <span className="block text-[11px] text-[var(--text-muted)]">Service</span>
                <span className="mt-1 block truncate text-sm font-semibold text-[var(--text-primary)]">{selectedOffering?.name ?? 'None'}</span>
              </div>
              <div className="rounded-md border border-[var(--border-subtle)] bg-black/20 p-3">
                <span className="block text-[11px] text-[var(--text-muted)]">Max spend</span>
                <span className="mt-1 block text-sm font-semibold text-[var(--text-primary)]">{formatPrice(Number(maxBudgetUsd))}</span>
              </div>
            </div>
            <div className="mt-3 rounded-md border border-[var(--border-subtle)] bg-black/20 p-3 text-xs leading-relaxed text-[var(--text-muted)]">
              Nothing is funded here. Hatcher creates a reviewed draft first, then the approved ACP action can be executed separately.
            </div>
            <button
              type="button"
              onClick={() => void createDraft()}
              className="btn-primary mt-3 inline-flex items-center gap-2"
              disabled={drafting || !selectedCanDraft}
            >
              {drafting ? <Loader2 size={14} className="animate-spin" /> : <FileJson size={14} />}
              {drafting ? 'Preparing...' : 'Prepare draft'}
            </button>
            {draft && (
              <div className="mt-3 rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <CheckCircle2 size={14} className="text-[var(--color-success)]" />
                  Draft ready
                </div>
                <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
                  <div>
                    <span className="block text-[var(--text-muted)]">Provider</span>
                    <span className="mt-1 block truncate text-[var(--text-primary)]">{draft.provider.name}</span>
                  </div>
                  <div>
                    <span className="block text-[var(--text-muted)]">Service</span>
                    <span className="mt-1 block truncate text-[var(--text-primary)]">{draft.offering.name}</span>
                  </div>
                  <div>
                    <span className="block text-[var(--text-muted)]">Budget</span>
                    <span className="mt-1 block text-[var(--text-primary)]">{formatPrice(draft.maxBudgetUsd)}</span>
                  </div>
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-[var(--text-muted)]">Advanced payload</summary>
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-[var(--border-subtle)] bg-black/30 p-3 text-xs text-[var(--text-primary)]">
                    {pretty(draft)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
