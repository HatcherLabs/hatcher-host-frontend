export interface FrameworkPalette {
  primary: string;
  accent: string;
  ambient: number;
  fog: number;
  background: number;
}

type SupportedFramework = 'openclaw' | 'hermes';

export const FRAMEWORK_PALETTES: Record<SupportedFramework, FrameworkPalette> = {
  openclaw: { primary: '#f5c518', accent: '#ffae00', ambient: 0x1a1505, fog: 0x0e0a02, background: 0x05050a },
  hermes:   { primary: '#a855f7', accent: '#c084fc', ambient: 0x120a1a, fog: 0x0a0515, background: 0x08040f },
};

export function paletteFor(framework: string): FrameworkPalette {
  return FRAMEWORK_PALETTES[framework as SupportedFramework] ?? FRAMEWORK_PALETTES.openclaw;
}
