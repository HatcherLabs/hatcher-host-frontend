import type { CityAgent } from '@/components/city/types';

type AgentVisualState = Pick<CityAgent, 'framework' | 'status' | 'mine'>;

const FRAMEWORK_STATUS_COLORS: Record<
  CityAgent['framework'],
  Record<CityAgent['status'], number>
> = {
  openclaw: {
    running: 0x16f5a5,
    sleeping: 0x2da876,
    paused: 0xffc857,
    crashed: 0xff5c7a,
  },
  hermes: {
    running: 0x35d6ff,
    sleeping: 0x4d91cf,
    paused: 0xffc857,
    crashed: 0xff5c7a,
  },
};

export function liveAgentColor(state: AgentVisualState): number {
  if (state.mine) return 0xffd24a;
  return FRAMEWORK_STATUS_COLORS[state.framework][state.status];
}

export function liveAgentGlowColor(state: AgentVisualState): number {
  if (state.mine) return 0xffe27a;
  if (state.status === 'crashed') return 0xff6d8b;
  if (state.status === 'paused') return 0xffd36a;
  return state.framework === 'openclaw' ? 0x22ffc0 : 0x57dcff;
}
