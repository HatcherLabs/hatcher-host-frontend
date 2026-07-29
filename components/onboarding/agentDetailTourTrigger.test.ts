import { describe, expect, it } from 'vitest';
import {
  AGENT_DETAIL_TOUR_STEPS,
  AGENT_TOUR_STORAGE_KEY,
  isAgentDetailPath,
  restartTourTarget,
  shouldStartAgentDetailTour,
} from '@/components/onboarding/agentDetailTourTrigger';
import {
  TOUR_STORAGE_KEY,
  shouldStartDashboardTour,
} from '@/components/onboarding/dashboardTourTrigger';

const base = {
  isAuthenticated: true,
  isLoading: false,
  profileLoaded: true,
  pathname: '/dashboard/agent/agent-123',
  completed: false,
};

describe('shouldStartAgentDetailTour', () => {
  it('starts on the first visit to an agent detail page', () => {
    expect(shouldStartAgentDetailTour(base)).toBe(true);
  });

  it('waits while auth state is still loading', () => {
    expect(shouldStartAgentDetailTour({ ...base, isLoading: true })).toBe(false);
  });

  it('requires an authenticated user', () => {
    expect(shouldStartAgentDetailTour({ ...base, isAuthenticated: false })).toBe(false);
  });

  it('waits for the profile to load', () => {
    expect(shouldStartAgentDetailTour({ ...base, profileLoaded: false })).toBe(false);
  });

  it('never re-runs once completed', () => {
    expect(shouldStartAgentDetailTour({ ...base, completed: true })).toBe(false);
  });

  it('matches agent detail paths with and without a locale prefix', () => {
    expect(shouldStartAgentDetailTour({ ...base, pathname: '/es/dashboard/agent/abc' })).toBe(true);
    expect(shouldStartAgentDetailTour({ ...base, pathname: '/pt-BR/dashboard/agent/abc' })).toBe(true);
    expect(shouldStartAgentDetailTour({ ...base, pathname: '/dashboard/agent/abc/' })).toBe(true);
  });

  it('ignores non-agent dashboard pages', () => {
    expect(shouldStartAgentDetailTour({ ...base, pathname: '/dashboard/agents' })).toBe(false);
    expect(shouldStartAgentDetailTour({ ...base, pathname: '/dashboard/agents/import' })).toBe(false);
    expect(shouldStartAgentDetailTour({ ...base, pathname: '/dashboard/billing' })).toBe(false);
    expect(shouldStartAgentDetailTour({ ...base, pathname: '/dashboard/agent' })).toBe(false);
    expect(shouldStartAgentDetailTour({ ...base, pathname: '/dashboard/agent/' })).toBe(false);
  });

  it('ignores nested routes under an agent id', () => {
    expect(shouldStartAgentDetailTour({ ...base, pathname: '/dashboard/agent/abc/settings' })).toBe(false);
  });
});

describe('isAgentDetailPath', () => {
  it('recognizes only the agent detail page shape', () => {
    expect(isAgentDetailPath('/dashboard/agent/abc')).toBe(true);
    expect(isAgentDetailPath('/ja/dashboard/agent/abc-123')).toBe(true);
    expect(isAgentDetailPath('/dashboard/agents')).toBe(false);
    expect(isAgentDetailPath('/dashboard/agent/abc/logs')).toBe(false);
    expect(isAgentDetailPath('/')).toBe(false);
  });
});

describe('the two tours stay on separate routes', () => {
  it('the dashboard tour never triggers on an agent detail page', () => {
    expect(shouldStartDashboardTour({
      isAuthenticated: true,
      isLoading: false,
      agentCount: 0,
      pathname: '/dashboard/agent/abc',
      completed: false,
    })).toBe(false);
  });

  it('the agent tour never triggers on the agents dashboard', () => {
    expect(shouldStartAgentDetailTour({ ...base, pathname: '/dashboard/agents' })).toBe(false);
  });
});

describe('restartTourTarget', () => {
  it('routes a restart on an agent page to the agent tour', () => {
    expect(restartTourTarget('/dashboard/agent/abc')).toBe('agent');
    expect(restartTourTarget('/es/dashboard/agent/abc')).toBe('agent');
  });

  it('routes a restart anywhere else to the dashboard tour', () => {
    expect(restartTourTarget('/dashboard/agents')).toBe('dashboard');
    expect(restartTourTarget('/dashboard/billing')).toBe('dashboard');
    expect(restartTourTarget('/')).toBe('dashboard');
  });
});

describe('AGENT_DETAIL_TOUR_STEPS', () => {
  it('walks nav → chat → config → knowledge → credits', () => {
    expect(AGENT_DETAIL_TOUR_STEPS.map((s) => s.target)).toEqual([
      '[data-tour="agent-nav"]',
      '[data-testid="agent-chat-root"]',
      '[data-tour="agent-tab-config"]',
      '[data-tour="agent-tab-knowledge"]',
      '[data-tour="chat-input"]',
    ]);
  });

  it('pairs every step with distinct i18n keys', () => {
    const keys = AGENT_DETAIL_TOUR_STEPS.flatMap((s) => [s.titleKey, s.descriptionKey]);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('uses a dedicated storage key so the dashboard flag is untouched', () => {
    expect(AGENT_TOUR_STORAGE_KEY).toBe('hatcher_agent_tour_complete');
    expect(AGENT_TOUR_STORAGE_KEY).not.toBe(TOUR_STORAGE_KEY);
  });
});
