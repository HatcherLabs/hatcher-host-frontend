import type { CityAgent } from '@/components/city/types';
import type { LiveAgentMarkerLayout } from './liveLayout';

type CityAgentLike =
  | Pick<CityAgent, 'name'>
  | Pick<LiveAgentMarkerLayout, 'agentName'>;

export function cityAgentDisplayName(agent: CityAgentLike): string {
  const name = 'agentName' in agent ? agent.agentName : agent.name;
  return name?.trim() || 'Agent';
}
