export type Framework = 'openclaw' | 'hermes';

// THREE.Color-friendly palette: numeric channels for materials/emissive,
// hex strings for HTML/CSS. Distinct from `./colors.ts` (which is the V2
// stylistic palette: string + scene atmosphere numbers).
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
};

export function paletteFor(framework: string): FrameworkPalette {
  return FRAMEWORK_PALETTES[framework as Framework] ?? FRAMEWORK_PALETTES.openclaw;
}
