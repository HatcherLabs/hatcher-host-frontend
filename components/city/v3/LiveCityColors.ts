import type { CityAgent } from '@/components/city/types';

type AgentVisualState = Pick<CityAgent, 'framework' | 'status' | 'mine'>;

// paused (amber) + crashed (red) stay status-semantic across every framework;
// running/sleeping carry the canonical infrastructure hues (openclaw=gold, hermes=cyan).
const FRAMEWORK_STATUS_COLORS: Record<
  CityAgent['framework'],
  Record<CityAgent['status'], number>
> = {
  openclaw: {
    running: 0xd6b177,
    sleeping: 0x8a6d45,
    paused: 0xc8a064,
    crashed: 0xff5c7a,
  },
  hermes: {
    running: 0x8be0ff,
    sleeping: 0x3f7f96,
    paused: 0xc8a064,
    crashed: 0xff5c7a,
  },
};

// Neutral fallback so an unexpected framework/status string never crashes the
// scene (the backend coerces unknown frameworks to openclaw).
const NEUTRAL = 0x9fc1c7;

const FRAMEWORK_GLOW: Record<CityAgent['framework'], number> = {
  openclaw: 0xffd89a,
  hermes: 0x9fe7ff,
};

export function liveAgentColor(state: AgentVisualState): number {
  if (state.mine) return 0xffd24a;
  return FRAMEWORK_STATUS_COLORS[state.framework]?.[state.status] ?? NEUTRAL;
}

export function liveAgentGlowColor(state: AgentVisualState): number {
  if (state.mine) return 0xffe27a;
  if (state.status === 'crashed') return 0xff6d8b;
  if (state.status === 'paused') return 0xffd36a;
  return FRAMEWORK_GLOW[state.framework] ?? NEUTRAL;
}
