import { useQuality } from './quality/QualityContext';
import type { Quality } from './quality/detect';

/**
 * Pure path-building helper — easier to test than the hook.
 *
 * Input is a path relative to `/assets/3d/`. For `.glb` files the
 * quality suffix is inserted before the extension (matches what
 * scripts/process-3d-asset.mjs writes). Non-GLB files (HDRIs,
 * textures) are returned as-is with only the base prefix.
 */
export function buildAssetPath(relative: string, quality: Quality): string {
  const base = '/assets/3d/';
  if (relative.endsWith('.glb')) {
    const stem = relative.slice(0, -'.glb'.length);
    return `${base}${stem}.${quality}.glb`;
  }
  return `${base}${relative}`;
}

export function useAssetPath(relative: string): string {
  const quality = useQuality();
  return buildAssetPath(relative, quality);
}
