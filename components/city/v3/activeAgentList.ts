import type { LiveAgentMarkerLayout } from './liveLayout';

export function selectActiveCityAgents(
  markers: LiveAgentMarkerLayout[],
  limit = 8,
): LiveAgentMarkerLayout[] {
  if (limit <= 0) return [];
  return markers
    .filter((marker) => marker.status === 'running')
    .sort((a, b) => {
      const publicChatDiff =
        Number(b.publicChatEnabled === true && b.visibility !== 'private') -
        Number(a.publicChatEnabled === true && a.visibility !== 'private');
      if (publicChatDiff !== 0) return publicChatDiff;
      const publicDiff =
        Number(b.visibility !== 'private') - Number(a.visibility !== 'private');
      if (publicDiff !== 0) return publicDiff;
      const rankDiff = b.rank - a.rank;
      if (rankDiff !== 0) return rankDiff;
      return a.agentName.localeCompare(b.agentName);
    })
    .slice(0, limit);
}

export function publicAgentChatHref(marker: LiveAgentMarkerLayout): string | null {
  if (marker.visibility === 'private' || marker.publicChatEnabled !== true) return null;
  if (!marker.agentSlug) return null;
  return `/agent/${encodeURIComponent(marker.agentSlug)}?chat=1`;
}
