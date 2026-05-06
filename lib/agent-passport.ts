import type {
  AgentPassport,
  AgentPassportNetwork,
  AgentPassportNetworkId,
  AgentPassportStatus,
} from './api/types';
import { API_URL, SOLANA_NETWORK } from './config';

interface PassportFallbackAgent {
  id?: string;
  slug?: string | null;
  name?: string;
  description?: string | null;
  avatarUrl?: string | null;
  framework?: string;
  status?: string;
  skaleWalletAddress?: string | null;
  skaleAgentId?: string | null;
  skaleRegisteredAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export function shortAddress(address: string | null | undefined): string {
  if (!address) return '-';
  return address.length > 16 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

export function networkStatusLabel(status: AgentPassportStatus): string {
  switch (status) {
    case 'registered':
      return 'Live';
    case 'wallet-ready':
      return 'Wallet ready';
    case 'planned':
      return 'Planned';
    case 'server-unconfigured':
      return 'Needs server config';
    case 'unavailable':
      return 'Unavailable';
  }
}

export function networkStatusTone(status: AgentPassportStatus): string {
  switch (status) {
    case 'registered':
      return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200';
    case 'wallet-ready':
      return 'border-sky-400/40 bg-sky-500/10 text-sky-200';
    case 'planned':
      return 'border-violet-400/35 bg-violet-500/10 text-violet-200';
    case 'server-unconfigured':
      return 'border-amber-400/40 bg-amber-500/10 text-amber-200';
    case 'unavailable':
      return 'border-neutral-600 bg-neutral-800 text-neutral-300';
  }
}

export function primaryPassportStatus(passport: AgentPassport | null): AgentPassportStatus {
  const primary = passport?.identity.networks.find((n) => n.id === passport.identity.primaryNetwork);
  return primary?.status ?? 'planned';
}

export function networkById(
  passport: AgentPassport | null,
  id: AgentPassportNetworkId,
): AgentPassportNetwork | null {
  return passport?.identity.networks.find((n) => n.id === id) ?? null;
}

export function buildFallbackPassport(agent: PassportFallbackAgent | null, routeAgentId: string): AgentPassport {
  const now = new Date().toISOString();
  const id = agent?.id ?? routeAgentId;
  const slug = agent?.slug ?? null;
  const publicId = slug ?? id;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hatcher.host';
  const apiBase = API_URL.replace(/\/+$/, '');
  const roomUrl = `${origin}/agent/${publicId}/room`;
  const profileUrl = `${origin}/agent/${publicId}`;
  const skaleStatus: AgentPassportStatus = agent?.skaleAgentId
    ? 'registered'
    : agent?.skaleWalletAddress
      ? 'wallet-ready'
      : 'planned';

  return {
    schemaVersion: 1,
    generatedAt: now,
    agent: {
      id,
      slug,
      name: agent?.name ?? publicId,
      description: agent?.description ?? null,
      framework: agent?.framework ?? 'openclaw',
      status: agent?.status ?? 'unknown',
      profileUrl,
      roomUrl,
      createdAt: agent?.createdAt ?? now,
      updatedAt: agent?.updatedAt ?? now,
    },
    avatar: {
      kind: 'hatcher-room-v2',
      stationId: 'agentAvatar',
      imageUrl: agent?.avatarUrl ?? null,
      roomUrl,
    },
    identity: {
      handle: `hatcher:${publicId}`,
      primaryNetwork: 'skale',
      networks: [
        {
          id: 'skale',
          label: 'SKALE Base',
          chainType: 'evm',
          status: skaleStatus,
          caip2: 'eip155:1187947933',
          walletAddress: agent?.skaleWalletAddress ?? null,
          agentId: agent?.skaleAgentId ?? null,
          registry: 'ERC-8004 Identity Registry',
          registryStatus: skaleStatus,
          registeredAt: agent?.skaleRegisteredAt ?? null,
          explorerUrl: agent?.skaleWalletAddress
            ? `https://skale-base-explorer.skalenodes.com/address/${agent.skaleWalletAddress}`
            : null,
        },
        {
          id: 'base',
          label: 'Base',
          chainType: 'evm',
          status: 'planned',
          caip2: 'eip155:8453',
          chainId: 8453,
          walletAddress: agent?.skaleWalletAddress ?? null,
          agentId: null,
          registry: 'ERC-8004 Identity Registry',
          registryStatus: 'planned',
          registeredAt: null,
          explorerUrl: agent?.skaleWalletAddress
            ? `https://basescan.org/address/${agent.skaleWalletAddress}`
            : null,
          sharedWalletWith: agent?.skaleWalletAddress ? 'skale' : undefined,
        },
        {
          id: 'solana',
          label: 'Solana',
          chainType: 'solana',
          status: 'planned',
          caip2: `solana:${SOLANA_NETWORK}`,
          walletAddress: null,
          agentId: null,
          registry: 'Solana Agent Registry / 8004-Solana',
          registryStatus: 'planned',
          registeredAt: null,
          explorerUrl: null,
        },
      ],
    },
    wallets: [
      {
        id: 'agent-evm',
        chainType: 'evm',
        status: agent?.skaleWalletAddress ? 'wallet-ready' : 'planned',
        address: agent?.skaleWalletAddress ?? null,
        networks: ['skale', 'base'],
        signerMode: 'receive-only',
      },
      {
        id: 'agent-solana',
        chainType: 'solana',
        status: 'planned',
        address: null,
        networks: ['solana'],
        signerMode: 'planned',
      },
    ],
    runtime: {
      signerMode: 'receive-only',
      trading: {
        status: 'disabled',
        networks: [],
        requiresExplicitUserIntent: true,
        quoteProviders: [
          {
            id: 'jupiter',
            network: 'solana',
            status: 'disabled',
            baseUrl: 'https://api.jup.ag',
          },
        ],
        notes: ['Runtime signing is disabled; wallets are receive-only from inside the agent process.'],
      },
    },
    payments: [
      {
        id: 'x402-skale-usdc',
        protocol: 'x402',
        network: 'skale',
        status: 'planned',
        caip2: 'eip155:1187947933',
        asset: null,
        receivingAddress: null,
        facilitatorUrl: null,
      },
      {
        id: 'x402-base-usdc',
        protocol: 'x402',
        network: 'base',
        status: 'planned',
        caip2: 'eip155:8453',
        asset: null,
        receivingAddress: null,
        facilitatorUrl: null,
      },
      {
        id: 'x402-solana-usdc',
        protocol: 'x402',
        network: 'solana',
        status: 'planned',
        caip2: `solana:${SOLANA_NETWORK}`,
        asset: null,
        receivingAddress: null,
        facilitatorUrl: null,
      },
    ],
    mcp: {
      status: 'planned',
      manifestUrl: `${apiBase}/agents/${publicId}/mcp/manifest.json`,
      notes: ['Reserved for the agent MCP manifest.'],
    },
    links: {
      profile: profileUrl,
      room: roomUrl,
      passport: `${apiBase}/agents/${publicId}/passport.json`,
      skaleMetadata: `${apiBase}/agents/${id}/skale-metadata.json`,
    },
  };
}
