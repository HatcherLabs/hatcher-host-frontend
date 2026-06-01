import type { CityAgent } from '@/components/city/types';

type AgentVisualState = Pick<CityAgent, 'framework' | 'status' | 'mine'>;

// paused (amber) + crashed (red) stay status-semantic across every framework;
// running/sleeping carry the canonical brand hue (openclaw=yellow,
// hermes=violet, elizaos=azure, milady=pink).
const FRAMEWORK_STATUS_COLORS: Record<
  CityAgent['framework'],
  Record<CityAgent['status'], number>
> = {
  openclaw: {
    running: 0xffc21f,
    sleeping: 0xb89020,
    paused: 0xffc857,
    crashed: 0xff5c7a,
  },
  hermes: {
    running: 0xa64dff,
    sleeping: 0x6b4d9c,
    paused: 0xffc857,
    crashed: 0xff5c7a,
  },
  elizaos: {
    running: 0x2f9bff,
    sleeping: 0x35608f,
    paused: 0xffc857,
    crashed: 0xff5c7a,
  },
  milady: {
    running: 0xff4fa3,
    sleeping: 0x9c4d72,
    paused: 0xffc857,
    crashed: 0xff5c7a,
  },
};

// Neutral fallback so an unexpected framework/status string never crashes the
// scene (the backend currently coerces unknown frameworks to openclaw).
const NEUTRAL = 0x9fc1c7;

const FRAMEWORK_GLOW: Record<CityAgent['framework'], number> = {
  openclaw: 0xffd95c,
  hermes: 0xc88bff,
  elizaos: 0x6fc0ff,
  milady: 0xff86c2,
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
