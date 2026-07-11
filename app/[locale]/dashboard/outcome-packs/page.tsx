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
  Play,
  Radar,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Sparkles,
  TimerOff,
  Wrench,
  XCircle,
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import {
  createOutcomePackIdempotencyKey,
  isOutcomePackLaunchReady,
  normalizeOutcomePack,
  normalizeOutcomePackList,
  normalizeOutcomePackPreparation,
  outcomePackSetupTab,
  validateOutcomePackInputs,
  type OutcomePackModel,
  type OutcomePackPreparationModel,
} from '@/lib/outcome-packs';
import { useToast } from '@/components/ui/ToastProvider';
import styles from './outcome-packs.module.css';

const PACK_ICONS: Record<string, LucideIcon> = {
  'research-report-v1': FileSearch,
  'pr-review-v1': GitPullRequest,
  'competitor-watch-v1': Radar,
  'launch-content-v1': Megaphone,
};

function compactNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

function initializeInputs(pack: OutcomePackModel): Record<string, string> {
  return Object.fromEntries(pack.inputFields.map((field) => [field.key, '']));
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
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<OutcomePackPreparationModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRevision, setDetailRevision] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );

  const resetPreparedState = useCallback(() => {
    setPreview(null);
    setActionError(null);
    launchKeyRef.current = null;
  }, []);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [agentsResult, packsResult] = await Promise.all([
      api.getMyAgents(),
      api.getOutcomePacks(),
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

    const nextPacks = normalizeOutcomePackList(packsResult.data);
    setAgents(agentsResult.data);
    setPacks(nextPacks);
    setDetailRevision((current) => current + 1);
    setSelectedAgentId((current) => current || agentsResult.data[0]?.id || '');
    setSelectedPackId((current) =>
      current && nextPacks.some((item) => item.id === current)
        ? current
        : nextPacks[0]?.id ?? null,
    );
  }, []);

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
      const nextPack = normalizeOutcomePack(result.data.pack);
      setPack(nextPack);
      setInputs(initializeInputs(nextPack));
      setFieldErrors({});
      setPreview(null);
      launchKeyRef.current = null;
    });
    return () => { cancelled = true; };
  }, [detailRevision, isAuthenticated, selectedPackId]);

  const selectPack = useCallback((packId: string) => {
    if (packId === selectedPackId) return;
    setSelectedPackId(packId);
    setPack(null);
    setPreview(null);
    setFieldErrors({});
    setActionError(null);
    launchKeyRef.current = null;
  }, [selectedPackId]);

  const updateInput = useCallback((fieldId: string, value: string) => {
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
      inputs: Object.fromEntries(
        Object.entries(inputs).map(([key, value]) => [key, value.trim()]),
      ),
    });
    setPreparing(false);
    if (!result.success) {
      setActionError(result.error);
      return;
    }
    setPreview(normalizeOutcomePackPreparation(result.data));
    launchKeyRef.current = createOutcomePackIdempotencyKey();
  }, [inputs, pack, selectedAgentId, t]);

  const launch = useCallback(async () => {
    if (!pack || !selectedAgentId || !isOutcomePackLaunchReady(preview)) return;
    const idempotencyKey = launchKeyRef.current ?? createOutcomePackIdempotencyKey();
    launchKeyRef.current = idempotencyKey;
    setLaunching(true);
    setActionError(null);
    const result = await api.launchOutcomePack(pack.id, {
      agentId: selectedAgentId,
      inputs: Object.fromEntries(
        Object.entries(inputs).map(([key, value]) => [key, value.trim()]),
      ),
      idempotencyKey,
      activateSchedules: false,
    });
    setLaunching(false);
    if (!result.success) {
      setActionError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(t('messages.launched'));
    router.push(`/dashboard/missions?task=${encodeURIComponent(result.data.task.id)}`);
  }, [inputs, pack, preview, router, selectedAgentId, t, toast]);

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
              href="/dashboard/missions"
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
                            onChange={(event) => {
                              setSelectedAgentId(event.target.value);
                              resetPreparedState();
                            }}
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
                          return (
                            <label className={styles.field} data-error={hasError || undefined} key={field.key} htmlFor={fieldId}>
                              <span>
                                {field.label}
                                {field.required ? <em>{t('configure.required')}</em> : null}
                              </span>
                              {field.type === 'textarea' ? (
                                <textarea
                                  id={fieldId}
                                  value={inputs[field.key] ?? ''}
                                  onChange={(event) => updateInput(field.key, event.target.value)}
                                  rows={5}
                                  maxLength={field.maxLength ?? undefined}
                                  aria-invalid={hasError}
                                  required={field.required}
                                />
                              ) : field.type === 'select' ? (
                                <select
                                  id={fieldId}
                                  value={inputs[field.key] ?? ''}
                                  onChange={(event) => updateInput(field.key, event.target.value)}
                                  aria-invalid={hasError}
                                  required={field.required}
                                >
                                  <option value="">{t('configure.selectPlaceholder')}</option>
                                  {field.options.map((option) => <option value={option} key={option}>{option}</option>)}
                                </select>
                              ) : (
                                <input
                                  id={fieldId}
                                  value={inputs[field.key] ?? ''}
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
                                  <strong>{item.label}</strong>
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
                                    <li key={`warning-${index}`}>{warning}</li>
                                  ))}
                                </ul>
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
                                <h4><TimerOff size={15} aria-hidden /> {t('preview.schedules')}</h4>
                                <div className={styles.scheduleList}>
                                  {preview.schedules.map((schedule) => (
                                    <label key={schedule.id}>
                                      <input type="checkbox" checked={false} disabled readOnly />
                                      <span className={styles.switch} aria-hidden><span /></span>
                                      <span>
                                        <strong>{schedule.label}</strong>
                                        <small>{[schedule.cron, schedule.timezone].filter(Boolean).join(' - ') || schedule.description}</small>
                                      </span>
                                      <em>{t('preview.scheduleOff')}</em>
                                    </label>
                                  ))}
                                </div>
                                <p className={styles.scheduleNotice}>{t('preview.scheduleNotice')}</p>
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
