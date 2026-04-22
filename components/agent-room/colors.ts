export type Framework = 'openclaw' | 'hermes' | 'elizaos' | 'milady';

export interface FrameworkPalette {
  primary: number;
  dim: number;
  bright: number;
  primaryHex: string;
  dimHex: string;
  brightHex: string;
}

export const FRAMEWORK_PALETTES: Record<Framework, FrameworkPalette> = {
  openclaw: {
    primary: 0xfacc15,
    dim: 0xca8a04,
    bright: 0xfef08a,
    primaryHex: '#FACC15',
    dimHex: '#CA8A04',
    brightHex: '#FEF08A',
  },
  hermes: {
    primary: 0xa855f7,
    dim: 0x7e22ce,
    bright: 0xe9d5ff,
    primaryHex: '#A855F7',
    dimHex: '#7E22CE',
    brightHex: '#E9D5FF',
  },
  elizaos: {
    primary: 0x3b82f6,
    dim: 0x1d4ed8,
    bright: 0xbfdbfe,
    primaryHex: '#3B82F6',
    dimHex: '#1D4ED8',
    brightHex: '#BFDBFE',
  },
  milady: {
    primary: 0xec4899,
    dim: 0xbe185d,
    bright: 0xfbcfe8,
    primaryHex: '#EC4899',
    dimHex: '#BE185D',
    brightHex: '#FBCFE8',
  },
};

export function paletteFor(framework: string): FrameworkPalette {
  return FRAMEWORK_PALETTES[framework as Framework] ?? FRAMEWORK_PALETTES.openclaw;
}
