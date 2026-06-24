import { describe, expect, it } from 'vitest';

import {
  buildMetaplexRegistrationButtonState,
  formatMetaplexStatusLabel,
  getMetaplexPublicLinks,
  humanizeMetaplexError,
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
    image: 'https://hatcher.host/icon.png',
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

  it('turns low-level registration errors into owner-facing copy', () => {
    expect(humanizeMetaplexError('METAPLEX_NOT_CONFIGURED')).toBe(
      'Metaplex registration is not enabled for this agent yet.',
    );
    expect(humanizeMetaplexError('insufficient funds for fee')).toBe(
      'The Hatcher payer wallet needs more SOL before this mainnet registration can be submitted.',
    );
  });
});
