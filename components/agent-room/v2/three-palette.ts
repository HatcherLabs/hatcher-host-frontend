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
    primary: 0xd6b177,
    dim: 0x8a6d45,
    bright: 0xffe4ad,
    primaryHex: '#D6B177',
    dimHex: '#8A6D45',
    brightHex: '#FFE4AD',
	  },
	  hermes: {
	    primary: 0x9ed5e7,
	    dim: 0x607d8d,
	    bright: 0xd7eff5,
	    primaryHex: '#9ED5E7',
	    dimHex: '#607D8D',
	    brightHex: '#D7EFF5',
	  },
};

export function paletteFor(framework: string): FrameworkPalette {
  return FRAMEWORK_PALETTES[framework as Framework] ?? FRAMEWORK_PALETTES.openclaw;
}
