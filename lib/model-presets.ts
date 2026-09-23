'use client';

export type ModelPreset = {
  id: string;
  name: string;
  description: string;
  provider: string;
  model: string;
  useCustomModel: boolean;
  customModelInput: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
};

export const MODEL_PRESETS_STORAGE_KEY = 'hatcher-model-presets-v1';
export const MODEL_PRESETS_CHANGED = 'hatcher-model-presets-changed';

export function modelPresetId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `preset-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isModelPreset(value: unknown): value is ModelPreset {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const source = value as Record<string, unknown>;
  return typeof source.id === 'string'
    && typeof source.name === 'string'
    && typeof source.provider === 'string'
    && typeof source.model === 'string';
}

export function sanitizeModelPreset(value: ModelPreset): ModelPreset {
  return {
    id: value.id,
    name: value.name,
    description: value.description ?? '',
    provider: value.provider,
    model: value.model,
    useCustomModel: Boolean(value.useCustomModel),
    customModelInput: value.customModelInput ?? '',
    favorite: Boolean(value.favorite),
    createdAt: Number(value.createdAt) || Date.now(),
    updatedAt: Number(value.updatedAt) || Date.now(),
  };
}

export function readModelPresets(): ModelPreset[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(MODEL_PRESETS_STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter(isModelPreset).map(sanitizeModelPreset) : [];
  } catch { return []; }
}

export function writeModelPresets(presets: ModelPreset[]): void {
  window.localStorage.setItem(MODEL_PRESETS_STORAGE_KEY, JSON.stringify(presets.map(sanitizeModelPreset)));
  window.dispatchEvent(new Event(MODEL_PRESETS_CHANGED));
}