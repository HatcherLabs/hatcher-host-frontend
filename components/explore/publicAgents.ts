export type ExploreFrameworkFilter = 'all' | 'openclaw' | 'hermes';

export interface PublicExploreAgent {
  id: string;
  slug?: string | null;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  framework: string;
  status: string;
  messageCount: number;
  createdAt: string;
  publicChatEnabled?: boolean;
  publicHref?: string;
  capabilityLabel?: string;
  ctaLabel?: string;
  featuredPriority?: number;
  owner?: { username?: string | null; walletAddress?: string | null };
}

export interface ExploreAgentFilters {
  query: string;
  framework: ExploreFrameworkFilter;
  liveOnly: boolean;
}

export function sortExploreAgents(agents: PublicExploreAgent[]): PublicExploreAgent[] {
  return [...agents].sort((a, b) => {
    const priorityDiff = (b.featuredPriority ?? 0) - (a.featuredPriority ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    const liveDiff = Number(isLiveExploreAgent(b)) - Number(isLiveExploreAgent(a));
    if (liveDiff !== 0) return liveDiff;
    const usageDiff = (b.messageCount ?? 0) - (a.messageCount ?? 0);
    if (usageDiff !== 0) return usageDiff;
    return a.name.localeCompare(b.name);
  });
}

export function filterExploreAgents(
  agents: PublicExploreAgent[],
  filters: ExploreAgentFilters,
): PublicExploreAgent[] {
  const query = filters.query.trim().toLowerCase();
  return sortExploreAgents(
    agents.filter((agent) => {
      const framework = agent.framework.toLowerCase();
      if (filters.framework !== 'all' && framework !== filters.framework) return false;
      if (filters.liveOnly && !isLiveExploreAgent(agent)) return false;
      if (!query) return true;
      const owner = agent.owner?.username ?? '';
      return [agent.name, agent.description ?? '', owner, agent.framework]
        .join(' ')
        .toLowerCase()
        .includes(query);
    }),
  );
}

export function getExploreStats(agents: PublicExploreAgent[]): {
  total: number;
  live: number;
  interactions: number;
} {
  return agents.reduce(
    (stats, agent) => ({
      total: stats.total + 1,
      live: stats.live + Number(isLiveExploreAgent(agent)),
      interactions: stats.interactions + (agent.messageCount ?? 0),
    }),
    { total: 0, live: 0, interactions: 0 },
  );
}

export function publicAgentAccent(agent: PublicExploreAgent): string {
  if (agent.status === 'crashed') return '#f97316';
  if (agent.framework.toLowerCase() === 'autr') return '#89d6c6';
  return agent.framework.toLowerCase() === 'hermes' ? '#38bdf8' : '#486a79';
}

export function publicAgentHref(agent: PublicExploreAgent): string {
  if (agent.publicHref) return agent.publicHref;
  return `/agent/${agent.id}?chat=1`;
}

export function isLiveExploreAgent(agent: Pick<PublicExploreAgent, 'status'>): boolean {
  return agent.status === 'running' || agent.status === 'active';
}

export function frameworkDisplayName(framework: string): string {
  const normalized = framework.toLowerCase();
  if (normalized === 'openclaw') return 'OpenClaw';
  if (normalized === 'hermes') return 'Hermes';
  if (normalized === 'autr') return 'AUTR';
  return framework;
}

export const AUTR_LIVE_TRADER_AGENT: PublicExploreAgent = {
  id: 'autr-live-trader',
  slug: 'autr-live-trader',
  name: 'AUTR Live Trader',
  description: 'Real AUTR BUY/SELL webhook signals tracked through a Hatcher guarded live-test wallet.',
  avatarUrl: null,
  framework: 'autr',
  status: 'running',
  messageCount: 0,
  createdAt: '2026-06-18T00:00:00.000Z',
  publicChatEnabled: true,
  publicHref: '/autr-live-trader',
  capabilityLabel: 'Live trader',
  ctaLabel: 'View trader',
  featuredPriority: 100,
  owner: { username: 'Hatcher Labs', walletAddress: null },
};

export function withAutrLiveTraderAgent(agents: PublicExploreAgent[]): PublicExploreAgent[] {
  if (agents.some((agent) => agent.id === AUTR_LIVE_TRADER_AGENT.id || agent.slug === AUTR_LIVE_TRADER_AGENT.slug)) {
    return agents;
  }
  return [AUTR_LIVE_TRADER_AGENT, ...agents];
}
