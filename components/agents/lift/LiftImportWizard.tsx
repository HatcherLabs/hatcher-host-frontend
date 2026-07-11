'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  FileArchive,
  FileText,
  FolderLock,
  KeyRound,
  Loader2,
  PackageCheck,
  PlugZap,
  ShieldAlert,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { LiftImport, LiftReviewCandidate } from '@/lib/api';
import {
  buildLiftCommitBody,
  defaultLiftCandidateIds,
  formatLiftBytes,
  isValidLiftAgentName,
  normalizeLiftAgentName,
  validateLiftArchive,
  type LiftArchiveValidationError,
} from '@/lib/hatcher-lift';
import styles from './lift-import.module.css';

type WizardStage = 'upload' | 'analyzing' | 'loading' | 'review' | 'committing';

function displayFramework(framework: string): string {
  return framework === 'openclaw' ? 'OpenClaw' : framework === 'hermes' ? 'Hermes' : framework;
}

function reviewDefaults(liftImport: LiftImport) {
  return {
    selectedIds: new Set(defaultLiftCandidateIds(liftImport.review.candidates)),
    name: normalizeLiftAgentName(liftImport.review.profile.name, liftImport.sourceFramework),
    description: (liftImport.review.profile.description ?? '').slice(0, 140),
  };
}

function formatReviewDate(value: string, locale: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function candidateIcon(kind: LiftReviewCandidate['kind']) {
  if (kind === 'profile') return Bot;
  if (kind === 'memory') return FileText;
  return PackageCheck;
}

export function LiftImportWizard({ initialImportId }: { initialImportId?: string }) {
  const t = useTranslations('dashboard.lift');
  const locale = useLocale();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const hydratedImportId = useRef<string | null>(null);

  const [stage, setStage] = useState<WizardStage>(initialImportId ? 'loading' : 'upload');
  const [file, setFile] = useState<File | null>(null);
  const [liftImport, setLiftImport] = useState<LiftImport | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<LiftArchiveValidationError | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !initialImportId) return;
    if (hydratedImportId.current === initialImportId) return;
    hydratedImportId.current = initialImportId;
    let active = true;

    setStage('loading');
    setError(null);
    void api.getLiftImport(initialImportId).then((response) => {
      if (!active) return;
      if (!response.success) {
        setError(response.error || t('errors.load'));
        setStage('upload');
        return;
      }
      if (response.data.status === 'committed' && response.data.createdAgentId) {
        router.replace(`/dashboard/agent/${response.data.createdAgentId}`);
        return;
      }
      const defaults = reviewDefaults(response.data);
      setLiftImport(response.data);
      setSelectedIds(defaults.selectedIds);
      setName(defaults.name);
      setDescription(defaults.description);
      setStage('review');
    });

    return () => {
      active = false;
    };
  }, [authLoading, initialImportId, isAuthenticated, router, t]);

  const eligibleCandidates = useMemo(
    () => liftImport?.review.candidates.filter((candidate) => candidate.eligible) ?? [],
    [liftImport],
  );
  const blockedCandidates = useMemo(
    () => liftImport?.review.candidates.filter((candidate) => !candidate.eligible) ?? [],
    [liftImport],
  );
  const selectedCount = useMemo(
    () => eligibleCandidates.reduce((count, candidate) => count + Number(selectedIds.has(candidate.id)), 0),
    [eligibleCandidates, selectedIds],
  );
  const nameIsValid = isValidLiftAgentName(name);
  const isBusy = stage === 'analyzing' || stage === 'loading' || stage === 'committing' || cancelling;

  function selectFile(nextFile: File | null) {
    setError(null);
    setFileError(null);
    if (!nextFile) {
      setFile(null);
      return;
    }
    const validationError = validateLiftArchive(nextFile);
    if (validationError) {
      setFile(null);
      setFileError(validationError);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setFile(nextFile);
  }

  async function analyzeArchive() {
    if (!file || isBusy) return;
    const validationError = validateLiftArchive(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    setStage('analyzing');
    setError(null);
    const response = await api.analyzeLiftImport(file);
    if (!response.success) {
      setError(response.error || t('errors.analyze'));
      setStage('upload');
      return;
    }

    const defaults = reviewDefaults(response.data);
    hydratedImportId.current = response.data.id;
    setLiftImport(response.data);
    setSelectedIds(defaults.selectedIds);
    setName(defaults.name);
    setDescription(defaults.description);
    setConfirmed(false);
    setStage('review');
    router.replace(`/dashboard/agents/import?importId=${encodeURIComponent(response.data.id)}`, { scroll: false });
  }

  function toggleCandidate(candidateId: string) {
    setConfirmed(false);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  }

  async function cancelImport() {
    if (isBusy) return;
    if (!liftImport) {
      router.push('/dashboard/agents');
      return;
    }

    setCancelling(true);
    setError(null);
    const response = await api.deleteLiftImport(liftImport.id);
    setCancelling(false);
    if (!response.success) {
      setError(response.error || t('errors.cancel'));
      return;
    }
    router.push('/dashboard/agents');
  }

  async function commitImport() {
    if (!liftImport || !confirmed || !nameIsValid || isBusy) return;
    setStage('committing');
    setError(null);
    const response = await api.commitLiftImport(liftImport.id, buildLiftCommitBody({
      candidates: liftImport.review.candidates,
      selectedIds,
      name,
      description,
    }));
    if (!response.success) {
      setError(response.error || t('errors.commit'));
      setStage('review');
      return;
    }
    router.push(`/dashboard/agent/${response.data.agent.id}`);
  }

  const currentStep = stage === 'upload' || stage === 'analyzing' || stage === 'loading'
    ? 0
    : stage === 'review'
      ? 1
      : 2;

  return (
    <main className={styles.page} data-stage={stage}>
      <div className={styles.inner}>
        <header className={styles.pageHeader}>
          <div>
            <span className={styles.eyebrow}>{t('eyebrow')}</span>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </div>
          <Link href="/dashboard/agents" className={styles.secondaryButton}>
            <ArrowLeft size={15} aria-hidden />
            {t('backToAgents')}
          </Link>
        </header>

        <ol className={styles.steps} aria-label={t('steps.label')}>
          {(['upload', 'review', 'create'] as const).map((step, index) => (
            <li key={step} className={index <= currentStep ? styles.stepActive : ''} aria-current={index === currentStep ? 'step' : undefined}>
              <span>{index < currentStep ? <Check size={13} aria-hidden /> : index + 1}</span>
              {t(`steps.${step}`)}
            </li>
          ))}
        </ol>

        {error ? (
          <div className={styles.errorBanner} role="alert">
            <AlertCircle size={17} aria-hidden />
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss" title="Dismiss">
              <X size={15} aria-hidden />
            </button>
          </div>
        ) : null}

        {authLoading ? (
          <section className={styles.statePanel} aria-live="polite">
            <Loader2 className={styles.spin} size={24} aria-hidden />
          </section>
        ) : !isAuthenticated ? (
          <section className={styles.statePanel}>
            <Bot size={28} aria-hidden />
            <h2>{t('signInTitle')}</h2>
            <p>{t('signInBody')}</p>
            <Link href="/login" className={styles.primaryButton}>{t('signIn')}</Link>
          </section>
        ) : stage === 'loading' ? (
          <section className={styles.statePanel} aria-live="polite">
            <Loader2 className={styles.spin} size={28} aria-hidden />
            <h2>{t('loading.title')}</h2>
            <p>{t('loading.body')}</p>
          </section>
        ) : stage === 'upload' || stage === 'analyzing' ? (
          <section className={styles.uploadPanel} aria-labelledby="lift-upload-title">
            <div className={styles.uploadIntro}>
              <span className={styles.sectionIcon}><FileArchive size={20} aria-hidden /></span>
              <div>
                <h2 id="lift-upload-title">{t('upload.title')}</h2>
                <p>{t('upload.body')}</p>
              </div>
            </div>

            <div className={styles.uploadControl}>
              <input
                ref={inputRef}
                id="lift-archive"
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
                disabled={stage === 'analyzing'}
              />
              <label htmlFor="lift-archive" className={styles.fileButton}>
                <Upload size={16} aria-hidden />
                {file ? t('upload.replace') : t('upload.choose')}
              </label>
              <span className={styles.uploadHint}>{t('upload.hint')}</span>
            </div>

            {file ? (
              <div className={styles.selectedFile}>
                <FileArchive size={18} aria-hidden />
                <div>
                  <span>{t('upload.selected')}</span>
                  <strong>{file.name}</strong>
                </div>
                <code>{formatLiftBytes(file.size)}</code>
              </div>
            ) : null}
            {fileError ? <p className={styles.fieldError} role="alert">{t(`upload.errors.${fileError}`)}</p> : null}

            {stage === 'analyzing' ? (
              <div className={styles.analysisProgress} aria-live="polite">
                <div className={styles.progressTrack}><span /></div>
                <strong><Loader2 className={styles.spin} size={16} aria-hidden /> {t('upload.analyzing')}</strong>
                <p>{t('upload.analyzingBody')}</p>
              </div>
            ) : (
              <div className={styles.uploadActions}>
                <button type="button" className={styles.primaryButton} disabled={!file} onClick={() => void analyzeArchive()}>
                  <ShieldCheck size={16} aria-hidden />
                  {t('upload.analyze')}
                </button>
              </div>
            )}
          </section>
        ) : liftImport ? (
          <>
            <section className={styles.reviewHeader}>
              <div>
                <h2>{t('review.title')}</h2>
                <p>{t('review.body')}</p>
              </div>
              <span>{t('review.expires', { date: formatReviewDate(liftImport.expiresAt, locale) })}</span>
            </section>

            <section className={styles.summaryStrip} aria-label={t('review.title')}>
              <div><span>{t('review.archive')}</span><strong title={liftImport.sourceFilename}>{liftImport.sourceFilename}</strong></div>
              <div><span>{t('review.framework')}</span><strong>{displayFramework(liftImport.sourceFramework)}</strong></div>
              <div><span>{t('review.files')}</span><strong>{liftImport.archiveSummary.fileCount}</strong></div>
              <div><span>{t('review.expanded')}</span><strong>{formatLiftBytes(liftImport.archiveSummary.expandedBytes)}</strong></div>
            </section>

            <div className={styles.reviewWorkspace}>
              <div className={styles.reviewMain}>
                <section className={styles.workspaceSection}>
                  <div className={styles.sectionHeading}>
                    <span className={styles.sectionIcon}><Bot size={18} aria-hidden /></span>
                    <div><h3>{t('profile.title')}</h3></div>
                  </div>
                  <dl className={styles.profileGrid}>
                    <div><dt>{t('profile.name')}</dt><dd>{liftImport.review.profile.name || t('profile.notFound')}</dd></div>
                    <div><dt>{t('profile.description')}</dt><dd>{liftImport.review.profile.description || t('profile.notFound')}</dd></div>
                  </dl>
                  {liftImport.review.profile.systemPromptPreview ? (
                    <div className={styles.promptPreview}>
                      <span>{t('profile.systemPrompt')}</span>
                      <pre>{liftImport.review.profile.systemPromptPreview}</pre>
                    </div>
                  ) : null}
                </section>

                <section className={styles.workspaceSection}>
                  <div className={styles.sectionHeadingSplit}>
                    <div className={styles.sectionHeading}>
                      <span className={styles.sectionIcon}><PackageCheck size={18} aria-hidden /></span>
                      <div><h3>{t('selection.title')}</h3><p>{t('selection.body')}</p></div>
                    </div>
                    <strong className={styles.selectionCount}>{t('selection.selected', { selected: selectedCount, total: eligibleCandidates.length })}</strong>
                  </div>

                  {eligibleCandidates.length === 0 ? (
                    <p className={styles.emptyInline}>{t('selection.none')}</p>
                  ) : (
                    <div className={styles.candidateList}>
                      {eligibleCandidates.map((candidate) => {
                        const CandidateIcon = candidateIcon(candidate.kind);
                        const checked = selectedIds.has(candidate.id);
                        return (
                          <label className={styles.candidateRow} key={candidate.id}>
                            <input type="checkbox" checked={checked} onChange={() => toggleCandidate(candidate.id)} disabled={stage === 'committing'} />
                            <span className={styles.checkbox} aria-hidden>{checked ? <Check size={13} /> : null}</span>
                            <CandidateIcon size={17} aria-hidden />
                            <span className={styles.candidateMain}>
                              <strong>{t(`selection.${candidate.kind}`)}</strong>
                              <code>{candidate.sourcePath}</code>
                              <small>{t('selection.target')}: {candidate.targetPath}</small>
                            </span>
                            <span className={styles.fileSize}>{formatLiftBytes(candidate.sizeBytes)}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {blockedCandidates.length > 0 ? (
                    <div className={styles.blockedGroup}>
                      <div><h4>{t('selection.blockedTitle')}</h4><p>{t('selection.blockedBody')}</p></div>
                      <div className={styles.blockedList}>
                        {blockedCandidates.map((candidate) => (
                          <div key={candidate.id} className={styles.blockedRow}>
                            <FolderLock size={16} aria-hidden />
                            <code>{candidate.sourcePath}</code>
                            <span>{t(`selection.blockedReasons.${candidate.blockedReason ?? 'unknown'}`)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className={styles.workspaceSection}>
                  <div className={styles.sectionHeading}>
                    <span className={styles.sectionIcon}><Bot size={18} aria-hidden /></span>
                    <div><h3>{t('identity.title')}</h3><p>{t('identity.body')}</p></div>
                  </div>
                  <div className={styles.identityFields}>
                    <label>
                      <span>{t('identity.name')}</span>
                      <input value={name} onChange={(event) => { setName(event.target.value); setConfirmed(false); }} maxLength={50} aria-invalid={!nameIsValid} />
                      {!nameIsValid ? <small className={styles.fieldError}>{t('identity.nameError')}</small> : null}
                    </label>
                    <label>
                      <span>{t('identity.description')} <small>{t('identity.descriptionOptional')}</small></span>
                      <textarea value={description} onChange={(event) => { setDescription(event.target.value); setConfirmed(false); }} maxLength={140} rows={3} />
                      <small className={styles.characterCount}>{description.length}/140</small>
                    </label>
                  </div>
                  <p className={styles.pausedNotice}><CheckCircle2 size={16} aria-hidden /> {t('identity.pausedNotice')}</p>
                </section>
              </div>

              <aside className={styles.reviewAside}>
                <section className={styles.asideSection}>
                  <div className={styles.sectionHeading}>
                    <span className={styles.sectionIcon}><ShieldAlert size={18} aria-hidden /></span>
                    <div><h3>{t('security.title')}</h3></div>
                  </div>
                  <p>{liftImport.secretFindings.length === 0
                    ? t('security.safe')
                    : t(liftImport.secretFindings.length === 1 ? 'security.found' : 'security.foundPlural', { count: liftImport.secretFindings.length })}</p>
                  <p>{t('security.body')}</p>
                  <div className={styles.safetyNotice}><ShieldCheck size={15} aria-hidden /> {t('security.valuesNotImported')}</div>
                  {liftImport.secretFindings.length > 0 ? (
                    <div className={styles.findingsList}>
                      {liftImport.secretFindings.map((finding, index) => (
                        <div className={styles.finding} key={`${finding.fingerprint}-${index}`}>
                          <strong><KeyRound size={13} aria-hidden /> {finding.key}</strong>
                          <span>{finding.kind}</span>
                          <code>{t('security.pathLine', { path: finding.path, line: finding.line })}</code>
                          <small>{t('security.fingerprint')}</small>
                          <code>{finding.fingerprint}</code>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>

                <section className={styles.asideSection}>
                  <div className={styles.sectionHeading}>
                    <span className={styles.sectionIcon}><PlugZap size={18} aria-hidden /></span>
                    <div><h3>{t('environment.title')}</h3></div>
                  </div>
                  <p>{t('environment.body')}</p>
                  <div className={styles.safetyNotice}><ShieldCheck size={15} aria-hidden /> {t('environment.notice')}</div>
                  {liftImport.review.environmentKeys.detected.length === 0 ? (
                    <p>{t('environment.none')}</p>
                  ) : (
                    <div className={styles.keyGroups}>
                      {(['detected', 'allowed', 'blocked'] as const).map((group) => liftImport.review.environmentKeys[group].length > 0 ? (
                        <div key={group}>
                          <span>{t(`environment.${group}`)}</span>
                          <div>{liftImport.review.environmentKeys[group].map((key) => <code key={`${group}-${key}`}>{key}</code>)}</div>
                        </div>
                      ) : null)}
                    </div>
                  )}
                </section>

                {liftImport.review.ignoredPaths.length > 0 ? (
                  <section className={styles.asideSection}>
                    <div className={styles.sectionHeading}>
                      <span className={styles.sectionIcon}><FolderLock size={18} aria-hidden /></span>
                      <div><h3>{t('ignored.title')}</h3></div>
                    </div>
                    <p>{t('ignored.body')}</p>
                    <div className={styles.ignoredPaths}>
                      {liftImport.review.ignoredPaths.slice(0, 8).map((path) => <code key={path}>{path}</code>)}
                      {liftImport.review.ignoredPaths.length > 8 ? <span>{t('ignored.more', { count: liftImport.review.ignoredPaths.length - 8 })}</span> : null}
                    </div>
                  </section>
                ) : null}
              </aside>
            </div>

            <section className={styles.commitBar}>
              <label className={styles.confirmCheck}>
                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={stage === 'committing'} />
                <span className={styles.checkbox} aria-hidden>{confirmed ? <Check size={13} /> : null}</span>
                <span>{t('confirm.label')}</span>
              </label>
              <div className={styles.commitActions}>
                <button type="button" className={styles.dangerButton} onClick={() => void cancelImport()} disabled={isBusy}>
                  {cancelling ? <Loader2 size={15} className={styles.spin} aria-hidden /> : <X size={15} aria-hidden />}
                  {cancelling ? t('cancelling') : t('cancel')}
                </button>
                <button type="button" className={styles.primaryButton} onClick={() => void commitImport()} disabled={!confirmed || !nameIsValid || isBusy}>
                  {stage === 'committing' ? <Loader2 size={15} className={styles.spin} aria-hidden /> : <PackageCheck size={15} aria-hidden />}
                  {stage === 'committing' ? t('confirm.creating') : t('confirm.create')}
                </button>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
