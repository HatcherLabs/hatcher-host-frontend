// ─── Centralized external URLs and configuration ─────────────
// All external links in one place. Environment variables override defaults.

export const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL || 'http://localhost:3003';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://hatcher.host');

// Solana mainnet RPC for read-only wallet UX. Public mainnet-beta is
// rate-limited but adequate — the backend proxies anything that needs a
// premium provider (Helius).
//
// ⚠ SECURITY: NEVER set NEXT_PUBLIC_SOLANA_RPC to a URL that contains a
// private API key (e.g. `?api-key=...`). Anything with the NEXT_PUBLIC_
// prefix is baked into the client bundle at build time and becomes
// publicly readable. If you need an authenticated RPC, route the
// request through a server-side proxy endpoint instead.
//
// The build fails (see scripts/check-public-env.mjs) if this var
// contains a suspicious api-key parameter.
export const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

export const SOLANA_NETWORK =
  process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta';

// Browser wallet/payment flows use public RPC directly by default. Do not route
// unauthenticated browsers through our server-side premium RPC proxy; that route
// protects paid upstream keys and is only for explicitly authorized server-side
// callers.
export const SOLANA_RPC_BROWSER_ENDPOINT =
  new URL(
    process.env.NEXT_PUBLIC_SOLANA_RPC_BROWSER_ENDPOINT || SOLANA_RPC,
    PUBLIC_SITE_URL,
  ).toString();

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

// $KAUSA SPL mint on Solana mainnet. Partner token payment rail.
export const KAUSA_TOKEN_MINT =
  process.env.NEXT_PUBLIC_KAUSA_MINT || 'BWXSNRBKMviG68MqavyssnzDq4qSArcN7eNYjqEfpump';

export const SOCIAL_LINKS = {
  twitter: 'https://x.com/HatcherLabs',
  github: 'https://github.com/HatcherLabs',
  telegram: 'https://t.me/HatcherLabs',
} as const;
