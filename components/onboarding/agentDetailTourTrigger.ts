export const AGENT_TOUR_STORAGE_KEY = 'hatcher_agent_tour_complete';

/**
 * The agent detail page: /dashboard/agent/<id>, with or without a locale
 * prefix. Tabs live in the ?tab= query string, so nested paths under the id
 * never exist and must not trigger the tour.
 */
const AGENT_DETAIL_PATH = /\/dashboard\/agent\/[^/]+\/?$/;

export function isAgentDetailPath(pathname: string): boolean {
  return AGENT_DETAIL_PATH.test(pathname);
}

/**
 * Which tour a `hatcher:restart-tour` event should run for the current
 * pathname. Keeps the two tours mutually exclusive: an agent detail page
 * restarts the agent tour, everywhere else restarts the dashboard tour.
 */
export function restartTourTarget(pathname: string): 'agent' | 'dashboard' {
  return isAgentDetailPath(pathname) ? 'agent' : 'dashboard';
}

export interface AgentDetailTourTriggerInput {
  isAuthenticated: boolean;
  isLoading: boolean;
  profileLoaded: boolean;
  pathname: string;
  completed: boolean;
}

/**
 * First-run trigger: a signed-in user with a loaded profile landing on an
 * agent detail page for the first time. Unlike the dashboard tour there is no
 * agent-count gate — this tour is about the agent page itself.
 */
export function shouldStartAgentDetailTour(input: AgentDetailTourTriggerInput): boolean {
  if (input.isLoading || !input.isAuthenticated) return false;
  if (!input.profileLoaded) return false;
  if (input.completed) return false;
  return isAgentDetailPath(input.pathname);
}

export interface AgentDetailTourStepSpec {
  target: string;
  titleKey: string;
  descriptionKey: string;
}

/**
 * Step anchors + i18n keys (under `dashboard.agentDetail`). GuidedTour skips
 * unresolvable targets, which covers the gaps: config/knowledge tabs are
 * hidden in 'easy' view mode, and the chat anchors only exist on the chat tab.
 */
export const AGENT_DETAIL_TOUR_STEPS: AgentDetailTourStepSpec[] = [
  {
    target: '[data-tour="agent-nav"]',
    titleKey: 'tourNavTitle',
    descriptionKey: 'tourNavDescription',
  },
  {
    target: '[data-testid="agent-chat-root"]',
    titleKey: 'tourChatTitle',
    descriptionKey: 'tourChatDescription',
  },
  {
    target: '[data-tour="agent-tab-config"]',
    titleKey: 'tourConfigTitle',
    descriptionKey: 'tourConfigDescription',
  },
  {
    target: '[data-tour="agent-tab-knowledge"]',
    titleKey: 'tourKnowledgeTitle',
    descriptionKey: 'tourKnowledgeDescription',
  },
  {
    target: '[data-tour="chat-input"]',
    titleKey: 'tourCreditsTitle',
    descriptionKey: 'tourCreditsDescription',
  },
];
