import { HATCH_TOKEN_MINT } from './config';

export const HATCHER_BURN_CACHE_SECONDS = 6 * 60 * 60;
export const HATCHER_BURN_SCAN_LIMIT = 250;
export const HATCHER_BURN_PAGE_SIZE = 1_000;
export const HATCHER_BURN_HELIUS_SEARCH_PAGES = 1;
export const HATCHER_TOKEN_DECIMALS = 6;
export const HATCHER_ORIGINAL_SUPPLY = 1_000_000_000;
export const HATCHER_ORIGINAL_SUPPLY_RAW =
  BigInt(HATCHER_ORIGINAL_SUPPLY) * 10n ** BigInt(HATCHER_TOKEN_DECIMALS);

export type TokenBurnEvent = {
  id: string;
  signature: string;
  slot: number | null;
  blockTime: number | null;
  amount: number;
  amountRaw: string | null;
  authority: string | null;
  source: string | null;
  instructionType: 'burn' | 'burnChecked';
  explorerUrl: string;
};

export type TokenBurnPeriodTotals = {
  day: number;
  week: number;
  month: number;
};

export type TokenBurnSummary = {
  mint: string;
  explorerUrl: string;
  totalBurned: number;
  totalBurnedRaw: string;
  burnCount: number;
  currentSupply: number | null;
  currentSupplyRaw: string | null;
  burnedShareOfOriginalSupply: number | null;
  latestBurnAt: number | null;
  periodTotals: TokenBurnPeriodTotals;
  scannedSignatures: number;
  scannedTransactions: number;
  generatedAt: string;
  cacheTtlSeconds: number;
  source?: string;
  burns: TokenBurnEvent[];
};

type RpcSignature = {
  signature: string;
  slot?: number;
  blockTime?: number | null;
  err?: unknown;
};

type RpcTokenAmount = {
  amount?: string;
  decimals?: number;
  uiAmount?: number | null;
  uiAmountString?: string;
};

type RpcParsedInstruction = {
  program?: string;
  programId?: string;
  parsed?: {
    type?: string;
    info?: {
      mint?: string;
      source?: string;
      account?: string;
      authority?: string;
      owner?: string;
      amount?: string;
      tokenAmount?: RpcTokenAmount;
    };
  };
};

type RpcParsedTransaction = {
  slot?: number;
  blockTime?: number | null;
  transaction?: {
    signatures?: string[];
    message?: {
      instructions?: RpcParsedInstruction[];
    };
  };
  meta?: {
    err?: unknown;
    innerInstructions?: Array<{
      index?: number;
      instructions?: RpcParsedInstruction[];
    }>;
  };
};

type RpcResult<T> = {
  result?: T;
  error?: {
    code?: number;
    message?: string;
  };
};

type TokenSupplyValue = {
  amount?: string;
  decimals?: number;
  uiAmount?: number | null;
  uiAmountString?: string;
};

type HeliusEnhancedTransaction = {
  signature?: string;
  slot?: number;
  timestamp?: number;
  type?: string;
  feePayer?: string;
  tokenTransfers?: Array<{
    fromUserAccount?: string | null;
    toUserAccount?: string | null;
    fromTokenAccount?: string | null;
    toTokenAccount?: string | null;
    tokenAmount?: number;
    mint?: string;
  }>;
};

type FetchBurnSummaryOptions = {
  mint?: string;
  rpcUrl?: string;
  scanLimit?: number;
  now?: Date;
};

export function resolveSolanaRpcUrl(): string {
  if (process.env.HELIUS_API_KEY) {
    return `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  }
  if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
  return process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
}

export async function fetchHatcherBurnSummary(
  options: FetchBurnSummaryOptions = {},
): Promise<TokenBurnSummary> {
  const mint = options.mint ?? HATCH_TOKEN_MINT;
  const rpcUrl = options.rpcUrl ?? resolveSolanaRpcUrl();
  const scanLimit = Math.max(1, Math.min(options.scanLimit ?? HATCHER_BURN_SCAN_LIMIT, HATCHER_BURN_SCAN_LIMIT));
  const now = options.now ?? new Date();

  if (!options.rpcUrl && process.env.HELIUS_API_KEY) {
    const [heliusResult, supply] = await Promise.all([
      fetchHeliusBurnEvents(mint),
      fetchTokenSupply(rpcUrl, mint).catch(() => null),
    ]);
    return summarizeBurnEvents({
      mint,
      burns: heliusResult.burns,
      currentSupply: amountFromTokenAmount(supply ?? undefined),
      currentSupplyRaw: supply?.amount ?? null,
      scannedSignatures: heliusResult.scannedTransactions,
      scannedTransactions: heliusResult.scannedTransactions,
      generatedAt: now.toISOString(),
    });
  }

  const [signatures, supply] = await Promise.all([
    fetchSignaturesForAddress(rpcUrl, mint, scanLimit),
    fetchTokenSupply(rpcUrl, mint).catch(() => null),
  ]);

  const successfulSignatures = signatures.filter((item) => !item.err);
  const transactions: RpcParsedTransaction[] = [];

  for (const signature of successfulSignatures) {
    const tx = await fetchParsedTransaction(rpcUrl, signature.signature).catch(() => null);
    if (tx) transactions.push(tx);
  }

  if (successfulSignatures.length > 0 && transactions.length === 0) {
    throw new Error('Solana RPC did not return parsed transactions for the burn scan');
  }

  const burns = extractBurnEvents(transactions, mint);
  return summarizeBurnEvents({
    mint,
    burns,
    currentSupply: amountFromTokenAmount(supply ?? undefined),
    currentSupplyRaw: supply?.amount ?? null,
    scannedSignatures: signatures.length,
    scannedTransactions: transactions.length,
    generatedAt: now.toISOString(),
  });
}

async function fetchHeliusBurnEvents(mint: string): Promise<{
  burns: TokenBurnEvent[];
  scannedTransactions: number;
}> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) return { burns: [], scannedTransactions: 0 };

  const transactions: HeliusEnhancedTransaction[] = [];
  let scannedTransactions = 0;
  let beforeSignature: string | null = null;
  const maxPages = Number.parseInt(process.env.HATCHER_BURN_HELIUS_SEARCH_PAGES ?? '', 10)
    || HATCHER_BURN_HELIUS_SEARCH_PAGES;

  for (let page = 0; page < maxPages; page += 1) {
    const url = new URL(`https://api-mainnet.helius-rpc.com/v0/addresses/${mint}/transactions`);
    url.searchParams.set('api-key', apiKey);
    url.searchParams.set('type', 'BURN');
    url.searchParams.set('limit', '100');
    url.searchParams.set('commitment', 'confirmed');
    if (beforeSignature) url.searchParams.set('before-signature', beforeSignature);

    const response = await fetch(url, { cache: 'no-store' });
    const text = await response.text();

    if (!response.ok) {
      const nextBefore = extractHeliusBeforeSignature(text);
      if (!nextBefore) {
        throw new Error('Helius burn history request failed');
      }
      beforeSignature = nextBefore;
      scannedTransactions += 50;
      continue;
    }

    const pageTransactions = JSON.parse(text) as HeliusEnhancedTransaction[];
    transactions.push(...pageTransactions);
    scannedTransactions += pageTransactions.length;

    const lastSignature = pageTransactions[pageTransactions.length - 1]?.signature;
    if (!lastSignature || pageTransactions.length === 0) break;
    beforeSignature = lastSignature;
    if (pageTransactions.length < 100) break;
  }

  const burns = transactions.flatMap((transaction, transactionIndex) => {
    const signature = transaction.signature;
    if (!signature) return [];

    const transfers = transaction.tokenTransfers?.filter((transfer) => {
      return transfer.mint === mint
        && typeof transfer.tokenAmount === 'number'
        && transfer.tokenAmount > 0
        && (!transfer.toUserAccount || !transfer.toTokenAccount);
    }) ?? [];

    return transfers.map((transfer, transferIndex): TokenBurnEvent => ({
      id: `${signature}:${transactionIndex}:${transferIndex}`,
      signature,
      slot: typeof transaction.slot === 'number' ? transaction.slot : null,
      blockTime: typeof transaction.timestamp === 'number' ? transaction.timestamp : null,
      amount: transfer.tokenAmount ?? 0,
      amountRaw: transfer.tokenAmount
        ? decimalToRawString(transfer.tokenAmount, HATCHER_TOKEN_DECIMALS)
        : null,
      authority: transaction.feePayer ?? transfer.fromUserAccount ?? null,
      source: transfer.fromTokenAccount ?? null,
      instructionType: 'burn',
      explorerUrl: solscanTxUrl(signature),
    }));
  });

  return {
    burns: burns.sort((a, b) => (b.blockTime ?? 0) - (a.blockTime ?? 0)),
    scannedTransactions,
  };
}

function extractHeliusBeforeSignature(text: string): string | null {
  const match = text.match(/before-signature` parameter set to ([1-9A-HJ-NP-Za-km-z]+)/);
  return match?.[1] ?? null;
}

export function extractBurnEvents(
  transactions: RpcParsedTransaction[],
  mint: string = HATCH_TOKEN_MINT,
): TokenBurnEvent[] {
  const events: TokenBurnEvent[] = [];

  for (const tx of transactions) {
    if (tx.meta?.err) continue;
    const signature = tx.transaction?.signatures?.[0];
    if (!signature) continue;

    let instructionOffset = 0;
    const collect = (instructions: RpcParsedInstruction[] | undefined) => {
      for (const instruction of instructions ?? []) {
        const parsed = instruction.parsed;
        const type = parsed?.type;
        const info = parsed?.info;
        if ((type !== 'burn' && type !== 'burnChecked') || !info || info.mint !== mint) {
          instructionOffset += 1;
          continue;
        }

        const tokenAmount = amountFromTokenAmount(info.tokenAmount);
        const rawAmount = info.tokenAmount?.amount ?? info.amount ?? null;
        const fallbackAmount = rawAmount ? Number(rawAmount) / 10 ** HATCHER_TOKEN_DECIMALS : 0;
        const amount = tokenAmount ?? fallbackAmount;
        if (!Number.isFinite(amount) || amount <= 0) {
          instructionOffset += 1;
          continue;
        }

        events.push({
          id: `${signature}:${instructionOffset}`,
          signature,
          slot: typeof tx.slot === 'number' ? tx.slot : null,
          blockTime: typeof tx.blockTime === 'number' ? tx.blockTime : null,
          amount,
          amountRaw: rawAmount,
          authority: info.authority ?? info.owner ?? null,
          source: info.source ?? info.account ?? null,
          instructionType: type,
          explorerUrl: solscanTxUrl(signature),
        });
        instructionOffset += 1;
      }
    };

    collect(tx.transaction?.message?.instructions);
    for (const inner of tx.meta?.innerInstructions ?? []) {
      collect(inner.instructions);
    }
  }

  return events.sort((a, b) => (b.blockTime ?? 0) - (a.blockTime ?? 0));
}

export function summarizeBurnEvents(params: {
  mint?: string;
  burns: TokenBurnEvent[];
  currentSupply?: number | null;
  currentSupplyRaw?: string | null;
  scannedSignatures?: number;
  scannedTransactions?: number;
  generatedAt?: string;
  now?: Date;
  source?: string;
}): TokenBurnSummary {
  const mint = params.mint ?? HATCH_TOKEN_MINT;
  const nowMs = params.now?.getTime() ?? Date.now();
  const trackedBurned = params.burns.reduce((sum, burn) => sum + burn.amount, 0);
  const supplyBurned = burnedAmountFromSupply(params.currentSupply ?? null, params.currentSupplyRaw ?? null);
  const totalBurned = supplyBurned?.amount ?? trackedBurned;
  const totalBurnedRaw = supplyBurned?.raw ?? decimalToRawString(trackedBurned, HATCHER_TOKEN_DECIMALS);

  return {
    mint,
    explorerUrl: solscanTokenUrl(mint),
    totalBurned,
    totalBurnedRaw,
    burnCount: params.burns.length,
    currentSupply: params.currentSupply ?? null,
    currentSupplyRaw: params.currentSupplyRaw ?? null,
    burnedShareOfOriginalSupply: totalBurned / HATCHER_ORIGINAL_SUPPLY,
    latestBurnAt: params.burns[0]?.blockTime ?? null,
    periodTotals: {
      day: totalSince(params.burns, nowMs, 24 * 60 * 60 * 1_000),
      week: totalSince(params.burns, nowMs, 7 * 24 * 60 * 60 * 1_000),
      month: totalSince(params.burns, nowMs, 30 * 24 * 60 * 60 * 1_000),
    },
    scannedSignatures: params.scannedSignatures ?? 0,
    scannedTransactions: params.scannedTransactions ?? 0,
    generatedAt: params.generatedAt ?? new Date(nowMs).toISOString(),
    cacheTtlSeconds: HATCHER_BURN_CACHE_SECONDS,
    source: params.source,
    burns: params.burns.slice(0, 24),
  };
}

async function fetchSignaturesForAddress(
  rpcUrl: string,
  address: string,
  scanLimit: number,
): Promise<RpcSignature[]> {
  const signatures: RpcSignature[] = [];
  let before: string | undefined;

  while (signatures.length < scanLimit) {
    const limit = Math.min(HATCHER_BURN_PAGE_SIZE, scanLimit - signatures.length);
    const page = await rpcCall<RpcSignature[]>(rpcUrl, 'getSignaturesForAddress', [
      address,
      { limit, ...(before ? { before } : {}) },
    ]);

    if (!page.length) break;
    signatures.push(...page);
    before = page[page.length - 1]?.signature;
    if (!before || page.length < limit) break;
  }

  return signatures;
}

async function fetchParsedTransaction(
  rpcUrl: string,
  signature: string,
): Promise<RpcParsedTransaction | null> {
  return rpcCall<RpcParsedTransaction | null>(rpcUrl, 'getTransaction', [
    signature,
    { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' },
  ]);
}

async function fetchTokenSupply(
  rpcUrl: string,
  mint: string,
): Promise<TokenSupplyValue | null> {
  const response = await rpcCall<{ value?: TokenSupplyValue } | null>(rpcUrl, 'getTokenSupply', [
    mint,
    { commitment: 'confirmed' },
  ]);
  return response?.value ?? null;
}

async function rpcCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        cache: 'no-store',
      });
      const payload = await response.json() as RpcResult<T>;
      if (payload.error) {
        throw new Error(payload.error.message || `RPC error ${payload.error.code ?? 'unknown'}`);
      }
      return payload.result as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 2) await sleep(250 * (attempt + 1));
    }
  }

  throw lastError ?? new Error(`RPC ${method} failed`);
}

function amountFromTokenAmount(tokenAmount?: RpcTokenAmount): number | null {
  if (!tokenAmount) return null;
  if (tokenAmount.uiAmountString) {
    const parsed = Number(tokenAmount.uiAmountString);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof tokenAmount.uiAmount === 'number' && Number.isFinite(tokenAmount.uiAmount)) {
    return tokenAmount.uiAmount;
  }
  if (tokenAmount.amount) {
    const raw = Number(tokenAmount.amount);
    const decimals = tokenAmount.decimals ?? HATCHER_TOKEN_DECIMALS;
    if (Number.isFinite(raw)) return raw / 10 ** decimals;
  }
  return null;
}

function burnedAmountFromSupply(currentSupply: number | null, currentSupplyRaw: string | null): {
  amount: number;
  raw: string;
} | null {
  if (currentSupplyRaw && /^\d+$/.test(currentSupplyRaw)) {
    const burnedRaw = HATCHER_ORIGINAL_SUPPLY_RAW - BigInt(currentSupplyRaw);
    const raw = burnedRaw > 0n ? burnedRaw.toString() : '0';
    return {
      amount: Number(raw) / 10 ** HATCHER_TOKEN_DECIMALS,
      raw,
    };
  }

  if (currentSupply !== null) {
    const amount = Math.max(0, HATCHER_ORIGINAL_SUPPLY - currentSupply);
    return {
      amount,
      raw: decimalToRawString(amount, HATCHER_TOKEN_DECIMALS),
    };
  }

  return null;
}

function totalSince(burns: TokenBurnEvent[], nowMs: number, windowMs: number): number {
  const cutoff = nowMs - windowMs;
  return burns.reduce((sum, burn) => {
    if (!burn.blockTime || burn.blockTime * 1_000 < cutoff) return sum;
    return sum + burn.amount;
  }, 0);
}

function decimalToRawString(value: number, decimals: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return Math.round(value * 10 ** decimals).toString();
}

function solscanTxUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}`;
}

function solscanTokenUrl(mint: string): string {
  return `https://solscan.io/token/${mint}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
