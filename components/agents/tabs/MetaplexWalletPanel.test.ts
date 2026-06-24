import { describe, expect, it } from 'vitest';

import {
  buildMetaplexRegistrationButtonState,
  formatMetaplexStatusLabel,
  getMetaplexAvatarPreview,
  getMetaplexProfileUrl,
  getMetaplexPublicLinks,
  getMetaplexRegisteredLinks,
  humanizeMetaplexError,
  shouldShowMetaplexMainnetConfirmation,
  validateMetaplexAvatarFile,
} from './MetaplexWalletPanel';
import type { MetaplexConfigStatus } from '@/lib/api';

const READY_CONFIG: MetaplexConfigStatus = {
  enabled: true,
  registrationEnabled: true,
  configured: true,
  status: 'metadata-ready',
  missing: [],
  capabilities: {
    metadata: true,
    registration: true,
    x402: true,
    executive: false,
    genesis: false,
  },
  metadataUri: 'https://api.hatcher.host/agents/agent-1/metaplex/registration.json',
  coreAssetMetadataUri: 'https://api.hatcher.host/agents/agent-1/metaplex/core-asset.json',
  metaplexStatus: 'metadata-ready',
  solanaWalletAddress: 'Hatch111111111111111111111111111111111111111',
  metaplexAsset: null,
  registryAddress: 'mpl-agent-registry',
  registeredAt: null,
  registrationDocument: {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'Hatch',
    description: 'HatcherLabs agent',
    image: 'https://hatcher.host/hatcher-metaplex-avatar.png',
    services: [],
    active: true,
    x402Support: true,
    registrations: [],
    supportedTrust: ['reputation', 'crypto-economic'],
    hatcher: {
      agentId: 'agent-1',
      slug: 'hatch',
      runtime: 'openclaw',
      owner: 'user-1',
      createdAt: '2026-06-24T00:00:00.000Z',
      profile: 'https://hatcher.host/agent/hatch',
      registrationUri: 'https://api.hatcher.host/agents/agent-1/metaplex/registration.json',
    },
  },
};

describe('Metaplex wallet panel helpers', () => {
  it('labels the user-facing registration state', () => {
    expect(formatMetaplexStatusLabel('wallet-missing')).toBe('Solana wallet needed');
    expect(formatMetaplexStatusLabel('metadata-ready')).toBe('Ready to register');
    expect(formatMetaplexStatusLabel('registered')).toBe('Registered');
  });

  it('requires an explicit mainnet confirmation before registering', () => {
    expect(buildMetaplexRegistrationButtonState(READY_CONFIG, false)).toEqual({
      disabled: true,
      label: 'Review and confirm mainnet',
      reason: 'Confirm the mainnet registration before submitting.',
    });

    expect(buildMetaplexRegistrationButtonState(READY_CONFIG, true)).toEqual({
      disabled: false,
      label: 'Register on Metaplex',
      reason: null,
    });
  });

  it('does not offer registration when the agent is already registered', () => {
    expect(buildMetaplexRegistrationButtonState({
      ...READY_CONFIG,
      status: 'registered',
      metaplexAsset: 'MetaplexAsset1111111111111111111111111',
      registeredAt: '2026-06-24T10:00:00.000Z',
    }, true)).toEqual({
      disabled: true,
      label: 'Registered',
      reason: 'This agent already has a Metaplex identity.',
    });
  });

  it('surfaces public metadata links users should review first', () => {
    expect(getMetaplexPublicLinks(READY_CONFIG)).toEqual([
      {
        label: 'Agent registration JSON',
        href: 'https://api.hatcher.host/agents/agent-1/metaplex/registration.json',
      },
      {
        label: 'Core asset metadata',
        href: 'https://api.hatcher.host/agents/agent-1/metaplex/core-asset.json',
      },
    ]);
  });

  it('builds the user-facing Metaplex profile link from the registered asset', () => {
    expect(getMetaplexProfileUrl('AHyHiHQojvS2QeL4MdxzWD8Yjrnf1P1SF5SegtyKauZj')).toBe(
      'https://www.metaplex.com/agents/AHyHiHQojvS2QeL4MdxzWD8Yjrnf1P1SF5SegtyKauZj',
    );
  });

  it('summarizes the avatar Metaplex will show', () => {
    expect(getMetaplexAvatarPreview(READY_CONFIG)).toEqual({
      image: 'https://hatcher.host/hatcher-metaplex-avatar.png',
      label: 'Metaplex profile image',
      helper: 'Uses the agent avatar when one is set; otherwise Hatcher uses the default agent avatar.',
    });
  });

  it('only accepts image files for custom Metaplex avatars', () => {
    expect(validateMetaplexAvatarFile({ type: 'image/png', size: 128_000 })).toBeNull();
    expect(validateMetaplexAvatarFile({ type: 'image/webp', size: 128_000 })).toBeNull();
    expect(validateMetaplexAvatarFile({ type: 'text/plain', size: 128_000 })).toBe('Choose an image file.');
    expect(validateMetaplexAvatarFile({ type: '', size: 128_000 })).toBe('Choose an image file.');
    expect(validateMetaplexAvatarFile({ type: 'image/avif', size: 128_000 })).toBe('Choose a PNG, JPG, WebP, GIF, or SVG image.');
  });

  it('keeps uploaded avatars below the API data URL limit', () => {
    expect(validateMetaplexAvatarFile({ type: 'image/png', size: 1_450_000 })).toBeNull();
    expect(validateMetaplexAvatarFile({ type: 'image/png', size: 1_450_001 })).toBe('Choose an image up to 1.45 MB.');
  });

  it('does not show the mainnet confirmation panel once an asset exists', () => {
    expect(shouldShowMetaplexMainnetConfirmation(null)).toBe(true);
    expect(shouldShowMetaplexMainnetConfirmation('AHyHiHQojvS2QeL4MdxzWD8Yjrnf1P1SF5SegtyKauZj')).toBe(false);
  });

  it('prioritizes Metaplex profile links after registration', () => {
    expect(getMetaplexRegisteredLinks('AHyHiHQojvS2QeL4MdxzWD8Yjrnf1P1SF5SegtyKauZj', '5tx')).toEqual([
      {
        label: 'Metaplex profile',
        href: 'https://www.metaplex.com/agents/AHyHiHQojvS2QeL4MdxzWD8Yjrnf1P1SF5SegtyKauZj',
      },
      {
        label: 'Core asset on Solscan',
        href: 'https://solscan.io/account/AHyHiHQojvS2QeL4MdxzWD8Yjrnf1P1SF5SegtyKauZj',
      },
      {
        label: 'Registration transaction',
        href: 'https://solscan.io/tx/5tx',
      },
    ]);
  });

  it('turns low-level registration errors into owner-facing copy', () => {
    expect(humanizeMetaplexError('METAPLEX_NOT_CONFIGURED')).toBe(
      'Metaplex registration is not enabled for this agent yet.',
    );
    expect(humanizeMetaplexError('insufficient funds for fee')).toBe(
      'The Hatcher payer wallet needs more SOL before this mainnet registration can be submitted.',
    );
  });
});
