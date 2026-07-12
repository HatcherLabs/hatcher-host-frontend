'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  FileSearch,
  GitPullRequest,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Megaphone,
  PackageCheck,
  PackageOpen,
  Radar,
  RefreshCw,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Agent, PublicOutcomePack } from '@/lib/api';
import { buildDashboardOverviewModel } from '@/lib/dashboard-overview';
import { outcomePackCopySlug } from '@/lib/outcome-packs';
import styles from './dashboard.module.css';

const PACK_ICONS = {
  'research-report-v1': FileSearch,
  'pr-review-v1': GitPullRequest,
  'competitor-watch-v1': Radar,
  'launch-content-v1': Megaphone,
} as const;

interface DashboardSourceFailures {
  agents: boolean;
  missions: boolean;
  packs: boolean;
}

export default function DashboardPage() {
  const t = useTranslations('dashboard.overview');
  const tCommon = useTranslations('dashboard.common');
  const tMission = useTranslations('missionControl');
  const tOutcome = useTranslations('outcomePacks');
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const requestIdRef = useRef(0);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [missionPayload, setMissionPayload] = useState<unknown>({ tasks: [], nextCursor: null });
  const [packs, setPacks] = useState<PublicOutcomePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sourceFailures, setSourceFailures] = useState<DashboardSourceFailures>({
    agents: false,
    missions: false,
    packs: false,
  });

  const loadDashboard = useCallback(async (initial = false) => {
    const requestId = ++requestIdRef.current;
    if (initial) setLoading(true);
    else setRefreshing(true);

    const [agentsResult, missionsResult, packsResult] = await Promise.all([
      api.getMyAgents(),
      api.getMissionTasks({ limit: 20 }),
      api.getOutcomePacks(),
    ]);
    if (requestId !== requestIdRef.current) return;

    if (agentsResult.success) setAgents(agentsResult.data);
    if (missionsResult.success) setMissionPayload(missionsResult.data);
    if (packsResult.success) setPacks(packsResult.data.packs);
    setSourceFailures({
      agents: !agentsResult.success,
      missions: !missionsResult.success,
      packs: !packsResult.success,
    });
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void loadDashboard(true);
    return () => { requestIdRef.current += 1; };
  }, [isAuthenticated, loadDashboard]);

  const overview = useMemo(
    () => buildDashboardOverviewModel(agents, missionPayload),
    [agents, missionPayload],
  );
  const partialError = sourceFailures.agents || sourceFailures.missions || sourceFailures.packs;

  if (authLoading || (isAuthenticated && loading)) {
    return (
      <div className={styles.gate}>
        <Loader2 className={styles.spin} size={24} aria-hidden />
        <p>{authLoading ? tCommon('authenticating') : tCommon('loading')}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.gate}>
        <LayoutDashboard size={28} aria-hidden />
        <h1>{tCommon('signInRequired')}</h1>
        <p>{t('signInDescription')}</p>
        <Link href="/login" className={styles.primaryButton}>{tCommon('signIn')}</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <span className={styles.eyebrow}>{t('eyebrow')}</span>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/dashboard/outcome-packs" className={styles.secondaryButton}>
              <PackageCheck size={16} aria-hidden /> {t('useOutcomePack')}
            </Link>
            <Link href="/dashboard/missions" className={styles.primaryButton}>
              <ListChecks size={16} aria-hidden /> {t('openMissionControl')}
            </Link>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => void loadDashboard(false)}
              disabled={refreshing}
              aria-label={t('refresh')}
              title={t('refresh')}
            >
              <RefreshCw size={17} className={refreshing ? styles.spin : ''} aria-hidden />
            </button>
          </div>
        </header>

        {partialError ? (
          <div className={styles.errorBanner} role="alert">
            <AlertTriangle size={16} aria-hidden />
            <span>{t('partialError')}</span>
            <button type="button" onClick={() => void loadDashboard(false)}>{t('retry')}</button>
          </div>
        ) : null}

        <section className={styles.stats} aria-label={t('stats.label')}>
          <Link href="/dashboard/agents" className={styles.stat}>
            <span>{t('stats.agents')}</span>
            <strong aria-label={sourceFailures.agents ? t('unavailable') : undefined}>
              {sourceFailures.agents ? '-' : overview.metrics.agents}
            </strong>
          </Link>
          <Link href="/dashboard/agents" className={styles.stat}>
            <span>{t('stats.activeAgents')}</span>
            <strong aria-label={sourceFailures.agents ? t('unavailable') : undefined}>
              {sourceFailures.agents ? '-' : overview.metrics.activeAgents}
            </strong>
          </Link>
          <Link href="/dashboard/missions" className={styles.stat}>
            <span>{t('stats.activeMissions')}</span>
            <strong aria-label={sourceFailures.missions ? t('unavailable') : undefined}>
              {sourceFailures.missions ? '-' : overview.metrics.activeMissions}
            </strong>
          </Link>
          <Link href="/dashboard/missions" className={styles.stat}>
            <span>{t('stats.awaitingApproval')}</span>
            <strong aria-label={sourceFailures.missions ? t('unavailable') : undefined}>
              {sourceFailures.missions ? '-' : overview.metrics.awaitingApproval}
            </strong>
          </Link>
        </section>

        <div className={styles.workspaceGrid}>
          <section className={styles.section} aria-labelledby="recent-missions-heading">
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionTitleRow}>
                  <h2 id="recent-missions-heading">{t('missions.title')}</h2>
                  {!sourceFailures.missions && overview.metrics.needsAttention > 0 ? (
                    <span className={styles.attention}>
                      {t('missions.needsAttention', { count: overview.metrics.needsAttention })}
                    </span>
                  ) : null}
                </div>
                <p>{t('missions.subtitle')}</p>
              </div>
              <Link href="/dashboard/missions" className={styles.textLink}>
                {t('missions.viewAll')} <ArrowRight size={14} aria-hidden />
              </Link>
            </div>

            <div className={styles.rows}>
              {sourceFailures.missions ? (
                <div className={styles.emptyState}><p>{t('unavailable')}</p></div>
              ) : overview.recentTasks.length > 0 ? overview.recentTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/dashboard/missions?task=${encodeURIComponent(task.id)}`}
                  className={styles.missionRow}
                >
                  <span className={styles.rowIcon}><ListChecks size={16} aria-hidden /></span>
                  <span className={styles.rowBody}>
                    <strong>{task.title}</strong>
                    <span>{task.agent?.name ?? t('missions.unknownAgent')}</span>
                  </span>
                  <span className={styles.status} data-status={task.status}>
                    {tMission(`status.${task.status}`)}
                  </span>
                  <ArrowRight className={styles.rowArrow} size={15} aria-hidden />
                </Link>
              )) : (
                <div className={styles.emptyState}>
                  <p>{t('missions.empty')}</p>
                  <Link href="/dashboard/missions">{t('missions.emptyAction')}</Link>
                </div>
              )}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="outcome-packs-heading">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="outcome-packs-heading">{t('packs.title')}</h2>
                <p>{t('packs.subtitle')}</p>
              </div>
              <Link href="/dashboard/outcome-packs" className={styles.textLink}>
                {t('packs.browse')} <ArrowRight size={14} aria-hidden />
              </Link>
            </div>

            <div className={styles.rows}>
              {sourceFailures.packs ? (
                <div className={styles.emptyState}><p>{t('unavailable')}</p></div>
              ) : packs.length > 0 ? packs.slice(0, 4).map((pack) => {
                const Icon = PACK_ICONS[pack.id as keyof typeof PACK_ICONS] ?? PackageCheck;
                const copySlug = outcomePackCopySlug(pack.id);
                const titleKey = copySlug ? `content.packs.${copySlug}.title` : null;
                const summaryKey = copySlug ? `content.packs.${copySlug}.summary` : null;
                const title = titleKey && tOutcome.has(titleKey) ? tOutcome(titleKey) : pack.title;
                const summary = summaryKey && tOutcome.has(summaryKey) ? tOutcome(summaryKey) : pack.summary;
                return (
                  <Link
                    key={pack.id}
                    href={`/dashboard/outcome-packs?pack=${encodeURIComponent(pack.id)}`}
                    className={styles.packRow}
                  >
                    <span className={styles.rowIcon}><Icon size={16} aria-hidden /></span>
                    <span className={styles.rowBody}>
                      <strong>{title}</strong>
                      <span>{summary}</span>
                    </span>
                    <ArrowRight className={styles.rowArrow} size={15} aria-hidden />
                  </Link>
                );
              }) : (
                <div className={styles.emptyState}><p>{t('packs.empty')}</p></div>
              )}
            </div>
          </section>
        </div>

        <nav className={styles.utilities} aria-label={t('utilities.label')}>
          <span>{t('utilities.label')}</span>
          <Link href="/dashboard/agents/import">
            <PackageOpen size={15} aria-hidden /> {t('utilities.lift')}
          </Link>
          <Link href="/city">
            <Building2 size={15} aria-hidden /> {t('utilities.city')}
          </Link>
          <Link href="/dashboard/agents">
            <Bot size={15} aria-hidden /> {t('utilities.agents')}
          </Link>
        </nav>
      </div>
    </div>
  );
}
