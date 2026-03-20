// ─── Centralized external URLs and configuration ─────────────
// All external links in one place. Environment variables override defaults.

export const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL || 'http://localhost:3003';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';

export const SOCIAL_LINKS = {
  twitter: 'https://x.com/hatcherfun',
  discord: 'https://discord.gg/hatcher',
  telegram: 'https://t.me/hatcherfun',
  github: 'https://github.com/HatcherLabs',
} as const;

export const EXTERNAL_LINKS = {
  openclaw: 'https://openclaw.org',
  clawhub: 'https://clawhub.org',
  jupiterSwap: 'https://jup.ag/swap/SOL-HATCH',
  supportEmail: 'support@hatcher.fun',
} as const;
