import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildingNext,
  exploring,
  latestReleases,
  liveTracks,
  roadmapUpdatedAt,
} from '../app/[locale]/roadmap/roadmap-data';

const roadmapCopy = JSON.stringify({ latestReleases, liveTracks, buildingNext, exploring });
const pageSource = readFileSync(
  new URL('../app/[locale]/roadmap/page.tsx', import.meta.url),
  'utf8',
);

describe('roadmap content', () => {
  it('publishes a current, machine-readable update date', () => {
    expect(roadmapUpdatedAt).toEqual({
      dateTime: '2026-07-12',
      label: 'July 2026',
    });
  });

  it('surfaces the latest operating-system releases', () => {
    expect(latestReleases.map((release) => release.id)).toEqual([
      'mission-control',
      'outcome-packs',
      'hatcher-lift',
      'model-network',
    ]);
  });

  it('groups shipped capabilities around current product outcomes', () => {
    expect(liveTracks.map((track) => track.id)).toEqual(['operate', 'run', 'route', 'own']);
    expect(roadmapCopy).toContain('App Store');
    expect(roadmapCopy).toContain('HATCHER staking');
    expect(roadmapCopy).toContain('GPT-5.6');
    expect(roadmapCopy).toContain('Mission Control');
  });

  it('keeps near-term targets evidence-led and free of invented delivery dates', () => {
    expect(buildingNext.map((target) => target.id)).toEqual([
      'measured-verified-missions',
      'trusted-action-approvals',
      'outcome-packs-v2',
    ]);
    expect(buildingNext.every((target) => target.proofTargets.length === 3)).toBe(true);
    expect(roadmapCopy).not.toMatch(/next \d|weeks?|months?|Q[1-4]|launching/i);
  });

  it('labels partner- and readiness-dependent bets as exploration', () => {
    expect(exploring.map((item) => item.id)).toEqual([
      'hatcher-earn',
      'city-operations',
      'verified-outcomes',
    ]);
    expect(exploring.find((item) => item.id === 'verified-outcomes')?.description).toContain(
      'dependent',
    );
  });

  it('removes stale launch-era promises and uses semantic page landmarks', () => {
    for (const stalePhrase of [
      'Shipped (pre-launch)',
      '10–16 April',
      'Next 2–4 weeks',
      'stake HATCHER for subscription discounts',
      'Mobile app — Android',
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
      ...liveTracks.map((item) => item.id),
      ...buildingNext.map((item) => item.id),
      ...exploring.map((item) => item.id),
    ];

    expect(new Set(ids).size).toBe(ids.length);
  });
});
