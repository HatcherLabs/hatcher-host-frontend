import { useCallback } from 'react';
import { haptic, hapticNotification, isNative } from '@/lib/capacitor';

/**
 * Hook for haptic feedback on mobile. No-op on web.
 */
export function useHaptic() {
  const tap = useCallback(() => haptic('light'), []);
  const press = useCallback(() => haptic('medium'), []);
  const heavy = useCallback(() => haptic('heavy'), []);
  const success = useCallback(() => hapticNotification('success'), []);
  const warning = useCallback(() => hapticNotification('warning'), []);
  const error = useCallback(() => hapticNotification('error'), []);

  return { tap, press, heavy, success, warning, error, isNative };
}
