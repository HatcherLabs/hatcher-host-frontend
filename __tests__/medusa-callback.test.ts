import { afterEach, describe, expect, it } from 'vitest';

import {
  buildMedusaAgentReturnPath,
  buildMedusaCallbackUrl,
  decodeMedusaCallbackState,
  encodeMedusaCallbackState,
} from '@/lib/medusa-callback';

describe('medusa callback helpers', () => {
  const originalBuffer = globalThis.Buffer;

  afterEach(() => {
    globalThis.Buffer = originalBuffer;
  });

  it('round-trips opaque state for a Hatcher agent', () => {
    const state = encodeMedusaCallbackState({
      agentId: 'agent-1',
      campaignId: 'hatcher-agent-presale',
      claimWallet: 'ESbGCiveNEWmSRnW9quAo5XU7BUzkk2j1ZyacdFA7zAs',
    });

    expect(state).not.toContain('agent-1');
    expect(decodeMedusaCallbackState(state)).toMatchObject({
      agentId: 'agent-1',
      campaignId: 'hatcher-agent-presale',
      claimWallet: 'ESbGCiveNEWmSRnW9quAo5XU7BUzkk2j1ZyacdFA7zAs',
    });
  });

  it('builds a return path that opens the Medusa provider panel', () => {
    expect(buildMedusaAgentReturnPath('agent-1')).toBe(
      '/dashboard/agent/agent-1?tab=wallet&walletSection=providers&walletProvider=medusa&medusaCallback=1',
    );
  });

  it('builds a locale-aware callback URL for Medusa partner deep links', () => {
    expect(buildMedusaCallbackUrl('https://hatcher.host', '/fr/dashboard/agent/agent-1')).toBe(
      'https://hatcher.host/fr/medusa/callback',
    );
    expect(buildMedusaCallbackUrl('https://hatcher.host/', '/dashboard/agent/agent-1')).toBe(
      'https://hatcher.host/medusa/callback',
    );
  });

  it('does not rely on browser Buffer polyfills supporting base64url', () => {
    const BrowserBufferPolyfill = function BufferPolyfill() {} as unknown as typeof Buffer;
    BrowserBufferPolyfill.from = (() => ({
      toString: (encoding?: string) => {
        if (encoding === 'base64url') throw new TypeError('Unknown encoding: base64url');
        return 'ignored';
      },
    })) as unknown as typeof Buffer.from;
    globalThis.Buffer = BrowserBufferPolyfill;

    const state = encodeMedusaCallbackState({
      agentId: 'agent-1',
      campaignId: 'hatcher-agent-presale',
    });

    expect(decodeMedusaCallbackState(state)).toMatchObject({
      agentId: 'agent-1',
      campaignId: 'hatcher-agent-presale',
    });
  });
});
