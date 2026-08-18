import { describe, expect, it } from 'vitest';

import { isImmersiveChromePath, stripLocaleForChrome } from './routeChrome';

describe('route chrome classification', () => {
  it('treats locale-prefixed marketing routes as immersive', () => {
    expect(stripLocaleForChrome('/de')).toBe('/');
    expect(stripLocaleForChrome('/ro/pricing')).toBe('/pricing');

    expect(isImmersiveChromePath('/de')).toBe(true);
    expect(isImmersiveChromePath('/ro/pricing')).toBe(true);
    expect(isImmersiveChromePath('/zh/features')).toBe(true);
    expect(isImmersiveChromePath('/en/usage')).toBe(true);
  });

  it('keeps localized app routes in the global chrome', () => {
    expect(stripLocaleForChrome('/fr/dashboard/agents')).toBe('/dashboard/agents');
    expect(isImmersiveChromePath('/fr/dashboard/agents')).toBe(false);
  });

  it('lets embeddable agent routes own the full iframe viewport', () => {
    expect(isImmersiveChromePath('/embed/agent/my-agent')).toBe(true);
  });

  it('lets standalone demo routes provide their own site chrome', () => {
    expect(isImmersiveChromePath('/demo/hatch')).toBe(true);
  });
});
