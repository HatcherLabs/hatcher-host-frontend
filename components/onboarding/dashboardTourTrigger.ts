export const TOUR_STORAGE_KEY = 'hatcher_tour_complete';
export const RESTART_TOUR_EVENT = 'hatcher:restart-tour';
export const PENDING_RESTART_KEY = 'hatcher_tour_restart_pending';
export const AGENTS_DASHBOARD_PATH = '/dashboard/agents';

export interface DashboardTourTriggerInput {
  isAuthenticated: boolean;
  isLoading: boolean;
  agentCount: number | undefined;
  pathname: string;
  completed: boolean;
}

/** First-run trigger: a signed-in user with zero agents landing on the agents page. */
export function shouldStartDashboardTour(input: DashboardTourTriggerInput): boolean {
  if (input.isLoading || !input.isAuthenticated) return false;
  if (input.completed) return false;
  if (input.agentCount !== 0) return false;
  return input.pathname.endsWith(AGENTS_DASHBOARD_PATH);
}
