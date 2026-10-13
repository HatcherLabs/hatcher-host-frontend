import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { rememberAuthReturn, readAuthReturn } from '@/lib/auth-return';
describe('email registration destination', () => {
  const storage = new Map<string, string>();
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it('preserves a chat destination across email tabs', () => { rememberAuthReturn('/'); expect(readAuthReturn()).toBe('/'); });
  it('rejects external destinations when saving and reading', () => {
    rememberAuthReturn('//evil.example'); expect(readAuthReturn()).toBe('/dashboard');
    storage.set('hatcher.auth.return', JSON.stringify({path:'https://evil.example', expires:Date.now()+1000}));
    expect(readAuthReturn()).toBe('/dashboard');
  });
  it('expires old destinations', () => {
    rememberAuthReturn('/assistants'); vi.spyOn(Date,'now').mockReturnValue(Date.now()+86400001);
    expect(readAuthReturn()).toBe('/dashboard'); expect(storage.size).toBe(0);
  });
  it('survives malformed or unavailable storage', () => {
    storage.set('hatcher.auth.return','broken'); expect(readAuthReturn()).toBe('/dashboard');
    vi.stubGlobal('localStorage', {getItem: () => {throw Error('blocked')},setItem: () => {throw Error('blocked')}});
    expect(() => rememberAuthReturn('/')).not.toThrow(); expect(readAuthReturn()).toBe('/dashboard');
  });
});
