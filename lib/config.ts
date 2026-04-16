// ─── Centralized external URLs and configuration ─────────────
// All external links in one place. Environment variables override defaults.

export const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL || 'http://localhost:3003';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Solana mainnet RPC. Override with NEXT_PUBLIC_SOLANA_RPC to use
// Helius/Quicknode/etc in dev. Public mainnet-beta is rate-limited but
// fine for read-only wallet UX; the backend uses Helius for verification.
export const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

// Treasury wallet — all on-chain payments go here. Backend verifies
// tx.destination matches this exact pubkey before activating features.
export const TREASURY_WALLET =
  process.env.NEXT_PUBLIC_TREASURY_WALLET || '21L6VVRAuxk87sXggz8exhPCm1w4qWyKEs6SDauyyRAW';

// $HATCHER SPL mint on Solana mainnet.
export const HATCH_TOKEN_MINT =
  process.env.NEXT_PUBLIC_HATCH_MINT || 'Cntmo5DJNQkB2vYyS4mUx2UoTW4mPrHgWefz8miZpump';

// USDC SPL mint on Solana mainnet (Circle).
export const USDC_TOKEN_MINT =
  process.env.NEXT_PUBLIC_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export const SOCIAL_LINKS = {
  twitter: 'https://x.com/HatcherLabs',
  github: 'https://github.com/HatcherLabs',
  telegram: 'https://t.me/HatcherLabs',
} as const;

