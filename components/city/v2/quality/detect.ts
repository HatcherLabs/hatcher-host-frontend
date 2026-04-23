export type Quality = 'high' | 'low';

/**
 * Decide a HIGH/LOW preset once per page load.
 *
 * Priority:
 *   1. ?quality=high|low URL override (for QA/demo)
 *   2. localStorage.cityQuality (user preference)
 *   3. Heuristic: mobile UA | low memory | low cores → LOW, else HIGH
 */
export function detectQuality(): Quality {
  if (typeof window === 'undefined') return 'low';

  const urlParam = new URLSearchParams(window.location.search).get('quality');
  if (urlParam === 'high' || urlParam === 'low') return urlParam;

  try {
    const stored = localStorage.getItem('cityQuality');
    if (stored === 'high' || stored === 'low') return stored;
  } catch {
    // localStorage blocked (private mode) → fall through to heuristic
  }

  const nav = navigator as Navigator & { deviceMemory?: number };
  const ua = nav.userAgent || '';
  const mobile = /Android|iPhone|iPad|Mobile/i.test(ua);
  const memory = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;

  if (mobile) return 'low';
  if (memory < 4) return 'low';
  if (cores < 4) return 'low';
  return 'high';
}
