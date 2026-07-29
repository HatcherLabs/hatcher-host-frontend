'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { track } from '@/lib/analytics';
import { GuidedTour, type TourStep } from '@/components/ui/GuidedTour';
import {
  PENDING_RESTART_KEY,
  RESTART_TOUR_EVENT,
  TOUR_STORAGE_KEY,
} from './dashboardTourTrigger';
import {
  AGENT_DETAIL_TOUR_STEPS,
  AGENT_TOUR_STORAGE_KEY,
  isAgentDetailPath,
  restartTourTarget,
  shouldStartAgentDetailTour,
} from './agentDetailTourTrigger';

export function AgentDetailTour() {
  const t = useTranslations('dashboard.agentDetail');
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [eligible, setEligible] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [runId, setRunId] = useState(0);

  const onAgentPage = isAgentDetailPath(pathname);

  const steps: TourStep[] = useMemo(() => AGENT_DETAIL_TOUR_STEPS.map((step) => ({
    target: step.target,
    title: t(step.titleKey),
    description: t(step.descriptionKey),
  })), [t]);

  // First-run trigger (evaluated in an effect: localStorage is client-only)
  useEffect(() => {
    setEligible(shouldStartAgentDetailTour({
      isAuthenticated,
      isLoading,
      profileLoaded: !!user,
      pathname,
      completed: localStorage.getItem(AGENT_TOUR_STORAGE_KEY) === 'true',
    }));
  }, [isAuthenticated, isLoading, user, pathname]);

  const restart = useCallback(() => {
    // Off agent pages the restart belongs to the dashboard tour.
    if (restartTourTarget(pathname) !== 'agent') return;
    try {
      sessionStorage.removeItem(PENDING_RESTART_KEY);
    } catch {
      // ignore
    }
    localStorage.removeItem(AGENT_TOUR_STORAGE_KEY);
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setForceOpen(true);
    setRunId((id) => id + 1);
  }, [pathname]);

  // Manual restart via the command palette (or anything else dispatching the event)
  useEffect(() => {
    window.addEventListener(RESTART_TOUR_EVENT, restart);
    return () => window.removeEventListener(RESTART_TOUR_EVENT, restart);
  }, [restart]);

  // A restart requested before this mounted arrives here as a pending marker
  useEffect(() => {
    try {
      if (sessionStorage.getItem(PENDING_RESTART_KEY) === '1') restart();
    } catch {
      // ignore
    }
    // Mount-only: the marker is only set right before navigating here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A forced run must not survive navigating away from the agent page.
  useEffect(() => {
    if (!onAgentPage) setForceOpen(false);
  }, [onAgentPage]);

  if (!onAgentPage) return null;
  if (!forceOpen && !eligible) return null;

  return (
    <GuidedTour
      key={runId}
      steps={steps}
      storageKey={AGENT_TOUR_STORAGE_KEY}
      open={forceOpen ? true : undefined}
      onStart={() => track.tourStarted('agent-detail')}
      onComplete={() => {
        setForceOpen(false);
        track.tourCompleted('agent-detail');
      }}
      onSkip={() => {
        setForceOpen(false);
        track.tourSkipped('agent-detail');
      }}
    />
  );
}
