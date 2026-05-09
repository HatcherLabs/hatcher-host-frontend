import { describe, expect, it } from 'vitest';
import type { Agent } from '@/lib/api';
import { buildHouseLayout, HOUSE_DOOR_PITCH } from './houseLayout';

function agent(id: string): Agent {
  return {
    id,
    name: `Agent ${id}`,
    framework: 'openclaw',
    status: 'paused',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Agent;
}

describe('buildHouseLayout', () => {
  it('spaces ten agent doors without overlap and leaves room for lobby/exit', () => {
    const layout = buildHouseLayout(Array.from({ length: 10 }, (_, i) => agent(String(i + 1))));
    const west = layout.doors.filter((door) => door.side === 'west');
    const east = layout.doors.filter((door) => door.side === 'east');

    expect(west).toHaveLength(5);
    expect(east).toHaveLength(5);
    for (const side of [west, east]) {
      for (let i = 1; i < side.length; i += 1) {
        expect(side[i].z - side[i - 1].z).toBeCloseTo(HOUSE_DOOR_PITCH);
      }
    }

    const firstDoorZ = Math.min(...layout.doors.map((door) => door.z));
    const lastDoorZ = Math.max(...layout.doors.map((door) => door.z));
    expect(firstDoorZ).toBeGreaterThan(-layout.length / 2 + 1.8);
    expect(lastDoorZ).toBeLessThan(layout.length / 2 - 1.8);
  });
});
