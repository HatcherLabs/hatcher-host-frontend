import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  latestReleases,
  phases,
  roadmapUpdatedAt,
} from '../app/[locale]/roadmap/roadmap-data';

const roadmapCopy = JSON.stringify({ latestReleases, phases });
const pageSource = readFileSync(
  new URL('../app/[locale]/roadmap/page.tsx', import.meta.url),
  'utf8',
);

describe('roadmap content', () => {
  it('publishes a current, machine-readable update date', () => {
    expect(roadmapUpdatedAt).toEqual({
      dateTime: '2026-08-25',
      label: 'August 2026',
    });
  });

  it('surfaces the latest releases', () => {
    expect(latestReleases.map((release) => release.id)).toEqual([
      'automation-center',
      'bot-chain',
      'ai-stock-rewards',
      'neural-mesh',
      'embeddable-agents',
    ]);
  });

  it('does not advertise already-shipped platform work as active backlog', () => {
    const activeIds = phases
      .filter((phase) => phase.status === 'now' || phase.status === 'next')
      .flatMap((phase) => phase.items.map((item) => item.id));

    expect(activeIds).not.toContain('agent-badges');
    expect(activeIds).not.toContain('knowledge');
    expect(activeIds).not.toContain('dev-api');
    expect(activeIds).not.toContain('embed');
    expect(activeIds).not.toContain('automation-center');
  });

  it('walks the classic phase ladder in order', () => {
    expect(phases.map((phase) => phase.status)).toEqual([
      'shipped',
      'now',
      'next',
      'later',
    ]);
    for (const phase of phases) {
      expect(phase.timeframe.length).toBeGreaterThan(0);
      expect(phase.statusLabel.length).toBeGreaterThan(0);
      expect(phase.items.length).toBeGreaterThan(0);
      for (const item of phase.items) {
        expect(item.title.length).toBeGreaterThan(0);
        expect(item.note.length).toBeGreaterThan(0);
      }
    }
  });

  it('anchors the phases in the real product surface', () => {
    expect(roadmapCopy).toContain('Mission Control');
    expect(roadmapCopy).toContain('HATCHER staking');
    expect(roadmapCopy).toContain('App Store');
    expect(roadmapCopy).toContain('EquiFold');
    expect(roadmapCopy).toContain('Inference');
    expect(roadmapCopy).toContain('BOT Chain');
    expect(roadmapCopy).toContain('Neural Mesh');
    expect(roadmapCopy).toContain('AI stock rewards');
  });

  it('keeps token utility on both rails visible', () => {
    const tagged = phases.flatMap((phase) => phase.items).flatMap((item) => item.tags ?? []);
    expect(tagged).toContain('hatcher');
    expect(tagged).toContain('equifold');
  });

  it('removes stale launch-era promises and uses semantic page landmarks', () => {
    for (const stalePhrase of [
      'Shipped (pre-launch)',
      '10–16 April',
      'Next 2–4 weeks',
      'stake HATCHER for subscription discounts',
      'Mobile app — Android',
      'No active build target',
      'proofTargets',
    ]) {
      expect(`${roadmapCopy}\n${pageSource}`).not.toContain(stalePhrase);
    }

    expect(pageSource).not.toContain('<main');
    expect(pageSource).toContain('<section');
    expect(pageSource).not.toMatch(/key=\{(?:i|j|index)\}/);
  });

  it('keeps all roadmap identifiers unique', () => {
    const ids = [
      ...latestReleases.map((item) => item.id),
      ...phases.map((phase) => phase.id),
      ...phases.flatMap((phase) => phase.items.map((item) => `${phase.id}:${item.id}`)),
    ];

    expect(new Set(ids).size).toBe(ids.length);
  });
});
