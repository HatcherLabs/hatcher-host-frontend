import { describe, it, expect } from 'vitest';
import { getStationLayout, STATION_IDS } from './layout';
import { ROOM_HALF } from './grid';

describe('getStationLayout', () => {
  it('returns all 9 stations', () => {
    const layout = getStationLayout('openclaw');
    expect(Object.keys(layout)).toHaveLength(STATION_IDS.length);
  });
  it('places AgentAvatar at the center', () => {
    const { agentAvatar } = getStationLayout('hermes');
    expect(agentAvatar.position).toEqual([0, 0, 0]);
  });
  it('keeps all stations inside the room bounds', () => {
    const layout = getStationLayout('milady');
    // Leave ~0.5m of headroom so station meshes themselves don't poke
    // through the walls even though their centers are inside.
    for (const s of Object.values(layout)) {
      expect(Math.abs(s.position[0])).toBeLessThan(ROOM_HALF - 0.3);
      expect(Math.abs(s.position[2])).toBeLessThan(ROOM_HALF - 0.3);
    }
  });
  it('never overlaps two stations within 2m', () => {
    const layout = getStationLayout('elizaos');
    const entries = Object.values(layout);
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const dx = entries[i].position[0] - entries[j].position[0];
        const dz = entries[i].position[2] - entries[j].position[2];
        expect(Math.hypot(dx, dz)).toBeGreaterThan(2);
      }
    }
  });
});
