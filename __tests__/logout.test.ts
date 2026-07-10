import { describe, expect, it, vi } from 'vitest';
import { logoutWithImmediateCleanup } from '@/lib/logout';

describe('logout cleanup', () => {
  it('clears local state immediately even when server revocation never resolves', async () => {
    const cleanup = vi.fn();
    const order: string[] = [];
    const operation = logoutWithImmediateCleanup({
      revoke: () => {
        order.push('revoke');
        return new Promise(() => {});
      },
      cleanup: () => {
        order.push('cleanup');
        cleanup();
      },
      timeoutMs: 5,
    });

    expect(cleanup).toHaveBeenCalledOnce();
    expect(order).toEqual(['revoke', 'cleanup']);
    await expect(operation).rejects.toThrow('server session revocation timed out');
  });

  it('surfaces a failed server response after cleanup', async () => {
    const cleanup = vi.fn();
    await expect(logoutWithImmediateCleanup({
      revoke: async () => ({ success: false, error: 'Redis unavailable' }),
      cleanup,
    })).rejects.toThrow('Redis unavailable');
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
