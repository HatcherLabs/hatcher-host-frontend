import { describe, expect, it } from 'vitest';
import {
  CITY_LOADING_STAGES,
  chooseCriticalAvatarUrls,
  cityLoadingProgress,
  type CityLoadingStage,
} from './cityLoading';

const avatarUrl = (id: string) => `/assets/3d/agent-room/avatars/${id}.glb`;

describe('cityLoadingProgress', () => {
  it('keeps progress monotonic across loading stages', () => {
    const stages: CityLoadingStage[] = [
      'runtime',
      'data',
      'avatars',
      'webgl',
      'ready',
    ];

    const progress = stages.map((stage) =>
      cityLoadingProgress({ stage, avatarLoaded: 0, avatarTotal: 8 }),
    );

    expect(progress).toEqual([...progress].sort((a, b) => a - b));
    expect(progress[0]).toBeGreaterThanOrEqual(8);
    expect(progress.at(-1)).toBe(100);
  });

  it('maps avatar preload progress into the avatar stage range', () => {
    expect(
      cityLoadingProgress({ stage: 'avatars', avatarLoaded: 0, avatarTotal: 4 }),
    ).toBe(54);
    expect(
      cityLoadingProgress({ stage: 'avatars', avatarLoaded: 2, avatarTotal: 4 }),
    ).toBe(70);
    expect(
      cityLoadingProgress({ stage: 'avatars', avatarLoaded: 8, avatarTotal: 4 }),
    ).toBe(86);
  });
});

describe('CITY_LOADING_STAGES', () => {
  it('exposes concise labels for every stage', () => {
    expect(CITY_LOADING_STAGES.runtime).toContain('runtime');
    expect(CITY_LOADING_STAGES.data).toContain('live');
    expect(CITY_LOADING_STAGES.avatars).toContain('avatars');
    expect(CITY_LOADING_STAGES.webgl).toContain('WebGL');
    expect(CITY_LOADING_STAGES.ready).toContain('ready');
  });
});

describe('chooseCriticalAvatarUrls', () => {
  it('prioritizes owned avatars and deduplicates URLs before filling the cap', () => {
    const urls = chooseCriticalAvatarUrls(
      [
        { agentId: 'mine-a', mine: true, avatarUrl: avatarUrl('heavy-a') },
        { agentId: 'other-a', mine: false, avatarUrl: avatarUrl('heavy-b') },
        { agentId: 'mine-b', mine: true, avatarUrl: avatarUrl('heavy-a') },
        { agentId: 'other-b', mine: false, avatarUrl: avatarUrl('heavy-c') },
      ],
      3,
    );

    expect(urls).toEqual([
      avatarUrl('heavy-a'),
      avatarUrl('heavy-b'),
      avatarUrl('heavy-c'),
    ]);
  });

  it('ignores empty avatar URLs and respects the requested cap', () => {
    const urls = chooseCriticalAvatarUrls(
      [
        { agentId: 'mine-a', mine: true, avatarUrl: '' },
        { agentId: 'mine-b', mine: true, avatarUrl: avatarUrl('mine-b') },
        { agentId: 'other-a', mine: false, avatarUrl: avatarUrl('other-a') },
      ],
      1,
    );

    expect(urls).toEqual([avatarUrl('mine-b')]);
  });
});
