import type { AgentFramework } from '@hatcher/shared';

export interface FrameworkPalette {
  primary: string;
  accent: string;
  ambient: number;
  fog: number;
  background: number;
}

export const FRAMEWORK_PALETTES: Record<AgentFramework, FrameworkPalette> = {
  openclaw: { primary: '#f5c518', accent: '#ffae00', ambient: 0x1a1505, fog: 0x0e0a02, background: 0x05050a },
  hermes:   { primary: '#a855f7', accent: '#c084fc', ambient: 0x120a1a, fog: 0x0a0515, background: 0x08040f },
  elizaos:  { primary: '#3b82f6', accent: '#60a5fa', ambient: 0x0a1220, fog: 0x05101e, background: 0x030814 },
  milady:   { primary: '#ec4899', accent: '#f9a8d4', ambient: 0x1a0a14, fog: 0x14050e, background: 0x0e040a },
};

export function paletteFor(framework: string): FrameworkPalette {
  return FRAMEWORK_PALETTES[framework as AgentFramework] ?? FRAMEWORK_PALETTES.openclaw;
}
