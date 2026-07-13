'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Coins,
  ExternalLink,
  FileText,
  Gauge,
  ListChecks,
  Loader2,
  Paperclip,
  PackageCheck,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Square,
  X,
  XCircle,
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Agent, MissionTask, MissionTaskStatus, MissionTaskSummary } from '@/lib/api';
import {
  MISSION_TASK_STATUSES,
  canApproveMissionTask,
  canCancelMissionTask,
  canResumeMissionTask,
  canStartMissionTask,
  missionOutputText,
  missionTaskEvidence,
  missionTaskProgress,
  normalizeMissionTask,
  normalizeMissionTaskList,
  safeMissionArtifactUrl,
} from '@/lib/mission-control';
import { normalizeOutcomePackAcceptanceChecks, outcomePackCopySlug } from '@/lib/outcome-packs';
import { useToast } from '@/components/ui/ToastProvider';
import { agentWorkspaceHref, requestedOwnedAgentId } from '@/lib/agent-workspace';
import styles from './missions.module.css';

type StatusFilter = 'all' | MissionTaskStatus;

interface CreateTaskForm {
  agentId: string;
  title: string;
  prompt: string;
  budgetCredits: string;
  requiresApproval: boolean;
}

type MissionActionResponse = Promise<
  | { success: true; data: { task: MissionTask } }
  | { success: false; error: string; code?: string }
>;

const EMPTY_FORM: CreateTaskForm = {
  agentId: '',
  title: '',
  prompt: '',
  budgetCredits: '',
  requiresApproval: false,
};

const EMPTY_SUMMARY: MissionTaskSummary = {
  total: 0,
  active: 0,
  awaitingApproval: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
};

function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function compactNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

function TaskStatus({ status, label }: { status: MissionTaskStatus; label: string }) {
  const Icon = status === 'completed'
    ? CheckCircle2
    : status === 'failed' || status === 'rejected'
      ? XCircle
      : status === 'running'
        ? Activity
        : status === 'pending_approval' || status === 'pending_review'
          ? ShieldCheck
          : status === 'cancelled'
            ? Square
            : CircleDashed;

  return (
    <span className={styles.status} data-status={status}>
      <Icon size={12} aria-hidden />
      {label}
    </span>
  );
}

function SummaryStrip({ summary }: { summary: MissionTaskSummary }) {
  const t = useTranslations('missionControl');
  const items = [
    { key: 'total', value: summary.total, icon: ListChecks },
    { key: 'active', value: summary.active, icon: Activity },
    { key: 'approval', value: summary.awaitingApproval, icon: ShieldCheck },
    { key: 'completed', value: summary.completed, icon: CheckCircle2 },
    { key: 'failed', value: summary.failed, icon: AlertTriangle },
  ] as const;

  return (
    <section className={styles.summary} aria-label={t('summary.label')}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div className={styles.summaryItem} key={item.key}>
            <Icon size={15} aria-hidden />
            <span className={styles.summaryLabel}>{t(`summary.${item.key}`)}</span>
            <strong>{item.value}</strong>
          </div>
        );
      })}
    </section>
  );
}

function CreateTaskDialog({
  agents,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  agents: Agent[];
  form: CreateTaskForm;
  saving: boolean;
  onChange: (next: CreateTaskForm) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const t = useTranslations('missionControl');

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) onClose();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose, saving]);

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="new-task-title">
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.eyebrow}>{t('create.eyebrow')}</span>
            <h2 id="new-task-title">{t('create.title')}</h2>
            <p>{t('create.subtitle')}</p>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            disabled={saving}
            aria-label={t('create.close')}
            title={t('create.close')}
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.field}>
            <span>{t('create.agent')}</span>
            <select
              value={form.agentId}
              onChange={(event) => onChange({ ...form, agentId: event.target.value })}
              required
              autoFocus
            >
              <option value="">{t('create.agentPlaceholder')}</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} - {agent.framework}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>{t('create.taskTitle')}</span>
            <input
              value={form.title}
              onChange={(event) => onChange({ ...form, title: event.target.value })}
              placeholder={t('create.titlePlaceholder')}
              maxLength={160}
              required
            />
          </label>

          <label className={styles.field}>
            <span>{t('create.objective')}</span>
            <textarea
              value={form.prompt}
              onChange={(event) => onChange({ ...form, prompt: event.target.value })}
              placeholder={t('create.objectivePlaceholder')}
              rows={7}
              required
            />
            <small>{t('create.objectiveHint')}</small>
          </label>

          <label className={styles.field}>
            <span>{t('create.budget')}</span>
            <div className={styles.inputWithIcon}>
              <Coins size={15} aria-hidden />
              <input
                value={form.budgetCredits}
                onChange={(event) => onChange({ ...form, budgetCredits: event.target.value })}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder={t('create.budgetPlaceholder')}
              />
            </div>
            <small>{t('create.budgetHint')}</small>
          </label>

          <label className={styles.approvalToggle}>
            <input
              type="checkbox"
              checked={form.requiresApproval}
              onChange={(event) => onChange({ ...form, requiresApproval: event.target.checked })}
            />
            <span className={styles.toggleTrack} aria-hidden><span /></span>
            <span>
              <strong>{t('create.approval')}</strong>
              <small>{t('create.approvalHint')}</small>
            </span>
          </label>

          <footer className={styles.modalFooter}>
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={saving}>
              {t('actions.close')}
            </button>
            <button type="submit" className={styles.primaryButton} disabled={saving || agents.length === 0}>
              {saving ? <Loader2 size={15} className={styles.spin} aria-hidden /> : <Plus size={15} aria-hidden />}
              {saving ? t('create.creating') : t('create.submit')}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function TaskDetail({
  task,
  locale,
  actionKey,
  onAction,
}: {
  task: MissionTask;
  locale: string;
  actionKey: string | null;
  onAction: (key: string, run: () => MissionActionResponse) => void;
}) {
  const t = useTranslations('missionControl');
  const packT = useTranslations('outcomePacks');
  const progress = missionTaskProgress(task);
  const evidence = missionTaskEvidence(task);
  const output = missionOutputText(task.latestRun?.output);
  const runningAction = actionKey?.startsWith(`${task.id}:`) ?? false;
  const skillReadiness = task.outcomePackSkillReadiness;
  const evidenceText = (key: string, fallback: string): string => (
    t.has(`evidence.${key}`) ? t(`evidence.${key}`) : fallback
  );
  const acceptanceChecks = normalizeOutcomePackAcceptanceChecks(task.acceptanceChecks);
  const packSlug = task.sourceId ? outcomePackCopySlug(task.sourceId) : null;
  const packBase = packSlug ? `content.packs.${packSlug}` : null;
  const translatedPackValue = (suffix: string, fallback: string): string => {
    const key = packBase ? `${packBase}.${suffix}` : null;
    return key && packT.has(key) ? packT(key) : fallback;
  };
  const displayTitle = task.source === 'outcome_pack'
    ? translatedPackValue('taskTitle', task.title)
    : task.title;
  const displayDescription = task.source === 'outcome_pack' && task.description
    ? translatedPackValue('taskDescription', task.description)
    : task.description;

  const acceptanceLabel = (item: (typeof acceptanceChecks)[number]): string => {
    if (item.type === 'all_tasks_completed') return t('outcomePack.allTasksCompleted');
    if (item.type === 'artifact_required') {
      const kindKey = item.artifactKind ? `content.artifactKinds.${item.artifactKind}` : null;
      const kind = kindKey && packT.has(kindKey)
        ? packT(kindKey)
        : item.artifactKind ?? t('outcomePack.artifact');
      return t('outcomePack.artifactRequired', { kind });
    }
    if (item.type === 'output_min_length') {
      return t('outcomePack.outputMinLength', { count: item.characters ?? 0 });
    }
    return item.type === 'manual'
      ? translatedPackValue('manualAcceptance', item.label)
      : item.label;
  };
  const skillStatusLabel = (status: string): string => {
    if (status === 'installed') return t('outcomePack.skillStatus.installed');
    if (status === 'pending' || status === 'pending_restart') return t('outcomePack.skillStatus.pending');
    if (status === 'failed') return t('outcomePack.skillStatus.failed');
    return t('outcomePack.skillStatus.missing');
  };

  return (
    <article className={styles.detail} aria-labelledby={`task-title-${task.id}`}>
      <header className={styles.detailHeader}>
        <div className={styles.detailTitleBlock}>
          <div className={styles.detailMetaTop}>
            <TaskStatus status={task.status} label={t(`status.${task.status}`)} />
            <span>{task.agent?.name ?? t('unknownAgent')}</span>
            <span>{t('attempt', { count: task.latestRun?.attempt ?? 0 })}</span>
          </div>
          <h2 id={`task-title-${task.id}`}>{displayTitle}</h2>
          {displayDescription ? <p>{displayDescription}</p> : null}
        </div>

        <div className={styles.actions} aria-label={t('actions.label')}>
          {canApproveMissionTask(task) ? (
            <>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={runningAction}
                onClick={() => onAction('approve', () => api.approveMissionTask(task.agentId, task.id))}
              >
                <Check size={15} aria-hidden /> {t('actions.approve')}
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                disabled={runningAction}
                onClick={() => onAction('reject', () => api.rejectMissionTask(task.agentId, task.id))}
              >
                <X size={15} aria-hidden /> {t('actions.reject')}
              </button>
            </>
          ) : null}
          {canStartMissionTask(task) ? (
            <button
              type="button"
              className={styles.primaryButton}
              disabled={runningAction}
              onClick={() => onAction('start', () => api.startMissionTask(task.agentId, task.id))}
            >
              <Play size={15} aria-hidden /> {t('actions.start')}
            </button>
          ) : null}
          {canCancelMissionTask(task) && task.latestRun ? (
            <button
              type="button"
              className={styles.dangerButton}
              disabled={runningAction}
              onClick={() => onAction(
                'cancel',
                () => api.cancelMissionTaskRun(task.agentId, task.id, task.latestRun!.id),
              )}
            >
              <Square size={14} aria-hidden /> {t('actions.cancel')}
            </button>
          ) : null}
          {canResumeMissionTask(task) ? (
            <button
              type="button"
              className={styles.primaryButton}
              disabled={runningAction}
              title={t('actions.resumeHint')}
              onClick={() => onAction('resume', () => api.resumeMissionTask(task.agentId, task.id))}
            >
              <RotateCcw size={15} aria-hidden /> {t('actions.resume')}
            </button>
          ) : null}
          {runningAction ? <Loader2 size={16} className={styles.spin} aria-label={t('actions.working')} /> : null}
        </div>
      </header>

      {task.source === 'outcome_pack' ? (
        <section className={styles.outcomePackBand} data-ready={skillReadiness?.ready || undefined}>
          <div className={styles.outcomePackHeading}>
            <PackageCheck size={17} aria-hidden />
            <div>
              <strong>{t('outcomePack.title')}</strong>
              <span>
                {packBase ? translatedPackValue('title', task.sourceId ?? t('outcomePack.unknown')) : task.sourceId ?? t('outcomePack.unknown')}
                {task.sourceVersion ? ` - ${t('outcomePack.version', { version: task.sourceVersion })}` : ''}
              </span>
            </div>
          </div>

          {skillReadiness?.required ? (
            <div className={styles.outcomeSkills}>
              <div className={styles.outcomeSkillSummary}>
                {skillReadiness.ready ? <CheckCircle2 size={15} aria-hidden /> : <AlertTriangle size={15} aria-hidden />}
                <strong>{skillReadiness.ready ? t('outcomePack.skillsReady') : t('outcomePack.skillsPending')}</strong>
              </div>
              <div className={styles.outcomeSkillList}>
                {skillReadiness.skills.map((skill) => (
                  <span key={skill.name} data-installed={skill.installed || undefined}>
                    {skill.name}: {skillStatusLabel(skill.status)}
                  </span>
                ))}
              </div>
              {!skillReadiness.ready ? (
                <Link href={`/dashboard/agent/${task.agentId}?tab=plugins`} className={styles.outcomeSetupLink}>
                  <Settings2 size={14} aria-hidden /> {t('outcomePack.openPlugins')}
                </Link>
              ) : null}
            </div>
          ) : null}

          {acceptanceChecks.length > 0 ? (
            <div className={styles.outcomeAcceptance}>
              <strong>{t('outcomePack.acceptance')}</strong>
              <ul>
                {acceptanceChecks.map((item) => <li key={item.id}>{acceptanceLabel(item)}</li>)}
              </ul>
            </div>
          ) : null}

          {task.scheduleTemplates.length > 0 ? (
            <p className={styles.outcomeScheduleNotice}>
              <Clock3 size={13} aria-hidden /> {t('outcomePack.schedulesDisabled', { count: task.scheduleTemplates.length })}
            </p>
          ) : null}
        </section>
      ) : null}

      <dl className={styles.facts}>
        <div><dt>{t('facts.created')}</dt><dd>{formatDate(task.createdAt, locale)}</dd></div>
        <div><dt>{t('facts.updated')}</dt><dd>{formatDate(task.updatedAt, locale)}</dd></div>
        <div><dt>{t('facts.budget')}</dt><dd>{task.budget.aiCredits === null ? t('noTarget') : compactNumber(task.budget.aiCredits, locale)}</dd></div>
        <div><dt>{t('facts.cost')}</dt><dd>{task.cost.aiCredits === null ? t('notMeasured') : compactNumber(task.cost.aiCredits, locale)}</dd></div>
        <div>
          <dt>{t('facts.approval')}</dt>
          <dd>{task.requiresApproval || task.reviewPolicy?.mode === 'manual_required' ? t('required') : t('notRequired')}</dd>
        </div>
        <div><dt>{t('facts.source')}</dt><dd>{task.source}</dd></div>
      </dl>

      <section className={styles.detailSection}>
        <div className={styles.sectionHeading}>
          <FileText size={15} aria-hidden />
          <h3>{t('sections.objective')}</h3>
        </div>
        <p className={styles.objective}>{task.prompt}</p>
      </section>

      <section className={styles.detailSection}>
        <div className={styles.sectionHeading}>
          <Gauge size={15} aria-hidden />
          <h3>{t.has('sections.evidence') ? t('sections.evidence') : 'Execution evidence'}</h3>
          <span>{evidenceText(task.cost.status, task.cost.status.replace('_', ' '))}</span>
        </div>
        <div className={styles.evidenceMetrics}>
          <div>
            <span>{evidenceText('budgetUsed', 'AI Credit budget used')}</span>
            <strong>
              {evidence.budget.limit === null
                ? evidenceText('noBudget', 'No hard limit')
                : `${compactNumber(evidence.budget.spent, locale)} / ${compactNumber(evidence.budget.limit, locale)}`}
            </strong>
          </div>
          <div>
            <span>{evidenceText('remaining', 'Credits remaining')}</span>
            <strong>{evidence.budget.remaining === null ? '-' : compactNumber(evidence.budget.remaining, locale)}</strong>
          </div>
          <div>
            <span>{evidenceText('tokens', 'Tokens')}</span>
            <strong>{compactNumber((task.latestRun?.inputTokens ?? 0) + (task.latestRun?.outputTokens ?? 0), locale)}</strong>
            <small>
              {t.has('evidence.inputOutput')
                ? t('evidence.inputOutput', {
                    input: compactNumber(task.latestRun?.inputTokens ?? 0, locale),
                    output: compactNumber(task.latestRun?.outputTokens ?? 0, locale),
                  })
                : `${compactNumber(task.latestRun?.inputTokens ?? 0, locale)} input / ${compactNumber(task.latestRun?.outputTokens ?? 0, locale)} output`}
            </small>
          </div>
          <div>
            <span>{evidenceText('providerCost', 'Provider cost')}</span>
            <strong>${(task.latestRun?.providerCostUsd ?? 0).toFixed(6)}</strong>
          </div>
        </div>
        {evidence.budget.percent !== null ? (
          <div className={styles.budgetEvidence} data-reached={evidence.budget.reached || undefined}>
            <div>
              <span>{evidence.budget.reached
                ? evidenceText('budgetReached', 'Budget reached - paid execution stopped')
                : evidenceText('withinBudget', 'Within budget')}</span>
              <strong>{Math.round(evidence.budget.percent)}%</strong>
            </div>
            <div
              className={styles.budgetTrack}
              role="progressbar"
              aria-label={evidenceText('budgetUsed', 'AI Credit budget used')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(evidence.budget.percent)}
            >
              <span style={{ width: `${evidence.budget.percent}%` }} />
            </div>
          </div>
        ) : null}
        <div className={styles.acceptanceEvidence} data-status={evidence.acceptance.status}>
          <div>
            <ShieldCheck size={15} aria-hidden />
            <strong>{evidenceText('acceptance', 'Acceptance checks')}</strong>
            <span>{evidenceText(evidence.acceptance.status, evidence.acceptance.status.replace('_', ' '))}</span>
          </div>
          {evidence.acceptance.results.length > 0 ? (
            <ul>
              {evidence.acceptance.results.map((result, index) => (
                <li key={`${result.type}-${index}`} data-status={result.status}>
                  {result.status === 'passed' ? <CheckCircle2 size={14} aria-hidden /> : result.status === 'failed' ? <XCircle size={14} aria-hidden /> : <Clock3 size={14} aria-hidden />}
                  <span>{result.message}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className={styles.detailSection}>
        <div className={styles.sectionHeading}>
          <Activity size={15} aria-hidden />
          <h3>{t('sections.latestRun')}</h3>
          {task.latestRun ? <span>{t(`runStatus.${task.latestRun.status}`)}</span> : null}
        </div>
        {task.latestRun ? (
          <div className={styles.runBody}>
            <div className={styles.progressRow}>
              <div className={styles.progressTrack} role="progressbar" aria-label={t('progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.value ?? undefined}>
                <span
                  className={progress.value === null && task.status === 'running' ? styles.progressIndeterminate : ''}
                  style={progress.value === null ? undefined : { width: `${progress.value}%` }}
                />
              </div>
              <strong>{progress.value === null ? t('progressUnknown') : `${Math.round(progress.value)}%`}</strong>
            </div>
            {progress.message ? <p className={styles.progressMessage}>{progress.message}</p> : null}
            <div className={styles.runTimes}>
              <span><Clock3 size={13} aria-hidden /> {t('facts.started')}: {formatDate(task.latestRun.startedAt ?? task.latestRun.createdAt, locale)}</span>
              {task.latestRun.finishedAt ? <span>{t('facts.finished')}: {formatDate(task.latestRun.finishedAt, locale)}</span> : null}
            </div>
            {task.latestRun.error ? (
              <div className={styles.errorOutput}><AlertTriangle size={15} aria-hidden /><span>{task.latestRun.error}</span></div>
            ) : null}
            {output ? <pre className={styles.output}>{output}</pre> : (
              <p className={styles.muted}>{task.latestRun.error ? t('noOutput') : t('waitingForOutput')}</p>
            )}
          </div>
        ) : <p className={styles.muted}>{t('noRuns')}</p>}
      </section>

      <section className={styles.detailSection}>
        <div className={styles.sectionHeading}>
          <ShieldCheck size={15} aria-hidden />
          <h3>{t('sections.approvals')}</h3>
          <span>{task.approvals.length}</span>
        </div>
        {task.approvals.length > 0 ? (
          <div className={styles.timeline}>
            {task.approvals.map((approval) => (
              <div className={styles.timelineRow} key={approval.id}>
                <span className={styles.timelineIcon} data-status={approval.status}>
                  {approval.status === 'approved' ? <Check size={13} aria-hidden /> : approval.status === 'rejected' ? <X size={13} aria-hidden /> : <Clock3 size={13} aria-hidden />}
                </span>
                <div>
                  <strong>{t(`approvalStatus.${approval.status}`)}</strong>
                  <span>{formatDate(approval.decidedAt ?? approval.requestedAt, locale)}</span>
                  {approval.note ? <p>{approval.note}</p> : null}
                </div>
              </div>
            ))}
          </div>
        ) : <p className={styles.muted}>{t('noApprovals')}</p>}
      </section>

      <section className={styles.detailSection}>
        <div className={styles.sectionHeading}>
          <Paperclip size={15} aria-hidden />
          <h3>{t('sections.artifacts')}</h3>
          <span>{task.artifacts.length}</span>
        </div>
        {task.artifacts.length > 0 ? (
          <div className={styles.artifacts}>
            {task.artifacts.map((artifact) => {
              const artifactBody = missionOutputText(artifact.content);
              const artifactUrl = safeMissionArtifactUrl(artifact.url);
              return (
                <div className={styles.artifactRow} key={artifact.id}>
                  <FileText size={16} aria-hidden />
                  <div>
                    <strong>{artifact.name}</strong>
                    <span>{artifact.mediaType ?? artifact.kind} - {formatDate(artifact.createdAt, locale)}</span>
                    {!artifactUrl && artifactBody ? <code>{artifactBody.slice(0, 180)}</code> : null}
                  </div>
                  {artifactUrl ? (
                    <a href={artifactUrl} target="_blank" rel="noopener noreferrer" aria-label={t('openArtifact', { name: artifact.name })} title={t('openArtifact', { name: artifact.name })}>
                      <ExternalLink size={15} aria-hidden />
                    </a>
                  ) : artifact.path || artifact.url ? <code className={styles.artifactPath}>{artifact.path ?? artifact.url}</code> : null}
                </div>
              );
            })}
          </div>
        ) : <p className={styles.muted}>{t('noArtifacts')}</p>}
      </section>
    </article>
  );
}

export default function MissionControlPage() {
  const t = useTranslations('missionControl');
  const packT = useTranslations('outcomePacks');
  const locale = useLocale();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const requestedTaskConsumedRef = useRef(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<MissionTask[]>([]);
  const [summary, setSummary] = useState<MissionTaskSummary>(EMPTY_SUMMARY);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateTaskForm>(EMPTY_FORM);

  const taskDisplayTitle = useCallback((task: MissionTask): string => {
    if (task.source !== 'outcome_pack' || !task.sourceId) return task.title;
    const slug = outcomePackCopySlug(task.sourceId);
    const key = slug ? `content.packs.${slug}.taskTitle` : null;
    return key && packT.has(key) ? packT(key) : task.title;
  }, [packT]);

  const replaceTask = useCallback((next: MissionTask) => {
    setTasks((current) => {
      const found = current.some((task) => task.id === next.id);
      return found
        ? current.map((task) => task.id === next.id ? next : task)
        : [next, ...current];
    });
  }, []);

  const loadTasks = useCallback(async (quiet = false, scopedAgentId = agentFilter) => {
    if (!quiet) setRefreshing(true);
    const result = await api.getMissionTasks({
      limit: 100,
      ...(scopedAgentId !== 'all' ? { agentId: scopedAgentId } : {}),
    });
    if (!quiet) setRefreshing(false);
    if (!result.success) {
      if (!quiet) setError(result.error);
      return;
    }
    const model = normalizeMissionTaskList(result.data);
    setTasks(model.tasks);
    setSummary(model.summary);
    setSelectedId((current) => current && model.tasks.some((task) => task.id === current)
      ? current
      : model.tasks[0]?.id ?? null);
    setError(null);
  }, [agentFilter]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const agentsResult = await api.getMyAgents();
      if (cancelled) return;
      if (!agentsResult.success) {
        setLoading(false);
        setError(agentsResult.error);
        return;
      }
      setAgents(agentsResult.data);
      const search = window.location.search;
      const requestedAgentId = requestedOwnedAgentId(search, agentsResult.data);
      const initialAgentId = requestedAgentId ?? agentsResult.data[0]?.id ?? '';
      setForm((current) => ({ ...current, agentId: current.agentId || initialAgentId }));
      setAgentFilter(requestedAgentId ?? 'all');
      if (new URLSearchParams(search).get('create') === '1') setCreateOpen(true);
      const tasksResult = await api.getMissionTasks({
        limit: 100,
        ...(requestedAgentId ? { agentId: requestedAgentId } : {}),
      });
      if (cancelled) return;
      setLoading(false);
      if (!tasksResult.success) {
        setError(tasksResult.error);
        return;
      }
      const model = normalizeMissionTaskList(tasksResult.data);
      setTasks(model.tasks);
      setSummary(model.summary);
      const initialTasks = requestedAgentId
        ? model.tasks.filter((task) => task.agentId === requestedAgentId)
        : model.tasks;
      setSelectedId(initialTasks[0]?.id ?? null);
      setError(null);
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const updateAgentFilter = useCallback((nextAgentId: string) => {
    setAgentFilter(nextAgentId);
    if (nextAgentId !== 'all') {
      setForm((current) => ({ ...current, agentId: nextAgentId }));
    }
    const params = new URLSearchParams(window.location.search);
    params.delete('task');
    params.delete('create');
    if (nextAgentId === 'all') params.delete('agent');
    else params.set('agent', nextAgentId);
    const search = params.toString();
    router.replace(`/dashboard/missions${search ? `?${search}` : ''}`, { scroll: false });
    void loadTasks(false, nextAgentId);
  }, [loadTasks, router]);

  const closeCreateDialog = useCallback(() => {
    setCreateOpen(false);
    const params = new URLSearchParams(window.location.search);
    params.delete('create');
    const search = params.toString();
    router.replace(`/dashboard/missions${search ? `?${search}` : ''}`, { scroll: false });
  }, [router]);

  const hasActiveTasks = tasks.some((task) => task.status === 'queued' || task.status === 'running');
  useEffect(() => {
    if (!isAuthenticated || !hasActiveTasks) return;
    const timer = window.setInterval(() => { void loadTasks(true); }, 8000);
    return () => window.clearInterval(timer);
  }, [hasActiveTasks, isAuthenticated, loadTasks]);

  const filteredTasks = useMemo(() => tasks.filter((task) => (
    (agentFilter === 'all' || task.agentId === agentFilter) &&
    (statusFilter === 'all' || task.status === statusFilter)
  )), [agentFilter, statusFilter, tasks]);

  useEffect(() => {
    if (requestedTaskConsumedRef.current || tasks.length === 0) return;
    const requestedTaskId = new URLSearchParams(window.location.search).get('task');
    if (!requestedTaskId) {
      requestedTaskConsumedRef.current = true;
      return;
    }
    const requestedTask = tasks.find((task) => task.id === requestedTaskId);
    if (!requestedTask) return;
    requestedTaskConsumedRef.current = true;
    setAgentFilter(requestedTask.agentId);
    setStatusFilter('all');
    setSelectedId(requestedTaskId);
  }, [tasks]);

  useEffect(() => {
    if (filteredTasks.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredTasks.some((task) => task.id === selectedId)) {
      setSelectedId(filteredTasks[0].id);
    }
  }, [filteredTasks, selectedId]);

  const selectedTask = filteredTasks.find((task) => task.id === selectedId) ?? null;
  const selectedAgentId = selectedTask?.agentId;
  const selectedTaskId = selectedTask?.id;

  useEffect(() => {
    if (!selectedAgentId || !selectedTaskId) return;
    let cancelled = false;
    api.getMissionTask(selectedAgentId, selectedTaskId).then((result) => {
      if (!cancelled && result.success) replaceTask(normalizeMissionTask(result.data.task));
    });
    return () => { cancelled = true; };
  }, [selectedAgentId, selectedTaskId, replaceTask]);

  const handleAction = useCallback(async (key: string, run: () => MissionActionResponse) => {
    if (!selectedTask) return;
    const scopedKey = `${selectedTask.id}:${key}`;
    setActionKey(scopedKey);
    const result = await run();
    setActionKey(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    replaceTask(normalizeMissionTask(result.data.task));
    void loadTasks(true, selectedTask.agentId);
    toast.success(t(`messages.${key}`));
  }, [loadTasks, replaceTask, selectedTask, t, toast]);

  const handleCreate = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const budget = form.budgetCredits.trim() ? Number(form.budgetCredits) : undefined;
    if (!form.agentId || !form.title.trim() || !form.prompt.trim()) {
      toast.error(t('create.requiredError'));
      return;
    }
    if (budget !== undefined && (!Number.isFinite(budget) || budget <= 0)) {
      toast.error(t('create.budgetError'));
      return;
    }
    setCreating(true);
    const result = await api.createMissionTask(form.agentId, {
      title: form.title.trim(),
      prompt: form.prompt.trim(),
      requiresApproval: form.requiresApproval,
      budgetAiCredits: budget,
      source: 'manual',
    });
    setCreating(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    const task = normalizeMissionTask(result.data.task);
    replaceTask(task);
    setSelectedId(task.id);
    setAgentFilter(task.agentId);
    setStatusFilter('all');
    setCreateOpen(false);
    setForm({ ...EMPTY_FORM, agentId: form.agentId });
    const params = new URLSearchParams(window.location.search);
    params.delete('create');
    params.set('agent', task.agentId);
    params.set('task', task.id);
    router.replace(`/dashboard/missions?${params.toString()}`, { scroll: false });
    void loadTasks(true, task.agentId);
    toast.success(t('messages.created'));
  }, [form, loadTasks, replaceTask, router, t, toast]);

  if (authLoading) {
    return <div className={styles.gate}><Loader2 className={styles.spin} aria-hidden /><p>{t('authenticating')}</p></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.gate}>
        <ListChecks size={28} aria-hidden />
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
            <Link
              href={agentFilter === 'all'
                ? '/dashboard/outcome-packs'
                : agentWorkspaceHref('/dashboard/outcome-packs', agentFilter)}
              className={styles.secondaryButton}
            >
              <PackageCheck size={16} aria-hidden /> {t('outcomePacks')}
            </Link>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => void loadTasks(false)}
              disabled={refreshing}
              aria-label={t('refresh')}
              title={t('refresh')}
            >
              <RefreshCw size={17} className={refreshing ? styles.spin : ''} aria-hidden />
            </button>
            <button type="button" className={styles.primaryButton} onClick={() => setCreateOpen(true)}>
              <Plus size={16} aria-hidden /> {t('newTask')}
            </button>
          </div>
        </header>

        <SummaryStrip summary={summary} />

        {error ? (
          <div className={styles.errorBanner} role="alert">
            <AlertTriangle size={16} aria-hidden />
            <span>{error}</span>
            <button type="button" onClick={() => void loadTasks(false)}>{t('tryAgain')}</button>
          </div>
        ) : null}

        <section className={styles.toolbar} aria-label={t('filters.label')}>
          <label>
            <Bot size={14} aria-hidden />
            <span className={styles.srOnly}>{t('filters.agent')}</span>
            <select value={agentFilter} onChange={(event) => updateAgentFilter(event.target.value)}>
              <option value="all">{t('filters.allAgents')}</option>
              {agents.map((agent) => <option value={agent.id} key={agent.id}>{agent.name}</option>)}
            </select>
          </label>
          <div className={styles.statusFilters} role="group" aria-label={t('filters.status')}>
            <button type="button" className={statusFilter === 'all' ? styles.filterActive : ''} onClick={() => setStatusFilter('all')}>
              {t('filters.allStatuses')}
            </button>
            {MISSION_TASK_STATUSES.map((status) => (
              <button type="button" key={status} className={statusFilter === status ? styles.filterActive : ''} onClick={() => setStatusFilter(status)}>
                {t(`status.${status}`)}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className={styles.loadingWorkspace} aria-label={t('loading')}>
            <Loader2 className={styles.spin} size={22} aria-hidden />
            <span>{t('loading')}</span>
          </div>
        ) : tasks.length === 0 ? (
          <section className={styles.empty}>
            <ListChecks size={30} aria-hidden />
            <h2>{t('empty.title')}</h2>
            <p>{t('empty.description')}</p>
            <button type="button" className={styles.primaryButton} onClick={() => setCreateOpen(true)}>
              <Plus size={15} aria-hidden /> {t('empty.action')}
            </button>
          </section>
        ) : filteredTasks.length === 0 ? (
          <section className={styles.empty}>
            <CircleDashed size={28} aria-hidden />
            <h2>{t('filteredEmpty.title')}</h2>
            <p>{t('filteredEmpty.description')}</p>
            <button type="button" className={styles.secondaryButton} onClick={() => { updateAgentFilter('all'); setStatusFilter('all'); }}>
              {t('filteredEmpty.action')}
            </button>
          </section>
        ) : (
          <section className={styles.workspace}>
            <aside className={styles.taskList} aria-label={t('taskList')}>
              <div className={styles.listHeader}>
                <strong>{t('taskList')}</strong>
                <span>{filteredTasks.length}</span>
              </div>
              <div className={styles.listScroll}>
                {filteredTasks.map((task) => {
                  const progress = missionTaskProgress(task);
                  const selected = task.id === selectedId;
                  return (
                    <button
                      type="button"
                      className={styles.taskRow}
                      data-selected={selected || undefined}
                      onClick={() => setSelectedId(task.id)}
                      aria-current={selected ? 'true' : undefined}
                      key={task.id}
                    >
                      <div className={styles.taskRowTop}>
                        <TaskStatus status={task.status} label={t(`status.${task.status}`)} />
                        <span className={styles.taskDate}>{formatDate(task.updatedAt, locale)}</span>
                      </div>
                      <strong className={styles.taskTitle}>{taskDisplayTitle(task)}</strong>
                      <span className={styles.taskAgent}><Bot size={12} aria-hidden /> {task.agent?.name ?? t('unknownAgent')}</span>
                      {task.status === 'running' || progress.value !== null ? (
                        <span className={styles.miniProgress} aria-hidden><span style={{ width: `${progress.value ?? 35}%` }} /></span>
                      ) : null}
                      <div className={styles.taskRowBottom}>
                        <span>{t('attempt', { count: task.latestRun?.attempt ?? 0 })}</span>
                        {task.budget.aiCredits !== null ? (
                          <span>
                            <Coins size={11} aria-hidden /> {compactNumber(task.cost.aiCredits ?? 0, locale)} / {compactNumber(task.budget.aiCredits, locale)}
                          </span>
                        ) : null}
                        <ChevronRight size={14} aria-hidden />
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>
            {selectedTask ? (
              <TaskDetail task={selectedTask} locale={locale} actionKey={actionKey} onAction={handleAction} />
            ) : null}
          </section>
        )}
      </div>

      {createOpen ? (
        <CreateTaskDialog
          agents={agents}
          form={form}
          saving={creating}
          onChange={setForm}
          onClose={closeCreateDialog}
          onSubmit={handleCreate}
        />
      ) : null}
    </main>
  );
}
