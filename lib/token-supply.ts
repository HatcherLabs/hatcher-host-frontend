import { HATCH_TOKEN_MINT } from './config';
import { HATCHER_ORIGINAL_SUPPLY, HATCHER_ORIGINAL_SUPPLY_RAW, HATCHER_TOKEN_DECIMALS } from './token-burns';

export interface TokenSupply {
  currentSupply: number;
  totalBurned: number | null;
  burnedShareOfOriginalSupply: number | null;
  generatedAt: string;
}

// Keep the inexpensive supply read independent of the slower transaction scan.
// This is a server-side reader; RPC credentials never enter the public payload.
export async function loadTokenSupply(): Promise<TokenSupply | null> {
  try {
    const rpc = process.env.HELIUS_API_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const response = await fetch(rpc, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenSupply',
        params: [HATCH_TOKEN_MINT, { commitment: 'confirmed' }] }),
      next: { revalidate: 300 }, signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const value = data?.result?.value;
    if (data?.error || value?.decimals !== HATCHER_TOKEN_DECIMALS
      || typeof value.amount !== 'string' || !/^\d{1,16}$/.test(value.amount)) return null;
    const raw = BigInt(value.amount);
    const currentSupply = Number(raw) / 10 ** HATCHER_TOKEN_DECIMALS;
    const totalBurned = raw <= HATCHER_ORIGINAL_SUPPLY_RAW
      ? Number(HATCHER_ORIGINAL_SUPPLY_RAW - raw) / 10 ** HATCHER_TOKEN_DECIMALS : null;
    const date = response.headers.get('date');
    return {
      currentSupply, totalBurned,
      burnedShareOfOriginalSupply: totalBurned === null ? null : totalBurned / HATCHER_ORIGINAL_SUPPLY,
      generatedAt: date && Number.isFinite(Date.parse(date))
        ? new Date(date).toISOString() : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
