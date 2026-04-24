export type Quality = 'low' | 'medium' | 'high';

export function detectDefaultQuality(): Quality {
  if (typeof navigator === 'undefined') return 'medium';
  const ua = navigator.userAgent;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 4;
  if (mobile || cores <= 4) return 'low';
  if (cores >= 8) return 'high';
  return 'medium';
}
