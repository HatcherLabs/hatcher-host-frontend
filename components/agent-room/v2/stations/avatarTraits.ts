'use client';

import type { FrameworkPalette } from '../three-palette';

export type AvatarTraits = {
  seed?: string;
  palette?: string;
  accentColor?: string;
  secondaryColor?: string;
  emblem?: string;
  accessory?: string;
  mood?: string;
};

export type AvatarSignature = {
  seed: number;
  accent: number;
  secondary: number;
  emblem: string;
  accessory: string;
  mood: string;
  pattern: 'rings' | 'scanner' | 'cards' | 'spark' | 'terminal';
};

const PRESET_PALETTES: Array<{
  match: RegExp;
  accent: string;
  secondary: string;
}> = [
  { match: /amber|market|trading|finance|olx|listing|revenue/i, accent: '#FFB84D', secondary: '#39FF88' },
  { match: /research|search|browser|data|insight|analysis/i, accent: '#54D6FF', secondary: '#B9FFD4' },
  { match: /code|dev|build|deploy|sre|ops/i, accent: '#7DFF8A', secondary: '#FFD23F' },
  { match: /social|community|discord|telegram|support/i, accent: '#B088FF', secondary: '#66F2FF' },
  { match: /creative|image|art|design|video/i, accent: '#FF5FA2', secondary: '#FFD166' },
  { match: /security|audit|risk|alert|guard/i, accent: '#FF6B8A', secondary: '#FFB84D' },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toUpperCase();
  return null;
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  const [r1, g1, b1] =
    hue < 60 ? [c, x, 0]
      : hue < 120 ? [x, c, 0]
        : hue < 180 ? [0, c, x]
          : hue < 240 ? [0, x, c]
            : hue < 300 ? [x, 0, c]
              : [c, 0, x];
  const toHex = (channel: number) => Math.round((channel + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`.toUpperCase();
}

function mixHex(hex: string, target: string, amount: number): string {
  const parse = (value: string) => [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
  const [r, g, b] = parse(hex);
  const [tr, tg, tb] = parse(target);
  const blend = (a: number, z: number) => Math.round(a + (z - a) * amount);
  return `#${blend(r, tr).toString(16).padStart(2, '0')}${blend(g, tg).toString(16).padStart(2, '0')}${blend(b, tb).toString(16).padStart(2, '0')}`.toUpperCase();
}

function hexToNumber(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}

function sanitizeTrait(value: unknown, max = 48): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export function normalizeAvatarTraits(value: unknown): AvatarTraits | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const traits: AvatarTraits = {
    seed: sanitizeTrait(source.seed, 80),
    palette: sanitizeTrait(source.palette),
    accentColor: normalizeHex(source.accentColor) ?? undefined,
    secondaryColor: normalizeHex(source.secondaryColor) ?? undefined,
    emblem: sanitizeTrait(source.emblem),
    accessory: sanitizeTrait(source.accessory),
    mood: sanitizeTrait(source.mood),
  };
  return Object.values(traits).some(Boolean) ? traits : undefined;
}

function traitsText(traits?: AvatarTraits): string {
  if (!traits) return '';
  return [
    traits.seed,
    traits.palette,
    traits.accentColor,
    traits.secondaryColor,
    traits.emblem,
    traits.accessory,
    traits.mood,
  ].filter(Boolean).join(':');
}

function presetFor(text: string) {
  return PRESET_PALETTES.find((preset) => preset.match.test(text));
}

export function personalizePalette(
  base: FrameworkPalette,
  traits: AvatarTraits | undefined,
  seedInput: string,
): FrameworkPalette {
  const text = `${seedInput}:${traitsText(traits)}`;
  const seed = hashString(text || 'avatar');
  const preset = presetFor(text);
  const accent = normalizeHex(traits?.accentColor)
    ?? preset?.accent
    ?? hslToHex(seed % 360, 82, 62);
  const secondary = normalizeHex(traits?.secondaryColor)
    ?? preset?.secondary
    ?? hslToHex((seed * 7 + 88) % 360, 76, 72);
  const dim = mixHex(accent, '#000000', 0.34);
  const bright = mixHex(secondary, '#FFFFFF', 0.28);

  return {
    ...base,
    primary: hexToNumber(accent),
    dim: hexToNumber(dim),
    bright: hexToNumber(bright),
    primaryHex: accent,
    dimHex: dim,
    brightHex: bright,
  };
}

export function buildAvatarSignature(
  traits: AvatarTraits | undefined,
  seedInput: string,
): AvatarSignature {
  const text = `${seedInput}:${traitsText(traits)}`;
  const seed = hashString(text || 'avatar');
  const preset = presetFor(text);
  const accentHex = normalizeHex(traits?.accentColor)
    ?? preset?.accent
    ?? hslToHex(seed % 360, 82, 62);
  const secondaryHex = normalizeHex(traits?.secondaryColor)
    ?? preset?.secondary
    ?? hslToHex((seed * 7 + 88) % 360, 76, 72);
  const patterns: AvatarSignature['pattern'][] = ['rings', 'scanner', 'cards', 'spark', 'terminal'];
  const lowered = text.toLowerCase();
  const pattern =
    /listing|research|card|market|olx/.test(lowered) ? 'cards'
      : /scan|search|watch|monitor/.test(lowered) ? 'scanner'
        : /code|terminal|dev/.test(lowered) ? 'terminal'
          : patterns[seed % patterns.length] ?? 'rings';

  return {
    seed,
    accent: hexToNumber(accentHex),
    secondary: hexToNumber(secondaryHex),
    emblem: traits?.emblem ?? 'signature',
    accessory: traits?.accessory ?? 'identity mark',
    mood: traits?.mood ?? 'focused',
    pattern,
  };
}
