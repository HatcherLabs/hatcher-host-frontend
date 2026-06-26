import { describe, expect, it, vi } from 'vitest';
import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

import {
  buildMetaplexTokenLaunchButtonState,
  buildMetaplexTokenLaunchDefaults,
  buildMetaplexTokenLaunchPayload,
  buildMetaplexRegistrationButtonState,
  deriveMetaplexTokenSymbol,
  estimateMetaplexLaunchWalletFundingLamports,
  formatMetaplexStatusLabel,
  getMetaplexAvatarPreview,
  getMetaplexAssetSignerWallet,
  getMetaplexProfileUrl,
  getMetaplexPublicLinks,
  getMetaplexRegisteredLinks,
  getMetaplexTokenLaunchBalanceError,
  getMetaplexTokenLinks,
  humanizeMetaplexError,
  isMetaplexBlockhashExpiryError,
  METAPLEX_TOKEN_LAUNCH_MIN_LAMPORTS,
  isMetaplexIrysImageUrl,
  signAndSendMetaplexTransactions,
  signMetaplexTransactions,
  shouldShowMetaplexMainnetConfirmation,
  validateMetaplexAvatarFile,
  validateMetaplexTokenImageFile,
  waitForMetaplexSignatureConfirmation,
} from './MetaplexWalletPanel';
import type { MetaplexConfigStatus, MetaplexTokenLaunchPlan } from '@/lib/api';

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
  agentToken: null,
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

const REGISTERED_CONFIG: MetaplexConfigStatus = {
  ...READY_CONFIG,
  status: 'registered',
  metaplexStatus: 'registered',
  metaplexAsset: 'MetaplexAsset1111111111111111111111111',
  registeredAt: '2026-06-24T10:00:00.000Z',
  capabilities: {
    ...READY_CONFIG.capabilities,
    genesis: true,
  },
};

const READY_TOKEN_PLAN: MetaplexTokenLaunchPlan = {
  kind: 'metaplex.genesis-agent-token.v1',
  sdkFunction: 'createAndRegisterLaunch',
  ready: true,
  status: 'ready',
  missing: [],
  oneTokenPerAgent: true,
  existingToken: null,
  request: {
    wallet: 'Payer111111111111111111111111111111111111111',
    network: 'solana-mainnet',
    agent: {
      mint: 'MetaplexAsset1111111111111111111111111',
      setToken: true,
    },
    launchType: 'bondingCurve',
    token: {
      name: 'Hatch Token',
      symbol: 'HATCH',
      image: 'https://gateway.irys.xyz/hatch-token-image',
    },
    launch: {},
  },
  notes: [],
};

function makeEncodedMetaplexTransaction(): string {
  const wallet = new PublicKey('11111111111111111111111111111111');
  const tx = new Transaction({
    feePayer: wallet,
    recentBlockhash: '11111111111111111111111111111111',
  }).add(SystemProgram.transfer({
    fromPubkey: wallet,
    toPubkey: wallet,
    lamports: 0,
  }));
  return Buffer.from(tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  })).toString('base64');
}

function makeSignedNonWalletMetaplexTransaction(): string {
  const signer = Keypair.generate();
  const tx = new Transaction({
    feePayer: signer.publicKey,
    recentBlockhash: '11111111111111111111111111111111',
  }).add(SystemProgram.transfer({
    fromPubkey: signer.publicKey,
    toPubkey: signer.publicKey,
    lamports: 0,
  }));
  tx.sign(signer);
  return Buffer.from(tx.serialize()).toString('base64');
}

function makeUnsignedLocalSignerMetaplexTransaction(signer: Keypair, lamports = 0): string {
  const tx = new Transaction({
    feePayer: signer.publicKey,
    recentBlockhash: '11111111111111111111111111111111',
  }).add(SystemProgram.transfer({
    fromPubkey: signer.publicKey,
    toPubkey: signer.publicKey,
    lamports,
  }));
  return Buffer.from(tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  })).toString('base64');
}

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

    expect(buildMetaplexRegistrationButtonState(READY_CONFIG, true, false)).toEqual({
      disabled: true,
      label: 'Connect wallet',
      reason: 'Connect the Solana wallet that will own and pay for the Metaplex registration.',
    });
  });

  it('blocks registration while a custom avatar is still uploading', () => {
    expect(buildMetaplexRegistrationButtonState(READY_CONFIG, true, true, true)).toEqual({
      disabled: true,
      label: 'Uploading avatar',
      reason: 'Wait for the avatar upload to finish before registering on Metaplex.',
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

  it('derives the Metaplex agent wallet from the Core asset, not the Hatcher Solana wallet', () => {
    const asset = 'AHyHiHQojvS2QeL4MdxzWD8Yjrnf1P1SF5SegtyKauZj';
    const hatcherSolanaWallet = 'Birv6WKC6royqRKTX2MCVPuueeRCSKPBaj5eDg5tsVWz';

    expect(getMetaplexAssetSignerWallet(asset)).toBe('BHpMijtXxnVzdwweVrqtP95JUHtrf5SRVFCgVgSigDyB');
    expect(getMetaplexAssetSignerWallet(asset)).not.toBe(hatcherSolanaWallet);
  });

  it('blocks token launch before Phantom when the connected wallet cannot cover Genesis costs', () => {
    expect(getMetaplexTokenLaunchBalanceError(15_931_991)).toBe(
      'The connected wallet has 0.0159 SOL. Add at least 0.06 SOL before launching this Metaplex token.',
    );
    expect(getMetaplexTokenLaunchBalanceError(METAPLEX_TOKEN_LAUNCH_MIN_LAMPORTS)).toBeNull();
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
    expect(validateMetaplexAvatarFile({ type: 'image/jpeg', size: 128_000 })).toBeNull();
    expect(validateMetaplexAvatarFile({ type: 'image/webp', size: 128_000 })).toBeNull();
    expect(validateMetaplexAvatarFile({ type: 'text/plain', size: 128_000 })).toBe('Choose an image file.');
    expect(validateMetaplexAvatarFile({ type: '', size: 128_000 })).toBe('Choose an image file.');
    expect(validateMetaplexAvatarFile({ type: 'image/gif', size: 128_000 })).toBe('Choose a PNG, JPG, or WebP image.');
    expect(validateMetaplexAvatarFile({ type: 'image/svg+xml', size: 128_000 })).toBe('Choose a PNG, JPG, or WebP image.');
    expect(validateMetaplexAvatarFile({ type: 'image/avif', size: 128_000 })).toBe('Choose a PNG, JPG, or WebP image.');
  });

  it('keeps uploaded avatars within the Irys upload limit', () => {
    expect(validateMetaplexAvatarFile({ type: 'image/png', size: 5_000_000 })).toBeNull();
    expect(validateMetaplexAvatarFile({ type: 'image/png', size: 5_000_001 })).toBe('Choose an image up to 5 MB.');
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
      'The connected wallet needs more SOL before this mainnet transaction can be submitted.',
    );
    expect(humanizeMetaplexError('AccountNotFound')).toBe(
      'The connected wallet needs SOL on Solana mainnet before Metaplex can prepare this transaction.',
    );
  });

  it('recognizes Solana blockhash expiry confirmation errors', () => {
    expect(isMetaplexBlockhashExpiryError(
      new Error('Signature 3AA has expired: block height exceeded.'),
    )).toBe(true);
    expect(isMetaplexBlockhashExpiryError(
      Object.assign(new Error('transaction was not confirmed'), { name: 'TransactionExpiredBlockheightExceededError' }),
    )).toBe(true);
    expect(isMetaplexBlockhashExpiryError(new Error('User rejected the request.'))).toBe(false);
  });

  it('recovers a Metaplex signature when status finalizes after confirmation expiry', async () => {
    const connection = {
      getSignatureStatus: vi.fn()
        .mockResolvedValueOnce({ value: null })
        .mockResolvedValueOnce({
          value: {
            confirmationStatus: 'finalized',
            confirmations: null,
            err: null,
          },
        }),
    };

    await expect(waitForMetaplexSignatureConfirmation(connection, '3AA', 2, 0)).resolves.toBe(true);
    expect(connection.getSignatureStatus).toHaveBeenCalledWith('3AA', { searchTransactionHistory: true });
  });

  it('fails a Metaplex signature when the chain reports an on-chain error', async () => {
    const connection = {
      getSignatureStatus: vi.fn().mockResolvedValue({
        value: {
          confirmationStatus: 'confirmed',
          confirmations: 1,
          err: { InstructionError: [0, 'Custom'] },
        },
      }),
    };

    await expect(waitForMetaplexSignatureConfirmation(connection, '3AA', 1, 0)).rejects.toThrow(
      'Transaction failed on-chain',
    );
  });

  it('submits Metaplex transactions through wallet sendTransaction when available', async () => {
    const wallet = {
      publicKey: new PublicKey('11111111111111111111111111111111'),
      signTransaction: vi.fn(async () => ({ serialize: () => new Uint8Array([9]) })),
      sendTransaction: vi.fn(async () => 'register-signature'),
    };
    const connection = {
      sendRawTransaction: vi.fn(async () => 'register-signature'),
      confirmTransaction: vi.fn(async () => ({ value: { err: null } })),
      getSignatureStatus: vi.fn(),
    };

    await expect(signAndSendMetaplexTransactions(
      [makeEncodedMetaplexTransaction()],
      wallet as never,
      connection as never,
      { blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 123 },
    )).resolves.toEqual(['register-signature']);

    expect(wallet.signTransaction).not.toHaveBeenCalled();
    expect(wallet.sendTransaction).toHaveBeenCalledTimes(1);
    expect(wallet.sendTransaction).toHaveBeenCalledWith(expect.anything(), connection, {
      maxRetries: 5,
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    expect(connection.sendRawTransaction).not.toHaveBeenCalled();
    expect(connection.confirmTransaction).toHaveBeenCalledWith({
      signature: 'register-signature',
      blockhash: '11111111111111111111111111111111',
      lastValidBlockHeight: 123,
    }, 'confirmed');
  });

  it('signs a wallet-first Metaplex registration transaction without broadcasting it', async () => {
    const wallet = {
      publicKey: new PublicKey('11111111111111111111111111111111'),
      signTransaction: vi.fn(async () => ({ serialize: () => new Uint8Array([7, 8, 9]) })),
      sendTransaction: vi.fn(),
    };

    await expect(signMetaplexTransactions(
      [makeEncodedMetaplexTransaction()],
      wallet as never,
    )).resolves.toEqual([Buffer.from([7, 8, 9]).toString('base64')]);

    expect(wallet.signTransaction).toHaveBeenCalledTimes(1);
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });

  it('signs and raw-sends multi-step Metaplex launch transactions sequentially', async () => {
    const events: string[] = [];
    let signedIndex = 0;
    const wallet = {
      publicKey: new PublicKey('11111111111111111111111111111111'),
      signTransaction: vi.fn(async () => {
        signedIndex += 1;
        const serializedValue = signedIndex;
        events.push(`sign-${serializedValue}`);
        return { serialize: () => new Uint8Array([serializedValue]) };
      }),
      signAllTransactions: vi.fn(),
      sendTransaction: vi.fn(async (_transaction: Transaction, _connection: unknown, options: { skipPreflight?: boolean }) => {
        const signature = `send-${events.filter((event) => event.startsWith('send-')).length + 1}`;
        events.push(signature);
        expect(options.skipPreflight).toBe(true);
        return signature;
      }),
    };
    const connection = {
      sendRawTransaction: vi.fn(async (raw: Uint8Array) => {
        const label = `send-${raw[0]}`;
        events.push(label);
        return label;
      }),
      confirmTransaction: vi.fn(async (request: string | { signature: string }) => {
        const signature = typeof request === 'string' ? request : request.signature;
        events.push(`confirm-${signature}`);
        return { value: { err: null } };
      }),
      getSignatureStatus: vi.fn(),
    };

    await expect(signAndSendMetaplexTransactions(
      [makeEncodedMetaplexTransaction(), makeEncodedMetaplexTransaction()],
      wallet as never,
      connection as never,
      { blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 123 },
    )).resolves.toEqual(['send-1', 'send-2']);

    expect(wallet.signTransaction).toHaveBeenCalledTimes(2);
    expect(wallet.signAllTransactions).not.toHaveBeenCalled();
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
    expect(events).toEqual([
      'sign-1',
      'send-1',
      'confirm-send-1',
      'sign-2',
      'send-2',
      'confirm-send-2',
    ]);
    expect(connection.sendRawTransaction).toHaveBeenCalledWith(new Uint8Array([1]), {
      maxRetries: 5,
      skipPreflight: true,
    });
    expect(connection.sendRawTransaction).toHaveBeenCalledWith(new Uint8Array([2]), {
      maxRetries: 5,
      skipPreflight: true,
    });
  });

  it('broadcasts already signed Metaplex transactions that do not require the connected wallet', async () => {
    const wallet = {
      publicKey: new PublicKey('11111111111111111111111111111111'),
      signTransaction: vi.fn(),
      sendTransaction: vi.fn(async () => 'wallet-send-signature'),
    };
    const connection = {
      sendRawTransaction: vi.fn(async () => 'raw-send-signature'),
      confirmTransaction: vi.fn(async () => ({ value: { err: null } })),
      getSignatureStatus: vi.fn(),
    };

    await expect(signAndSendMetaplexTransactions(
      [makeSignedNonWalletMetaplexTransaction()],
      wallet as never,
      connection as never,
      { blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 123 },
    )).resolves.toEqual(['raw-send-signature']);

    expect(wallet.sendTransaction).not.toHaveBeenCalled();
    expect(wallet.signTransaction).not.toHaveBeenCalled();
    expect(connection.sendRawTransaction).toHaveBeenCalledTimes(1);
  });

  it('signs temporary launch wallet transactions locally before raw broadcast', async () => {
    const launchSigner = Keypair.generate();
    const serialized = makeUnsignedLocalSignerMetaplexTransaction(launchSigner, 1234);
    const wallet = {
      publicKey: new PublicKey('11111111111111111111111111111111'),
      signTransaction: vi.fn(),
      sendTransaction: vi.fn(async () => 'wallet-send-signature'),
    };
    const connection = {
      sendRawTransaction: vi.fn(async () => 'local-send-signature'),
      confirmTransaction: vi.fn(async () => ({ value: { err: null } })),
      getSignatureStatus: vi.fn(),
    };

    expect(estimateMetaplexLaunchWalletFundingLamports(
      [serialized],
      launchSigner.publicKey.toBase58(),
    )).toBe(10_001_234);
    await expect(signAndSendMetaplexTransactions(
      [serialized],
      wallet as never,
      connection as never,
      { blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 123 },
      { localSigners: [launchSigner] },
    )).resolves.toEqual(['local-send-signature']);

    expect(wallet.sendTransaction).not.toHaveBeenCalled();
    expect(wallet.signTransaction).not.toHaveBeenCalled();
    expect(connection.sendRawTransaction).toHaveBeenCalledTimes(1);
  });

  it('falls back to raw signing when wallet sendTransaction is unavailable', async () => {
    const events: string[] = [];
    let signedIndex = 0;
    const wallet = {
      publicKey: new PublicKey('11111111111111111111111111111111'),
      signTransaction: vi.fn(async () => {
        signedIndex += 1;
        const serializedValue = signedIndex;
        return { serialize: () => new Uint8Array([serializedValue]) };
      }),
    };
    const connection = {
      sendRawTransaction: vi.fn(async (raw: Uint8Array) => {
        const label = `send-${raw[0]}`;
        events.push(label);
        return label;
      }),
      confirmTransaction: vi.fn(async (request: string | { signature: string }) => {
        const signature = typeof request === 'string' ? request : request.signature;
        events.push(`confirm-${signature}`);
        return { value: { err: null } };
      }),
      getSignatureStatus: vi.fn(),
    };

    await expect(signAndSendMetaplexTransactions(
      [makeEncodedMetaplexTransaction(), makeEncodedMetaplexTransaction()],
      wallet as never,
      connection as never,
      { blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 123 },
    )).resolves.toEqual(['send-1', 'send-2']);

    expect(wallet.signTransaction).toHaveBeenCalledTimes(2);
    expect(connection.sendRawTransaction).toHaveBeenCalledTimes(2);
    expect(events).toEqual([
      'send-1',
      'send-2',
      'confirm-send-1',
      'confirm-send-2',
    ]);
  });

  it('recognizes Solana blockhash expiry confirmation errors', () => {
    expect(isMetaplexBlockhashExpiryError(
      new Error('Signature 3AA has expired: block height exceeded.'),
    )).toBe(true);
    expect(isMetaplexBlockhashExpiryError(
      Object.assign(new Error('transaction was not confirmed'), { name: 'TransactionExpiredBlockheightExceededError' }),
    )).toBe(true);
    expect(isMetaplexBlockhashExpiryError(new Error('User rejected the request.'))).toBe(false);
  });

  it('recovers a Metaplex signature when status finalizes after confirmation expiry', async () => {
    const connection = {
      getSignatureStatus: vi.fn()
        .mockResolvedValueOnce({ value: null })
        .mockResolvedValueOnce({
          value: {
            confirmationStatus: 'finalized',
            confirmations: null,
            err: null,
          },
        }),
    };

    await expect(waitForMetaplexSignatureConfirmation(connection, '3AA', 2, 0)).resolves.toBe(true);
    expect(connection.getSignatureStatus).toHaveBeenCalledWith('3AA', { searchTransactionHistory: true });
  });

  it('fails a Metaplex signature when the chain reports an on-chain error', async () => {
    const connection = {
      getSignatureStatus: vi.fn().mockResolvedValue({
        value: {
          confirmationStatus: 'confirmed',
          confirmations: 1,
          err: { InstructionError: [0, 'Custom'] },
        },
      }),
    };

    await expect(waitForMetaplexSignatureConfirmation(connection, '3AA', 1, 0)).rejects.toThrow(
      'Transaction failed on-chain',
    );
  });

  it('derives compact token launch defaults from the registered agent metadata', () => {
    expect(deriveMetaplexTokenSymbol('Research Operator 42!')).toBe('RESEARCHOP');
    expect(deriveMetaplexTokenSymbol('Hatch')).toBe('HATCH');
    expect(buildMetaplexTokenLaunchDefaults(REGISTERED_CONFIG)).toEqual({
      name: 'Hatch Token',
      symbol: 'HATCH',
      image: '',
      description: 'HatcherLabs agent',
      externalLinks: {
        website: 'https://hatcher.host/agent/hatch',
        twitter: '',
        telegram: '',
      },
      launchType: 'bondingCurve',
      firstBuyAmount: '',
      launchpool: {
        tokenAllocation: '500000000',
        depositStartTime: '',
        raiseGoal: '',
        raydiumLiquidityBps: '5000',
        fundsRecipient: '',
      },
      confirmPermanentToken: false,
    });
  });

  it('builds bonding curve and launchpool payloads for user-signed Genesis launches', () => {
    const defaults = buildMetaplexTokenLaunchDefaults(REGISTERED_CONFIG);

    expect(buildMetaplexTokenLaunchPayload({
      ...defaults,
      image: 'https://gateway.irys.xyz/hatch-token-image',
      firstBuyAmount: '0',
      confirmPermanentToken: true,
    })).toEqual({
      name: 'Hatch Token',
      symbol: 'HATCH',
      image: 'https://gateway.irys.xyz/hatch-token-image',
      description: 'HatcherLabs agent',
      externalLinks: {
        website: 'https://hatcher.host/agent/hatch',
      },
      launchType: 'bondingCurve',
      confirmPermanentToken: true,
    });

    expect(buildMetaplexTokenLaunchPayload({
      ...defaults,
      image: 'https://gateway.irys.xyz/hatch-token-image',
      launchType: 'launchpool',
      launchpool: {
        tokenAllocation: '500000000',
        depositStartTime: '2026-07-01T12:00',
        raiseGoal: '250',
        raydiumLiquidityBps: '5000',
        fundsRecipient: 'UserWallet11111111111111111111111111111111111',
      },
      confirmPermanentToken: true,
    })).toMatchObject({
      launchType: 'launchpool',
      launchpool: {
        tokenAllocation: 500000000,
        depositStartTime: '2026-07-01T12:00',
        raiseGoal: 250,
        raydiumLiquidityBps: 5000,
        fundsRecipient: 'UserWallet11111111111111111111111111111111111',
      },
      confirmPermanentToken: true,
    });
  });

  it('recognizes token image URLs produced by Hatcher Irys uploads', () => {
    expect(isMetaplexIrysImageUrl('https://gateway.irys.xyz/hatch-token-image')).toBe(true);
    expect(isMetaplexIrysImageUrl('https://hatcher.host/hatcher-metaplex-avatar.png')).toBe(false);
    expect(isMetaplexIrysImageUrl('data:image/png;base64,AAAA')).toBe(false);
  });

  it('only accepts compact image files before token image upload', () => {
    expect(validateMetaplexTokenImageFile({ type: 'image/png', size: 500_000 })).toBeNull();
    expect(validateMetaplexTokenImageFile({ type: 'image/jpeg', size: 500_000 })).toBeNull();
    expect(validateMetaplexTokenImageFile({ type: 'image/webp', size: 500_000 })).toBeNull();
    expect(validateMetaplexTokenImageFile({ type: 'text/plain', size: 500_000 })).toBe('Choose a PNG, JPG, or WebP image.');
    expect(validateMetaplexTokenImageFile({ type: 'image/gif', size: 500_000 })).toBe('Choose a PNG, JPG, or WebP image.');
    expect(validateMetaplexTokenImageFile({ type: 'image/png', size: 5_000_001 })).toBe('Choose an image up to 5 MB.');
  });

  it('keeps the launch button disabled until the agent identity, plan, image, and confirmation are ready', () => {
    expect(buildMetaplexTokenLaunchButtonState(READY_CONFIG, READY_TOKEN_PLAN, {
      image: 'https://gateway.irys.xyz/hatch-token-image',
      confirmed: true,
      launching: false,
    })).toEqual({
      disabled: true,
      label: 'Register identity first',
      reason: 'Launch the Metaplex agent identity before creating its token.',
    });

    expect(buildMetaplexTokenLaunchButtonState(REGISTERED_CONFIG, {
      ...READY_TOKEN_PLAN,
      ready: false,
      missing: ['METAPLEX_GENESIS_ENABLED'],
      status: 'not_ready',
    }, {
      image: 'https://gateway.irys.xyz/hatch-token-image',
      confirmed: true,
      launching: false,
    })).toEqual({
      disabled: true,
      label: 'Token launch unavailable',
      reason: 'Missing: Genesis launch is not enabled',
    });

    expect(buildMetaplexTokenLaunchButtonState(REGISTERED_CONFIG, READY_TOKEN_PLAN, {
      image: '',
      confirmed: true,
      launching: false,
    })).toEqual({
      disabled: true,
      label: 'Upload token image',
      reason: 'Upload a PNG, JPG, or WebP image to Irys before launching.',
    });

    expect(buildMetaplexTokenLaunchButtonState(REGISTERED_CONFIG, READY_TOKEN_PLAN, {
      image: 'https://gateway.irys.xyz/hatch-token-image',
      confirmed: false,
      launching: false,
    })).toEqual({
      disabled: true,
      label: 'Review and confirm token',
      reason: 'Confirm the permanent one-token-per-agent launch before submitting.',
    });

    expect(buildMetaplexTokenLaunchButtonState(REGISTERED_CONFIG, READY_TOKEN_PLAN, {
      image: 'https://gateway.irys.xyz/hatch-token-image',
      confirmed: true,
      launching: false,
      walletConnected: false,
    })).toEqual({
      disabled: true,
      label: 'Connect wallet',
      reason: 'Connect the Solana wallet that will sign and pay for the agent token launch.',
    });

    expect(buildMetaplexTokenLaunchButtonState(REGISTERED_CONFIG, READY_TOKEN_PLAN, {
      image: 'https://gateway.irys.xyz/hatch-token-image',
      confirmed: true,
      launching: false,
      walletConnected: true,
    })).toEqual({
      disabled: false,
      label: 'Launch agent token',
      reason: null,
    });
  });

  it('shows a durable token launched state and launch links', () => {
    const launchedPlan: MetaplexTokenLaunchPlan = {
      ...READY_TOKEN_PLAN,
      ready: false,
      status: 'launched',
      missing: ['AGENT_TOKEN_ALREADY_SET'],
      existingToken: {
        mintAddress: 'TokenMint111111111111111111111111111111111',
        genesisAccount: 'Genesis1111111111111111111111111111111111',
        launchId: 'launch_123',
        launchUrl: 'https://www.metaplex.com/genesis/launch_123',
        launchedAt: '2026-06-25T08:00:00.000Z',
      },
    };

    expect(buildMetaplexTokenLaunchButtonState(REGISTERED_CONFIG, launchedPlan, {
      image: 'https://gateway.irys.xyz/hatch-token-image',
      confirmed: true,
      launching: false,
    })).toEqual({
      disabled: true,
      label: 'Token launched',
      reason: 'This agent already has its permanent Metaplex token.',
    });
    expect(getMetaplexTokenLinks(launchedPlan.existingToken)).toEqual([
      {
        label: 'Genesis launch',
        href: 'https://www.metaplex.com/genesis/launch_123',
      },
      {
        label: 'Token mint on Solscan',
        href: 'https://solscan.io/token/TokenMint111111111111111111111111111111111',
      },
      {
        label: 'Genesis account on Solscan',
        href: 'https://solscan.io/account/Genesis1111111111111111111111111111111111',
      },
    ]);
  });
});
