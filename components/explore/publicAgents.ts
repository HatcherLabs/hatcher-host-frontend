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
  owner?: { username?: string | null; walletAddress?: string | null };
}

export interface ExploreAgentFilters {
  query: string;
  framework: ExploreFrameworkFilter;
  liveOnly: boolean;
}

export function sortExploreAgents(agents: PublicExploreAgent[]): PublicExploreAgent[] {
  return [...agents].sort((a, b) => {
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
  return agent.framework.toLowerCase() === 'hermes' ? '#38bdf8' : '#10b981';
}

export function publicAgentHref(agent: PublicExploreAgent): string {
  return `/agent/${agent.id}?chat=1`;
}

export function isLiveExploreAgent(agent: Pick<PublicExploreAgent, 'status'>): boolean {
  return agent.status === 'running' || agent.status === 'active';
}

export function frameworkDisplayName(framework: string): string {
  const normalized = framework.toLowerCase();
  if (normalized === 'openclaw') return 'OpenClaw';
  if (normalized === 'hermes') return 'Hermes';
  return framework;
}
