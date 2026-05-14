import type { LiveAgentPose } from './liveAgentMotion';
import type { LiveAgentMarkerLayout } from './liveLayout';

export interface AgentFocusTarget {
  key: string;
  x: number;
  z: number;
  height: number;
}

export function agentFocusTargetFor(
  marker: LiveAgentMarkerLayout,
  livePose: LiveAgentPose | null | undefined,
  keySuffix: number = Date.now(),
): AgentFocusTarget {
  return {
    key: `agent:${marker.agentId}:${keySuffix}`,
    x: livePose?.x ?? marker.x,
    z: livePose?.z ?? marker.z,
    height: marker.height,
  };
}
