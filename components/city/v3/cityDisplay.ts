import type { CityAgent } from '@/components/city/types';
import type { LiveAgentMarkerLayout } from './liveLayout';

type CityAgentLike =
  | Pick<CityAgent, 'id' | 'mine' | 'publicChatEnabled' | 'visibility'>
  | Pick<LiveAgentMarkerLayout, 'agentId' | 'mine' | 'publicChatEnabled' | 'visibility'>;

function displayKey(agent: CityAgentLike): string {
  const id = 'agentId' in agent ? agent.agentId : agent.id;
  return (id || 'agent').slice(0, 4).toUpperCase();
}

export function cityAgentDisplayName(agent: CityAgentLike): string {
  const key = displayKey(agent);
  if (agent.mine) return `My agent ${key}`;
  if (agent.publicChatEnabled === true && agent.visibility !== 'private') {
    return `Public agent ${key}`;
  }
  return `Active agent ${key}`;
}
