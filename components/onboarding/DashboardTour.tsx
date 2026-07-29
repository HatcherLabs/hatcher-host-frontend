'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { track } from '@/lib/analytics';
import { GuidedTour, type TourStep } from '@/components/ui/GuidedTour';
import {
  AGENTS_DASHBOARD_PATH,
  PENDING_RESTART_KEY,
  RESTART_TOUR_EVENT,
  TOUR_STORAGE_KEY,
  shouldStartDashboardTour,
} from './dashboardTourTrigger';

export function DashboardTour() {
  const t = useTranslations('dashboard.agents');
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [eligible, setEligible] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [runId, setRunId] = useState(0);

  const steps: TourStep[] = useMemo(() => [
    {
      target: '[data-tour="create-agent"]',
      title: t('tourCreateTitle'),
      description: t('tourCreateDescription'),
    },
    {
      target: '[data-dashboard-workspace-nav]',
      title: t('tourWorkspaceTitle'),
      description: t('tourWorkspaceDescription'),
    },
    {
      target: '[data-tour="import-agent"]',
      title: t('tourImportTitle'),
      description: t('tourImportDescription'),
    },
    {
      target: '[data-tour="user-menu"]',
      title: t('tourPlanTitle'),
      description: t('tourPlanDescription'),
    },
  ], [t]);

  // First-run trigger (evaluated in an effect: localStorage is client-only)
  useEffect(() => {
    setEligible(shouldStartDashboardTour({
      isAuthenticated,
      isLoading,
      agentCount: user?.agentCount,
      pathname,
      completed: localStorage.getItem(TOUR_STORAGE_KEY) === 'true',
    }));
  }, [isAuthenticated, isLoading, user?.agentCount, pathname]);

  const restart = useCallback(() => {
    try {
      sessionStorage.removeItem(PENDING_RESTART_KEY);
    } catch {
      // ignore
    }
    localStorage.removeItem(TOUR_STORAGE_KEY);
    if (!pathname.endsWith(AGENTS_DASHBOARD_PATH)) {
      router.push(AGENTS_DASHBOARD_PATH);
    }
    setForceOpen(true);
    setRunId((id) => id + 1);
  }, [pathname, router]);

  // Manual restart via the command palette (or anything else dispatching the event)
  useEffect(() => {
    window.addEventListener(RESTART_TOUR_EVENT, restart);
    return () => window.removeEventListener(RESTART_TOUR_EVENT, restart);
  }, [restart]);

  // A restart requested outside the dashboard arrives here as a pending marker
  useEffect(() => {
    try {
      if (sessionStorage.getItem(PENDING_RESTART_KEY) === '1') restart();
    } catch {
      // ignore
    }
    // Mount-only: the marker is only set right before navigating here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!forceOpen && !eligible) return null;

  return (
    <GuidedTour
      key={runId}
      steps={steps}
      storageKey={TOUR_STORAGE_KEY}
      open={forceOpen ? true : undefined}
      onStart={() => track.tourStarted()}
      onComplete={() => {
        setForceOpen(false);
        track.tourCompleted();
      }}
      onSkip={() => {
        setForceOpen(false);
        track.tourSkipped();
      }}
    />
  );
}
