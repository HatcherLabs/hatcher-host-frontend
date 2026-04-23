import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detectQuality } from './detect';

interface NavLike {
  userAgent?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
}
interface WinLike {
  location: { search: string };
}

function setEnv(win: WinLike | undefined, nav: NavLike | undefined, storage?: Partial<Storage>) {
  vi.stubGlobal('window', win);
  vi.stubGlobal('navigator', nav);
  vi.stubGlobal('localStorage', {
    getItem: storage?.getItem ?? (() => null),
    setItem: storage?.setItem ?? (() => {}),
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  });
}

describe('detectQuality', () => {
  beforeEach(() => {
    // Default to a beefy, cache-free desktop
    setEnv(
      { location: { search: '' } },
      {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/120',
        hardwareConcurrency: 8,
        deviceMemory: 8,
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns low when window is undefined (SSR)', () => {
    setEnv(undefined, undefined);
    expect(detectQuality()).toBe('low');
  });

  it('respects ?quality=high URL override', () => {
    setEnv(
      { location: { search: '?quality=high' } },
      { userAgent: 'Android Pixel 5', hardwareConcurrency: 2, deviceMemory: 2 },
    );
    expect(detectQuality()).toBe('high');
  });

  it('respects ?quality=low URL override on beefy desktop', () => {
    setEnv(
      { location: { search: '?quality=low' } },
      {
        userAgent: 'Mozilla/5.0 (Macintosh) Chrome',
        hardwareConcurrency: 8,
        deviceMemory: 8,
      },
    );
    expect(detectQuality()).toBe('low');
  });

  it('respects localStorage preference when no URL param', () => {
    setEnv(
      { location: { search: '' } },
      {
        userAgent: 'Mozilla/5.0 (Macintosh) Chrome',
        hardwareConcurrency: 8,
        deviceMemory: 8,
      },
      { getItem: (k: string) => (k === 'cityQuality' ? 'low' : null) },
    );
    expect(detectQuality()).toBe('low');
  });

  it('returns low for mobile UA', () => {
    setEnv(
      { location: { search: '' } },
      { userAgent: 'Mozilla/5.0 (iPhone) Safari', hardwareConcurrency: 6, deviceMemory: 4 },
    );
    expect(detectQuality()).toBe('low');
  });

  it('returns low when deviceMemory < 4', () => {
    setEnv(
      { location: { search: '' } },
      {
        userAgent: 'Mozilla/5.0 (Macintosh) Chrome',
        hardwareConcurrency: 8,
        deviceMemory: 2,
      },
    );
    expect(detectQuality()).toBe('low');
  });

  it('returns low when hardwareConcurrency < 4', () => {
    setEnv(
      { location: { search: '' } },
      {
        userAgent: 'Mozilla/5.0 (Macintosh) Chrome',
        hardwareConcurrency: 2,
        deviceMemory: 8,
      },
    );
    expect(detectQuality()).toBe('low');
  });

  it('returns high for beefy desktop', () => {
    expect(detectQuality()).toBe('high');
  });
});
