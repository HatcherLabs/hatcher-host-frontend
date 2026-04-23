import { describe, it, expect } from 'vitest';
import { layoutBuildingsV2, pickBase, BUILDING_BASES } from './Buildings.layout';
import type { CityAgent } from '@/components/city/types';

function mkAgent(
  id: string,
  category: CityAgent['category'],
  tier = 2,
  framework: CityAgent['framework'] = 'openclaw',
  mine = false,
): CityAgent {
  return {
    id,
    slug: id,
    name: id,
    avatarUrl: null,
    framework,
    category,
    tier,
    status: 'running',
    messageCount: 0,
    mine,
  };
}

describe('pickBase', () => {
  it('returns deterministic base for the same agent id + tier', () => {
    expect(pickBase('agent-1', 2)).toBe(pickBase('agent-1', 2));
  });

  it('picks a small-tier base for tier 0-1', () => {
    const b = pickBase('agent-a', 0);
    expect(b.startsWith('small-building-')).toBe(true);
  });

  it('picks a medium or small for tier 2-3', () => {
    const b = pickBase('agent-b', 2);
    expect(b.startsWith('medium-building-') || b.startsWith('small-building-')).toBe(true);
  });

  it('picks a skyscraper for tier 4', () => {
    const b = pickBase('agent-c', 4);
    expect(b.startsWith('skyscraper-')).toBe(true);
  });

  it('every combination resolves to a valid base', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    for (const id of ids) {
      for (const tier of [0, 1, 2, 3, 4]) {
        const b = pickBase(id, tier);
        expect(BUILDING_BASES).toContain(b);
      }
    }
  });
});

describe('layoutBuildingsV2', () => {
  it('places every agent', () => {
    const agents = [
      mkAgent('a1', 'automation'),
      mkAgent('a2', 'finance'),
      mkAgent('a3', 'security'),
    ];
    const out = layoutBuildingsV2(agents);
    expect(out).toHaveLength(3);
    for (const b of out) {
      expect(typeof b.x).toBe('number');
      expect(typeof b.z).toBe('number');
      expect(
        b.base.startsWith('small-building-') ||
          b.base.startsWith('medium-building-') ||
          b.base.startsWith('skyscraper-'),
      ).toBe(true);
    }
  });

  it('is deterministic', () => {
    const agents = [mkAgent('agent-x', 'finance', 3)];
    const a = layoutBuildingsV2(agents);
    const b = layoutBuildingsV2(agents);
    expect(a).toEqual(b);
  });

  it('respects tier for height', () => {
    const tall = mkAgent('tall', 'finance', 4);
    const short = mkAgent('short', 'personal', 0);
    const out = layoutBuildingsV2([tall, short]);
    const tallOut = out.find((b) => b.agentId === 'tall')!;
    const shortOut = out.find((b) => b.agentId === 'short')!;
    expect(tallOut.height).toBeGreaterThan(shortOut.height);
  });
});
