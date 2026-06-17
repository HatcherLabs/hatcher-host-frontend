export type CityLoadingStage = 'runtime' | 'data' | 'avatars' | 'webgl' | 'ready';

export const CITY_LOADING_STAGES: Record<CityLoadingStage, string> = {
  runtime: 'Loading city runtime',
  data: 'Preparing live city data',
  avatars: 'Preloading priority avatars',
  webgl: 'Starting WebGL renderer',
  ready: 'Hatcher City ready',
};

const STAGE_PROGRESS: Record<CityLoadingStage, number> = {
  runtime: 18,
  data: 38,
  avatars: 54,
  webgl: 90,
  ready: 100,
};

export interface CityLoadingProgressInput {
  stage: CityLoadingStage;
  avatarLoaded?: number;
  avatarTotal?: number;
}

export function cityLoadingProgress({
  stage,
  avatarLoaded = 0,
  avatarTotal = 0,
}: CityLoadingProgressInput): number {
  if (stage !== 'avatars') return STAGE_PROGRESS[stage];
  if (avatarTotal <= 0) return STAGE_PROGRESS.avatars;

  const ratio = Math.min(1, Math.max(0, avatarLoaded / avatarTotal));
  return Math.round(STAGE_PROGRESS.avatars + ratio * (86 - STAGE_PROGRESS.avatars));
}

export interface CriticalAvatarCandidate {
  agentId: string;
  mine?: boolean;
  avatarUrl?: string | null;
}

export function chooseCriticalAvatarUrls(
  candidates: CriticalAvatarCandidate[],
  cap: number,
): string[] {
  if (cap <= 0) return [];

  const seen = new Set<string>();
  const urls: string[] = [];
  const sorted = [...candidates].sort((a, b) => {
    if (a.mine === b.mine) return 0;
    return a.mine ? -1 : 1;
  });

  for (const candidate of sorted) {
    const url = candidate.avatarUrl?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
    if (urls.length >= cap) break;
  }

  return urls;
}
