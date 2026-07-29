import { describe, expect, it } from 'vitest';
import { shouldStartDashboardTour } from '@/components/onboarding/dashboardTourTrigger';

const base = {
  isAuthenticated: true,
  isLoading: false,
  agentCount: 0 as number | undefined,
  pathname: '/dashboard/agents',
  completed: false,
};

describe('shouldStartDashboardTour', () => {
  it('starts for a fresh zero-agent user on the agents page', () => {
    expect(shouldStartDashboardTour(base)).toBe(true);
  });

  it('waits while auth state is still loading', () => {
    expect(shouldStartDashboardTour({ ...base, isLoading: true })).toBe(false);
  });

  it('requires an authenticated user', () => {
    expect(shouldStartDashboardTour({ ...base, isAuthenticated: false })).toBe(false);
  });

  it('never re-runs once completed', () => {
    expect(shouldStartDashboardTour({ ...base, completed: true })).toBe(false);
  });

  it('skips users who already have agents', () => {
    expect(shouldStartDashboardTour({ ...base, agentCount: 3 })).toBe(false);
  });

  it('skips when the agent count is unknown', () => {
    expect(shouldStartDashboardTour({ ...base, agentCount: undefined })).toBe(false);
  });

  it('only triggers on the agents dashboard route', () => {
    expect(shouldStartDashboardTour({ ...base, pathname: '/dashboard/billing' })).toBe(false);
    expect(shouldStartDashboardTour({ ...base, pathname: '/dashboard/agents/import' })).toBe(false);
    expect(shouldStartDashboardTour({ ...base, pathname: '/es/dashboard/agents' })).toBe(true);
  });

  it('never triggers on an agent detail page (AgentDetailTour territory)', () => {
    expect(shouldStartDashboardTour({ ...base, pathname: '/dashboard/agent/abc' })).toBe(false);
    expect(shouldStartDashboardTour({ ...base, pathname: '/es/dashboard/agent/abc' })).toBe(false);
  });
});
