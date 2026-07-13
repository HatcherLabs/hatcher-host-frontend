'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  ExternalLink,
  FileSearch,
  GitPullRequest,
  ListChecks,
  Loader2,
  Megaphone,
  PackageCheck,
  Pause,
  PieChart,
  Play,
  Radar,
  RefreshCw,
  Repeat2,
  Settings2,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Trash2,
  Wrench,
  XCircle,
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Agent, OutcomePackRecurrence } from '@/lib/api';
import {
  buildOutcomePackRecurrence,
  createOutcomePackIdempotencyKey,
  initializeOutcomePackInputs,
  isOutcomePackLaunchReady,
  localizeOutcomePackModel,
  localizeOutcomePackPreparationModel,
  normalizeOutcomePack,
  normalizeOutcomePackList,
  normalizeOutcomePackPreparation,
  outcomePackSetupTab,
  serializeOutcomePackInputs,
  validateOutcomePackInputs,
  type OutcomePackDraftInputs,
  type OutcomePackDraftValue,
  type OutcomePackDetailItemModel,
  type OutcomePackModel,
  type OutcomePackPreparationModel,
  type OutcomePackRecurrenceDraft,
} from '@/lib/outcome-packs';
import { useToast } from '@/components/ui/ToastProvider';
import { agentWorkspaceHref, requestedOwnedAgentId } from '@/lib/agent-workspace';
import styles from './outcome-packs.module.css';

const PACK_ICONS: Record<string, LucideIcon> = {
  'market-pulse-v1': TrendingUp,
  'trade-plan-review-v1': ShieldAlert,
  'portfolio-risk-review-v1': PieChart,
  'research-report-v1': FileSearch,
  'pr-review-v1': GitPullRequest,
  'competitor-watch-v1': Radar,
  'launch-content-v1': Megaphone,
};

function compactNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

function PackIcon({ packId, size = 18 }: { packId: string; size?: number }) {
  const Icon = PACK_ICONS[packId] ?? PackageCheck;
  return <Icon size={size} aria-hidden />;
}

export default function OutcomePacksPage() {
  const t = useTranslations('outcomePacks');
  const locale = useLocale();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const launchKeyRef = useRef<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [packs, setPacks] = useState<OutcomePackModel[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [pack, setPack] = useState<OutcomePackModel | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [inputs, setInputs] = useState<OutcomePackDraftInputs>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<OutcomePackPreparationModel | null>(null);
  const [recurrences, setRecurrences] = useState<OutcomePackRecurrence[]>([]);
  const [recurrenceDraft, setRecurrenceDraft] = useState<OutcomePackRecurrenceDraft>({
    enabled: false,
    consent: false,
    templateId: '',
    maxRuns: '7',
    budgetAiCreditsPerRun: '',
  });
  const [recurrenceAction, setRecurrenceAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRevision, setDetailRevision] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const translateOr = useCallback((
    key: string,
    fallback: string,
    values?: Record<string, string | number>,
  ): string => (t.has(key) ? t(key, values) : fallback), [t]);

  const localizePack = useCallback(
    (value: OutcomePackModel) => localizeOutcomePackModel(value, translateOr),
    [translateOr],
  );

  const localizePreparation = useCallback(
    (value: OutcomePackPreparationModel) => localizeOutcomePackPreparationModel(value, translateOr),
    [translateOr],
  );

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );

  const acceptanceLabel = useCallback((item: OutcomePackDetailItemModel): string => {
    if (item.type === 'all_tasks_completed') return t('contract.allTasksCompleted');
    if (item.type === 'artifact_required') {
      const kind = item.artifactKind
        ? translateOr(`content.artifactKinds.${item.artifactKind}`, item.artifactKind)
        : t('contract.artifact');
      return t('contract.artifactRequired', { kind });
    }
    if (item.type === 'output_min_length') {
      return t('contract.outputMinLength', { count: item.characters ?? 0 });
    }
    return item.label;
  }, [t, translateOr]);

  const resetPreparedState = useCallback(() => {
    setPreview(null);
    setActionError(null);
    launchKeyRef.current = null;
  }, []);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [agentsResult, packsResult, recurrencesResult] = await Promise.all([
      api.getMyAgents(),
      api.getOutcomePacks(),
      api.getOutcomePackRecurrences(),
    ]);
    setLoading(false);

    if (!agentsResult.success) {
      setError(agentsResult.error);
      return;
    }
    if (!packsResult.success) {
      setError(packsResult.error);
      return;
    }
    if (recurrencesResult.success) setRecurrences(recurrencesResult.data.recurrences);

    const nextPacks = normalizeOutcomePackList(packsResult.data).map(localizePack);
    const search = window.location.search;
    const requestedPackId = new URLSearchParams(search).get('pack');
    const requestedAgentId = requestedOwnedAgentId(search, agentsResult.data);
    setAgents(agentsResult.data);
    setPacks(nextPacks);
    setDetailRevision((current) => current + 1);
    setSelectedAgentId((current) =>
      current && agentsResult.data.some((agent) => agent.id === current)
        ? current
        : requestedAgentId ?? agentsResult.data[0]?.id ?? '',
    );
    setSelectedPackId((current) =>
      current && nextPacks.some((item) => item.id === current)
        ? current
        : requestedPackId && nextPacks.some((item) => item.id === requestedPackId)
          ? requestedPackId
        : nextPacks[0]?.id ?? null,
    );
  }, [localizePack]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void loadCatalog();
  }, [isAuthenticated, loadCatalog]);

  useEffect(() => {
    if (!selectedPackId || !isAuthenticated) {
      setPack(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setActionError(null);
    api.getOutcomePack(selectedPackId).then((result) => {
      if (cancelled) return;
      setDetailLoading(false);
      if (!result.success) {
        setActionError(result.error);
        setPack(null);
        return;
      }
      const nextPack = localizePack(normalizeOutcomePack(result.data.pack));
      setPack(nextPack);
      setInputs(initializeOutcomePackInputs(nextPack));
      setFieldErrors({});
      setPreview(null);
      setRecurrenceDraft({
        enabled: false,
        consent: false,
        templateId: nextPack.schedules[0]?.id ?? '',
        maxRuns: '7',
        budgetAiCreditsPerRun: nextPack.budgetTargetAiCredits?.toString() ?? '',
      });
      launchKeyRef.current = null;
    });
    return () => { cancelled = true; };
  }, [detailRevision, isAuthenticated, localizePack, selectedPackId]);

  const selectPack = useCallback((packId: string) => {
    if (packId === selectedPackId) return;
    setSelectedPackId(packId);
    setPack(null);
    setPreview(null);
    setRecurrenceDraft((current) => ({ ...current, enabled: false, consent: false }));
    setFieldErrors({});
    setActionError(null);
    launchKeyRef.current = null;
    const params = new URLSearchParams(window.location.search);
    params.set('pack', packId);
    if (selectedAgentId) params.set('agent', selectedAgentId);
    router.replace(`/dashboard/outcome-packs?${params.toString()}`, { scroll: false });
  }, [router, selectedAgentId, selectedPackId]);

  const selectAgent = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    resetPreparedState();
    const params = new URLSearchParams(window.location.search);
    if (selectedPackId) params.set('pack', selectedPackId);
    if (agentId) params.set('agent', agentId);
    else params.delete('agent');
    router.replace(`/dashboard/outcome-packs?${params.toString()}`, { scroll: false });
  }, [resetPreparedState, router, selectedPackId]);

  const updateInput = useCallback((fieldId: string, value: OutcomePackDraftValue) => {
    setInputs((current) => ({ ...current, [fieldId]: value }));
    setFieldErrors((current) => {
      if (!current[fieldId]) return current;
      const next = { ...current };
      delete next[fieldId];
      return next;
    });
    resetPreparedState();
  }, [resetPreparedState]);

  const prepare = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pack || !selectedAgentId) {
      setActionError(t('validation.agent'));
      return;
    }
    const errors = validateOutcomePackInputs(pack.inputFields, inputs);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setActionError(t('validation.required'));
      return;
    }

    setPreparing(true);
    setActionError(null);
    const result = await api.prepareOutcomePack(pack.id, {
      agentId: selectedAgentId,
      inputs: serializeOutcomePackInputs(pack.inputFields, inputs),
    });
    setPreparing(false);
    if (!result.success) {
      setActionError(result.error);
      return;
    }
    const prepared = localizePreparation(normalizeOutcomePackPreparation(result.data));
    setPreview(prepared);
    setRecurrenceDraft({
      enabled: false,
      consent: false,
      templateId: prepared.schedules[0]?.id ?? '',
      maxRuns: '7',
      budgetAiCreditsPerRun: prepared.budgetTargetAiCredits?.toString() ?? '',
    });
    launchKeyRef.current = createOutcomePackIdempotencyKey();
  }, [inputs, localizePreparation, pack, selectedAgentId, t]);

  const launch = useCallback(async () => {
    if (!pack || !selectedAgentId || !preview || !isOutcomePackLaunchReady(preview)) return;
    const idempotencyKey = launchKeyRef.current ?? createOutcomePackIdempotencyKey();
    const recurring = buildOutcomePackRecurrence(
      recurrenceDraft,
      preview.schedules,
      preview.budgetTargetAiCredits,
    );
    if (recurring.error) {
      setActionError(recurring.error === 'consent_required'
        ? translateOr('recurring.consentError', 'Confirm the recurring-run authorization before launch.')
        : translateOr('recurring.limitsError', 'Use 1-30 runs and a per-run budget within the pack limit.'));
      return;
    }
    launchKeyRef.current = idempotencyKey;
    setLaunching(true);
    setActionError(null);
    const result = await api.launchOutcomePack(pack.id, {
      agentId: selectedAgentId,
      inputs: serializeOutcomePackInputs(pack.inputFields, inputs),
      idempotencyKey,
      activateSchedules: false,
      ...(recurring.recurrence ? { recurrence: recurring.recurrence } : {}),
    });
    setLaunching(false);
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
      return;
    }
    const pendingSkills = result.data.requiredSkills
      .filter((skill) => skill.status !== 'installed')
      .map((skill) => skill.name);
    if (pendingSkills.length > 0) {
      toast.warning(t('contract.launchedPending', { count: pendingSkills.length }));
    } else {
      toast.success(result.data.recurrence
        ? translateOr('recurring.created', 'Mission created and recurring runs authorized.')
        : t('messages.launched'));
    }
    const query = new URLSearchParams({
      task: result.data.task.id,
      outcomePack: result.data.task.sourceId,
      agent: result.data.task.agentId,
    });
    if (pendingSkills.length > 0) query.set('skillsPending', pendingSkills.join(','));
    router.push(`/dashboard/missions?${query.toString()}`);
  }, [inputs, pack, preview, recurrenceDraft, router, selectedAgentId, t, toast, translateOr]);

  const updateRecurrence = useCallback(async (
    recurrence: OutcomePackRecurrence,
    action: 'pause' | 'resume' | 'delete',
  ) => {
    if (action === 'delete' && !window.confirm(
      translateOr('recurring.deleteConfirm', 'Remove this recurring run? Existing missions stay in Mission Control.'),
    )) return;
    setRecurrenceAction(recurrence.id);
    const result = action === 'pause'
      ? await api.pauseOutcomePackRecurrence(recurrence.id)
      : action === 'resume'
        ? await api.resumeOutcomePackRecurrence(recurrence.id)
        : await api.deleteOutcomePackRecurrence(recurrence.id);
    setRecurrenceAction(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (action === 'delete') {
      setRecurrences((current) => current.filter((item) => item.id !== recurrence.id));
    } else {
      setRecurrences((current) => current.map((item) => item.id === recurrence.id
        ? {
            ...item,
            enabled: action === 'resume',
            nextRunAt: action === 'resume' && 'nextRunAt' in result.data
              ? result.data.nextRunAt
              : null,
          }
        : item));
    }
  }, [toast, translateOr]);

  if (authLoading) {
    return (
      <div className={styles.gate}>
        <Loader2 className={styles.spin} aria-hidden />
        <p>{t('authenticating')}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.gate}>
        <PackageCheck size={29} aria-hidden />
        <h1>{t('signInTitle')}</h1>
        <p>{t('signInDescription')}</p>
        <Link href="/login" className={styles.primaryButton}>{t('signIn')}</Link>
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.pageHeader}>
          <div>
            <span className={styles.eyebrow}>{t('eyebrow')}</span>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => void loadCatalog()}
              disabled={loading}
              aria-label={t('refresh')}
              title={t('refresh')}
            >
              <RefreshCw size={17} className={loading ? styles.spin : ''} aria-hidden />
            </button>
            <Link
              href={selectedAgentId
                ? agentWorkspaceHref('/dashboard/missions', selectedAgentId)
                : '/dashboard/missions'}
              className={styles.secondaryButton}
              aria-label={t('missionControl')}
              title={t('missionControl')}
            >
              <ListChecks size={15} aria-hidden /> {t('missionControl')}
            </Link>
          </div>
        </header>

        {error ? (
          <div className={styles.errorBanner} role="alert">
            <AlertTriangle size={16} aria-hidden />
            <span>{error}</span>
            <button type="button" onClick={() => void loadCatalog()}>{t('tryAgain')}</button>
          </div>
        ) : null}

        {!loading && recurrences.length > 0 ? (
          <section className={styles.recurrenceBar} aria-label={translateOr('recurring.activeTitle', 'Recurring runs')}>
            <div className={styles.recurrenceHeading}>
              <Repeat2 size={16} aria-hidden />
              <div>
                <strong>{translateOr('recurring.activeTitle', 'Recurring runs')}</strong>
                <span>{translateOr('recurring.activeSubtitle', 'Owner-authorized Outcome Packs across your agents')}</span>
              </div>
            </div>
            <div className={styles.recurrenceRows}>
              {recurrences.map((recurrence) => (
                <div className={styles.recurrenceRow} key={recurrence.id}>
                  <div>
                    <strong>{recurrence.pack.title}</strong>
                    <span>{recurrence.agent.name} - {recurrence.label}</span>
                  </div>
                  <div className={styles.recurrenceStats}>
                    <span>{recurrence.runCount}/{recurrence.maxRuns ?? '-'} {translateOr('recurring.runs', 'runs')}</span>
                    <span>{recurrence.budgetAiCreditsPerRun ?? '-'} {translateOr('recurring.creditsPerRun', 'credits/run')}</span>
                    <span>{recurrence.enabled && recurrence.nextRunAt
                      ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(recurrence.nextRunAt))
                      : translateOr('recurring.paused', 'Paused')}</span>
                  </div>
                  <div className={styles.recurrenceActions}>
                    {recurrence.lastTaskId ? (
                      <Link
                        href={`/dashboard/missions?task=${encodeURIComponent(recurrence.lastTaskId)}&agent=${encodeURIComponent(recurrence.agent.id)}`}
                        className={styles.iconButton}
                        title={translateOr('recurring.lastMission', 'Open latest mission')}
                        aria-label={translateOr('recurring.lastMission', 'Open latest mission')}
                      >
                        <ListChecks size={15} aria-hidden />
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => void updateRecurrence(recurrence, recurrence.enabled ? 'pause' : 'resume')}
                      disabled={recurrenceAction === recurrence.id}
                      title={recurrence.enabled ? translateOr('recurring.pause', 'Pause') : translateOr('recurring.resume', 'Resume')}
                      aria-label={recurrence.enabled ? translateOr('recurring.pause', 'Pause') : translateOr('recurring.resume', 'Resume')}
                    >
                      {recurrenceAction === recurrence.id
                        ? <Loader2 size={15} className={styles.spin} aria-hidden />
                        : recurrence.enabled ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => void updateRecurrence(recurrence, 'delete')}
                      disabled={recurrenceAction === recurrence.id}
                      title={translateOr('recurring.remove', 'Remove')}
                      aria-label={translateOr('recurring.remove', 'Remove')}
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {loading ? (
          <section className={styles.loadingWorkspace} aria-label={t('loading')}>
            <Loader2 className={styles.spin} size={22} aria-hidden />
            <span>{t('loading')}</span>
          </section>
        ) : packs.length === 0 ? (
          <section className={styles.empty}>
            <PackageCheck size={30} aria-hidden />
            <h2>{t('empty.title')}</h2>
            <p>{t('empty.description')}</p>
            <button type="button" className={styles.secondaryButton} onClick={() => void loadCatalog()}>
              <RefreshCw size={15} aria-hidden /> {t('tryAgain')}
            </button>
          </section>
        ) : (
          <section className={styles.workspace}>
            <aside className={styles.catalog} aria-label={t('catalog.label')}>
              <div className={styles.catalogHeader}>
                <div>
                  <strong>{t('catalog.title')}</strong>
                  <span>{t('catalog.firstParty')}</span>
                </div>
                <span className={styles.count}>{packs.length}</span>
              </div>
              <div className={styles.packList}>
                {packs.map((item) => {
                  const selected = selectedPackId === item.id;
                  return (
                    <button
                      type="button"
                      className={styles.packRow}
                      data-selected={selected || undefined}
                      aria-current={selected ? 'true' : undefined}
                      onClick={() => selectPack(item.id)}
                      key={item.id}
                    >
                      <span className={styles.packIcon}><PackIcon packId={item.id} /></span>
                      <span className={styles.packCopy}>
                        <strong>{item.title}</strong>
                        <span>{item.summary}</span>
                        <small>{t('catalog.version', { version: item.version })}</small>
                      </span>
                      <ChevronRight size={15} aria-hidden />
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className={styles.configurator}>
              {detailLoading || !pack ? (
                <div className={styles.detailLoading}>
                  {detailLoading ? <Loader2 size={21} className={styles.spin} aria-hidden /> : <XCircle size={21} aria-hidden />}
                  <span>{detailLoading ? t('detailLoading') : actionError ?? t('detailError')}</span>
                </div>
              ) : (
                <>
                  <header className={styles.packHeader}>
                    <span className={styles.largePackIcon}><PackIcon packId={pack.id} size={23} /></span>
                    <div>
                      <span className={styles.eyebrow}>{pack.category || t('detail.curated')}</span>
                      <h2>{pack.title}</h2>
                      <p>{pack.summary}</p>
                    </div>
                    {pack.maxRuntimeSeconds !== null ? (
                      <span className={styles.duration}>
                        <Clock3 size={14} aria-hidden />
                        {t('detail.runtimeMinutes', { count: Math.ceil(pack.maxRuntimeSeconds / 60) })}
                      </span>
                    ) : null}
                  </header>

                  <div className={styles.specStrip}>
                    <div>
                      <span>{t('detail.frameworks')}</span>
                      <strong>{pack.compatibleFrameworks.length > 0 ? pack.compatibleFrameworks.join(', ') : t('detail.anyFramework')}</strong>
                    </div>
                    <div>
                      <span>{t('detail.requirements')}</span>
                      <strong>
                        {[...pack.requiredSkills, ...pack.prerequisites.map((item) => item.label)].join(', ') || t('detail.noRequirements')}
                      </strong>
                    </div>
                    <div>
                      <span>{t('detail.plan')}</span>
                      <strong>{t('detail.taskCount', { count: pack.deliverables.length })}</strong>
                    </div>
                  </div>

                  {agents.length === 0 ? (
                    <section className={styles.noAgents}>
                      <Bot size={25} aria-hidden />
                      <div>
                        <h3>{t('noAgents.title')}</h3>
                        <p>{t('noAgents.description')}</p>
                      </div>
                      <Link href="/create" className={styles.primaryButton}>
                        {t('noAgents.action')} <ArrowRight size={15} aria-hidden />
                      </Link>
                    </section>
                  ) : (
                    <form className={styles.configuration} onSubmit={prepare} noValidate>
                      <section className={styles.formPane}>
                        <div className={styles.sectionHeading}>
                          <Settings2 size={16} aria-hidden />
                          <div>
                            <h3>{t('configure.title')}</h3>
                            <p>{t('configure.subtitle')}</p>
                          </div>
                        </div>

                        <label className={styles.field}>
                          <span>{t('configure.agent')}</span>
                          <select
                            value={selectedAgentId}
                            onChange={(event) => selectAgent(event.target.value)}
                            required
                          >
                            <option value="">{t('configure.agentPlaceholder')}</option>
                            {agents.map((agent) => (
                              <option value={agent.id} key={agent.id}>{agent.name} - {agent.framework}</option>
                            ))}
                          </select>
                          {selectedAgent ? <small>{t('configure.agentStatus', { framework: selectedAgent.framework, status: selectedAgent.status })}</small> : null}
                        </label>

                        {pack.inputFields.map((field) => {
                          const hasError = Boolean(fieldErrors[field.key]);
                          const fieldId = `outcome-pack-${field.key}`;
                          const draftValue = inputs[field.key];
                          const textValue = typeof draftValue === 'string' ? draftValue : '';
                          const selectedValues = Array.isArray(draftValue) ? draftValue : [];
                          const inputMaxLength = field.type === 'string_list' && field.maxLength !== null
                            ? field.maxLength * (field.maxItems ?? 1) + Math.max(0, (field.maxItems ?? 1) - 1)
                            : field.maxLength ?? undefined;
                          if (field.type === 'multi_select') {
                            return (
                              <div className={styles.field} data-error={hasError || undefined} key={field.key}>
                                <span id={`${fieldId}-label`}>
                                  {field.label}
                                  {field.required ? <em>{t('configure.required')}</em> : null}
                                </span>
                                <div className={styles.multiSelect} role="group" aria-labelledby={`${fieldId}-label`}>
                                  {field.options.map((option) => {
                                    const checked = selectedValues.includes(option);
                                    return (
                                      <label className={styles.multiOption} key={option}>
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => updateInput(
                                            field.key,
                                            checked
                                              ? selectedValues.filter((value) => value !== option)
                                              : [...selectedValues, option],
                                          )}
                                        />
                                        <span>{translateOr(`content.options.${option}`, option)}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                                {hasError ? <small className={styles.fieldError}>{t('validation.fieldInvalid')}</small> : null}
                              </div>
                            );
                          }
                          return (
                            <label className={styles.field} data-error={hasError || undefined} key={field.key} htmlFor={fieldId}>
                              <span>
                                {field.label}
                                {field.required ? <em>{t('configure.required')}</em> : null}
                              </span>
                              {field.type === 'textarea' || field.type === 'string_list' ? (
                                <textarea
                                  id={fieldId}
                                  value={textValue}
                                  onChange={(event) => updateInput(field.key, event.target.value)}
                                  rows={field.type === 'string_list' ? 4 : 5}
                                  maxLength={inputMaxLength}
                                  placeholder={field.type === 'string_list' ? t('contract.listPlaceholder') : undefined}
                                  aria-invalid={hasError}
                                  required={field.required}
                                />
                              ) : field.type === 'select' ? (
                                <select
                                  id={fieldId}
                                  value={textValue}
                                  onChange={(event) => updateInput(field.key, event.target.value)}
                                  aria-invalid={hasError}
                                  required={field.required}
                                >
                                  <option value="">{t('configure.selectPlaceholder')}</option>
                                  {field.options.map((option) => (
                                    <option value={option} key={option}>
                                      {translateOr(`content.options.${option}`, option)}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  id={fieldId}
                                  type={field.type === 'integer' ? 'number' : 'text'}
                                  inputMode={field.type === 'integer' ? 'numeric' : undefined}
                                  step={field.type === 'integer' ? 1 : undefined}
                                  value={textValue}
                                  onChange={(event) => updateInput(field.key, event.target.value)}
                                  maxLength={field.maxLength ?? undefined}
                                  aria-invalid={hasError}
                                  required={field.required}
                                />
                              )}
                              {hasError ? <small className={styles.fieldError}>{t('validation.fieldInvalid')}</small> : null}
                            </label>
                          );
                        })}

                        <div className={styles.planDetails}>
                          <div className={styles.detailGroup}>
                            <h4><ListChecks size={14} aria-hidden /> {t('detail.tasks')}</h4>
                            {pack.deliverables.map((deliverable, index) => (
                              <div className={styles.lineItem} key={deliverable.id}>
                                <span>{index + 1}</span>
                                <div>
                                  <strong>{deliverable.label}</strong>
                                  {deliverable.description ? <p>{deliverable.description}</p> : null}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className={styles.detailGroup}>
                            <h4><CheckCircle2 size={14} aria-hidden /> {t('detail.acceptance')}</h4>
                            {pack.acceptanceChecks.map((item) => (
                              <div className={styles.acceptanceItem} key={item.id}>
                                <Check size={13} aria-hidden />
                                <div>
                                  <strong>{acceptanceLabel(item)}</strong>
                                  {item.description ? <p>{item.description}</p> : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button type="submit" className={styles.prepareButton} disabled={preparing || launching}>
                          {preparing ? <Loader2 size={16} className={styles.spin} aria-hidden /> : <Sparkles size={16} aria-hidden />}
                          {preparing ? t('actions.preparing') : preview ? t('actions.prepareAgain') : t('actions.prepare')}
                        </button>
                      </section>

                      <aside className={styles.previewPane} aria-label={t('preview.label')}>
                        <div className={styles.sectionHeading}>
                          <Play size={16} aria-hidden />
                          <div>
                            <h3>{t('preview.title')}</h3>
                            <p>{t('preview.subtitle')}</p>
                          </div>
                        </div>

                        {!preview ? (
                          <div className={styles.previewEmpty}>
                            <Sparkles size={24} aria-hidden />
                            <p>{t('preview.empty')}</p>
                          </div>
                        ) : (
                          <div className={styles.previewContent}>
                            <div className={styles.compatibility} data-compatible={preview.compatible || undefined}>
                              {preview.compatible ? <CheckCircle2 size={17} aria-hidden /> : <XCircle size={17} aria-hidden />}
                              <div>
                                <strong>{preview.compatible ? t('preview.compatible') : t('preview.incompatible')}</strong>
                                <span>{selectedAgent?.name}</span>
                              </div>
                            </div>

                            {preview.missingPrerequisites.length > 0 ? (
                              <section className={styles.previewSection}>
                                <h4><ShieldAlert size={15} aria-hidden /> {t('preview.blockers')}</h4>
                                <div className={styles.blockerList}>
                                  {preview.missingPrerequisites.map((item) => {
                                    const tab = outcomePackSetupTab(item);
                                    return (
                                      <div className={styles.blocker} key={item.id}>
                                        <Wrench size={15} aria-hidden />
                                        <div>
                                          <strong>{item.label}</strong>
                                          <Link href={`/dashboard/agent/${selectedAgentId}?tab=${tab}`}>
                                            {t(`preview.setup.${tab}`)} <ExternalLink size={12} aria-hidden />
                                          </Link>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </section>
                            ) : null}

                            {preview.warnings.length > 0 ? (
                              <section className={styles.previewSection}>
                                <h4><AlertTriangle size={15} aria-hidden /> {t('preview.warnings')}</h4>
                                <ul className={styles.warningList}>
                                  {preview.warnings.map((warning, index) => (
                                    <li key={`${warning.code}-${index}`}>{warning.label}</li>
                                  ))}
                                </ul>
                              </section>
                            ) : null}

                            {preview.reviewPolicy?.mode === 'manual_required' ? (
                              <section className={styles.previewSection}>
                                <h4><ShieldAlert size={15} aria-hidden /> {t('preview.manualReviewTitle')}</h4>
                                <p className={styles.scheduleNotice}>{t('preview.manualReviewDescription')}</p>
                              </section>
                            ) : null}

                            <section className={styles.previewSection}>
                              <h4><ListChecks size={15} aria-hidden /> {t('preview.resolvedTasks')}</h4>
                              <div className={styles.resolvedTasks}>
                                {preview.resolvedTasks.map((task, index) => (
                                  <div key={task.id}>
                                    <span>{index + 1}</span>
                                    <div>
                                      <strong>{task.title}</strong>
                                      {task.description ? <p>{task.description}</p> : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>

                            <section className={styles.previewSection}>
                              <h4><Coins size={15} aria-hidden /> {t('preview.budget')}</h4>
                              <div className={styles.budgetLine}>
                                <strong>
                                  {preview.budgetTargetAiCredits === null
                                    ? t('preview.noBudget')
                                    : t('preview.credits', { count: compactNumber(preview.budgetTargetAiCredits, locale) })}
                                </strong>
                                <span>{t('preview.budgetAdvisory')}</span>
                                {preview.maxRuntimeSeconds !== null ? (
                                  <span>{t('preview.maxRuntime', { count: Math.ceil(preview.maxRuntimeSeconds / 60) })}</span>
                                ) : null}
                              </div>
                            </section>

                            {preview.schedules.length > 0 ? (
                              <section className={styles.previewSection}>
                                <h4><Repeat2 size={15} aria-hidden /> {translateOr('recurring.title', 'Recurring runs')}</h4>
                                <div className={styles.scheduleList}>
                                  {preview.schedules.map((schedule) => (
                                    <label key={schedule.id}>
                                      <input
                                        type="checkbox"
                                        checked={recurrenceDraft.enabled && recurrenceDraft.templateId === schedule.id}
                                        onChange={(event) => setRecurrenceDraft((current) => ({
                                          ...current,
                                          enabled: event.target.checked,
                                          consent: event.target.checked ? current.consent : false,
                                          templateId: schedule.id,
                                        }))}
                                      />
                                      <span className={styles.switch} aria-hidden><span /></span>
                                      <span>
                                        <strong>{schedule.label}</strong>
                                        <small>{[schedule.cron, schedule.timezone].filter(Boolean).join(' - ') || schedule.description}</small>
                                      </span>
                                      <em>{recurrenceDraft.enabled && recurrenceDraft.templateId === schedule.id
                                        ? translateOr('recurring.on', 'On')
                                        : translateOr('recurring.off', 'Off')}</em>
                                    </label>
                                  ))}
                                </div>
                                {recurrenceDraft.enabled ? (
                                  <div className={styles.recurrenceControls}>
                                    <label>
                                      <span>{translateOr('recurring.maxRuns', 'Maximum runs')}</span>
                                      <input
                                        type="number"
                                        min={1}
                                        max={30}
                                        value={recurrenceDraft.maxRuns}
                                        onChange={(event) => setRecurrenceDraft((current) => ({ ...current, maxRuns: event.target.value }))}
                                      />
                                    </label>
                                    <label>
                                      <span>{translateOr('recurring.budgetPerRun', 'AI Credits per run')}</span>
                                      <input
                                        type="number"
                                        min={1}
                                        max={preview.budgetTargetAiCredits ?? undefined}
                                        value={recurrenceDraft.budgetAiCreditsPerRun}
                                        onChange={(event) => setRecurrenceDraft((current) => ({ ...current, budgetAiCreditsPerRun: event.target.value }))}
                                      />
                                    </label>
                                    <label className={styles.consentRow}>
                                      <input
                                        type="checkbox"
                                        checked={recurrenceDraft.consent}
                                        onChange={(event) => setRecurrenceDraft((current) => ({ ...current, consent: event.target.checked }))}
                                      />
                                      <span>{translateOr(
                                        'recurring.consent',
                                        'I authorize Hatcher to create and start these recurring missions within the limits above.',
                                      )}</span>
                                    </label>
                                  </div>
                                ) : null}
                                <p className={styles.scheduleNotice}>{translateOr(
                                  'recurring.guardrail',
                                  'Off by default. Hatcher rechecks the agent, prerequisites, and skills before every run and stops at the selected limit.',
                                )}</p>
                              </section>
                            ) : null}
                          </div>
                        )}

                        {actionError ? (
                          <div className={styles.actionError} role="alert">
                            <AlertTriangle size={15} aria-hidden /> {actionError}
                          </div>
                        ) : null}

                        <footer className={styles.launchFooter}>
                          <div>
                            <strong>{t('actions.launchTitle')}</strong>
                            <span>{isOutcomePackLaunchReady(preview) ? t('actions.ready') : t('actions.blocked')}</span>
                          </div>
                          <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={() => void launch()}
                            disabled={!isOutcomePackLaunchReady(preview) || preparing || launching}
                          >
                            {launching ? <Loader2 size={16} className={styles.spin} aria-hidden /> : <Play size={15} aria-hidden />}
                            {launching ? t('actions.launching') : t('actions.launch')}
                          </button>
                        </footer>
                      </aside>
                    </form>
                  )}
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
