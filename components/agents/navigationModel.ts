import type { Tab } from './AgentContext';

export type AgentViewMode = 'easy' | 'advanced';
export type AgentNavigationGroup = 'operate' | 'configure' | 'assets' | 'advanced';

export interface AgentNavigationTab {
  id: Tab;
  label: string;
  group: AgentNavigationGroup;
}

type AgentNavigationSpec = {
  id: Tab;
  group: AgentNavigationGroup;
  frameworks?: string[];
};

export const DEFAULT_AGENT_VIEW_MODE: AgentViewMode = 'advanced';

export const EASY_AGENT_TABS: Tab[] = ['overview', 'chat', 'logs', 'integrations', 'wallet'];

export const AGENT_NAVIGATION_GROUPS: AgentNavigationGroup[] = [
  'operate',
  'configure',
  'assets',
  'advanced',
];

export function resolveAgentViewMode(saved: string | null | undefined): AgentViewMode {
  if (saved === 'easy' || saved === 'advanced') return saved;
  return DEFAULT_AGENT_VIEW_MODE;
}

const AGENT_NAVIGATION: AgentNavigationSpec[] = [
  { id: 'overview', group: 'operate' },
  { id: 'chat', group: 'operate' },
  { id: 'logs', group: 'operate' },
  { id: 'mail', group: 'operate' },
  { id: 'stats', group: 'operate' },
  { id: 'config', group: 'configure' },
  { id: 'integrations', group: 'configure' },
  { id: 'connectors', group: 'configure' },
  { id: 'knowledge', group: 'configure' },
  { id: 'plugins', group: 'configure' },
  { id: 'wallet', group: 'assets' },
  { id: 'files', group: 'assets' },
  { id: 'memory', group: 'assets' },
  { id: 'sessions', group: 'assets', frameworks: ['openclaw'] },
  { id: 'terminal', group: 'advanced' },
  { id: 'dev', group: 'advanced' },
  { id: 'workflows', group: 'advanced' },
  { id: 'schedules', group: 'advanced' },
];

export function buildAgentNavigationTabs(
  framework: string | undefined,
  labelFor: (id: Tab) => string,
  viewMode: AgentViewMode,
): AgentNavigationTab[] {
  const visibleTabs = viewMode === 'easy'
    ? new Set<Tab>(EASY_AGENT_TABS)
    : null;

  return AGENT_NAVIGATION
    .filter((item) => !item.frameworks || item.frameworks.includes(framework ?? ''))
    .filter((item) => !visibleTabs || visibleTabs.has(item.id))
    .map((item) => ({ ...item, label: labelFor(item.id) }));
}
