import { describe, expect, it } from 'vitest';
import type { LiveAgentPose } from './liveAgentMotion';
import type { LiveAgentMarkerLayout } from './liveLayout';
import { agentFocusTargetFor } from './agentFocusTarget';

function marker(overrides: Partial<LiveAgentMarkerLayout> = {}): LiveAgentMarkerLayout {
  return {
    agentId: 'bella',
    agentName: 'BellaResearchBot',
    ownerKey: 'owner-bella',
    ownerUsername: 'bella',
    blockId: 'block-1',
    x: 12,
    z: -8,
    height: 1.7,
    width: 1,
    framework: 'openclaw',
    status: 'running',
    tier: 0,
    mine: false,
    visibility: 'public',
    rank: 1,
    pathNodes: [],
    speed: 1,
    phase: 0,
    ...overrides,
  };
}

describe('agentFocusTargetFor', () => {
  it('uses the live animated pose when it is available', () => {
    const currentPose: LiveAgentPose = { x: 48, z: 21, heading: 0.4 };

    expect(agentFocusTargetFor(marker(), currentPose)).toMatchObject({
      x: 48,
      z: 21,
      height: 1.7,
    });
  });

  it('falls back to the marker start position before animation has reported a pose', () => {
    expect(agentFocusTargetFor(marker({ x: -14, z: 33 }), null)).toMatchObject({
      x: -14,
      z: 33,
      height: 1.7,
    });
  });
});
