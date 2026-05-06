// ============================================================
// SKALE x402 client — Phase 4 of the SKALE integration.
//
// Hand-rolled (no viem / wagmi / RainbowKit) to keep the
// frontend bundle lean. Talks to any EIP-1193 wallet
// (MetaMask, Rabby, Frame, Coinbase Wallet) via window.ethereum
// and produces an X-PAYMENT header in the exact format the
// PayAI facilitator expects:
//
//   header value = base64( JSON.stringify({
//     x402Version: 1,
//     scheme: 'exact',
//     network: 'eip155:<chainId>',
//     payload: {
//       authorization: { from, to, value, validAfter, validBefore, nonce },
//       signature: '0x...'
//     }
//   }))
//
// The signature is a standard EIP-3009 transferWithAuthorization
// produced by eth_signTypedData_v4 — same primitive Coinbase's
// reference x402 client uses, just without the SDK overhead.
// ============================================================

import { API_URL } from '@/lib/config';

export interface PaymentRequirementsRow {
  scheme: string;
  network: string;
  payTo: string;
  maxAmountRequired: string;
  asset: string;
  description: string;
  mimeType: string;
  resource: string;
  maxTimeoutSeconds: number;
  extra: { name: string; version: string; decimals?: number };
}

export interface CheckoutResponse {
  x402Version: number;
  accepts: PaymentRequirementsRow[];
  error?: string;
}

export interface PaymentTarget {
  kind: 'tier' | 'addon';
  key: string;
  billingPeriod?: 'monthly' | 'annual';
  agentId?: string;
}

export interface SettleResult {
  paymentId: string;
  featureId: string | null;
  txSignature: string;
  amount: string;
  payer: string;
  network: string;
  usd: number;
  description: string;
  duplicate: boolean;
  proratedCredit?: number;
}

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

function getProvider(): Eip1193Provider | null {
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum ?? null;
}

const SKALE_BASE_MAINNET_HEX = '0x46cea59d'; // 1187947933
const SKALE_BASE_MAINNET = {
  chainId: SKALE_BASE_MAINNET_HEX,
  chainName: 'SKALE Base Mainnet',
  nativeCurrency: { name: 'sFUEL', symbol: 'sFUEL', decimals: 18 },
  rpcUrls: ['https://skale-base.skalenodes.com/v1/base'],
  blockExplorerUrls: ['https://skale-base-explorer.skalenodes.com'],
};
const BASE_MAINNET_HEX = '0x2105'; // 8453
const BASE_MAINNET = {
  chainId: BASE_MAINNET_HEX,
  chainName: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org'],
};
export type EvmX402Network = 'skale' | 'base';

export class WalletNotInstalledError extends Error {
  constructor() {
    super('No EVM wallet detected. Install MetaMask, Rabby, or any EIP-1193-compatible wallet.');
    this.name = 'WalletNotInstalledError';
  }
}

/** Connect MetaMask / Rabby / etc. and return the user's address. */
export async function connectEvmWallet(): Promise<string> {
  const eth = getProvider();
  if (!eth) throw new WalletNotInstalledError();
  const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts || accounts.length === 0) throw new Error('No accounts returned by wallet');
  return accounts[0]!;
}

/** Switch the user's wallet to SKALE Base Mainnet. Adds the chain
 *  if the wallet doesn't know about it yet (error code 4902). */
export async function ensureSkaleChain(): Promise<void> {
  return ensureEvmX402Chain('skale');
}

export async function ensureBaseChain(): Promise<void> {
  return ensureEvmX402Chain('base');
}

async function ensureEvmX402Chain(network: EvmX402Network): Promise<void> {
  const eth = getProvider();
  if (!eth) throw new WalletNotInstalledError();
  const chainId = network === 'base' ? BASE_MAINNET_HEX : SKALE_BASE_MAINNET_HEX;
  const chainConfig = network === 'base' ? BASE_MAINNET : SKALE_BASE_MAINNET;
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    });
  } catch (e) {
    const code = (e as { code?: number }).code;
    if (code === 4902 || code === -32603) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [chainConfig],
      });
      return;
    }
    throw e;
  }
}

/** Random 32-byte hex (0x-prefixed) suitable for an EIP-3009 nonce. */
function randomBytes32(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return '0x' + Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

interface Authorization {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
}

/** Build the EIP-712 typed-data envelope for an EIP-3009
 *  TransferWithAuthorization message and sign it via the user's
 *  wallet. Returns the 0x-prefixed signature. */
async function signTransferWithAuthorization(
  signer: string,
  authorization: Authorization,
  requirements: PaymentRequirementsRow,
): Promise<string> {
  const eth = getProvider();
  if (!eth) throw new WalletNotInstalledError();

  const chainId = parseInt(requirements.network.split(':')[1] ?? '0', 10);
  const typedData = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization',
    domain: {
      name: requirements.extra.name,
      version: requirements.extra.version,
      chainId,
      verifyingContract: requirements.asset,
    },
    message: authorization,
  };

  const signature = (await eth.request({
    method: 'eth_signTypedData_v4',
    params: [signer, JSON.stringify(typedData)],
  })) as string;

  return signature;
}

/** Browser-safe base64 encode of a UTF-8 string. */
function base64Encode(input: string): string {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(input)));
  }
  return Buffer.from(input, 'utf8').toString('base64');
}

/** Build the X-PAYMENT header value for the given requirements. */
async function buildXPaymentHeader(
  signer: string,
  requirements: PaymentRequirementsRow,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const authorization: Authorization = {
    from: signer,
    to: requirements.payTo,
    value: requirements.maxAmountRequired,
    validAfter: String(now - 600),
    validBefore: String(now + (requirements.maxTimeoutSeconds ?? 300)),
    nonce: randomBytes32(),
  };
  const signature = await signTransferWithAuthorization(signer, authorization, requirements);

  const paymentPayload = {
    x402Version: 1,
    scheme: requirements.scheme,
    network: requirements.network,
    payload: { authorization, signature },
  };
  return base64Encode(JSON.stringify(paymentPayload));
}

/** Drive the full pay-with-USDC flow end-to-end. Throws on any
 *  step that fails (wallet rejected, chain switch failed, server
 *  /verify or /settle returned an error). */
export async function payWithEvmX402(
  target: PaymentTarget,
  network: EvmX402Network = 'skale',
): Promise<SettleResult> {
  const account = await connectEvmWallet();
  await ensureEvmX402Chain(network);
  const routePrefix = network === 'base' ? 'base-x402' : 'skale-x402';

  // Step 1 — fetch the 402 requirements blob from the server.
  const checkoutRes = await fetch(`${API_URL}/payments/${routePrefix}/checkout`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(target),
  });
  // The /checkout endpoint replies with HTTP 402 on success — the
  // 402 body is the actual payment requirements blob. We only fall
  // through to the error branch when the server itself errored
  // (503 = X402_DISABLED, 400 = invalid input, etc.).
  if (checkoutRes.status !== 402) {
    const errBody = await checkoutRes.json().catch(() => null);
    throw new Error(errBody?.error ?? `checkout failed (${checkoutRes.status})`);
  }
  const checkoutBody = (await checkoutRes.json()) as { data: CheckoutResponse };
  const requirements = checkoutBody.data?.accepts?.[0];
  if (!requirements) throw new Error('Server returned no payment requirements');

  // Step 2 — sign the EIP-3009 authorization.
  const xPayment = await buildXPaymentHeader(account, requirements);

  // Step 3 — submit the signed header to /settle.
  const settleRes = await fetch(`${API_URL}/payments/${routePrefix}/settle`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'x-payment': xPayment,
    },
    body: JSON.stringify(target),
  });
  const settleBody = (await settleRes.json()) as { success: boolean; data?: SettleResult; error?: string };
  if (!settleBody.success || !settleBody.data) {
    throw new Error(settleBody.error ?? `settle failed (${settleRes.status})`);
  }
  return settleBody.data;
}

export async function payWithSkaleX402(target: PaymentTarget): Promise<SettleResult> {
  return payWithEvmX402(target, 'skale');
}

export async function payWithBaseX402(target: PaymentTarget): Promise<SettleResult> {
  return payWithEvmX402(target, 'base');
}

export type SolanaUsdcSender = (
  usdAmount: number,
  label: string,
  recipientWallet?: string,
) => Promise<string>;

function rawUsdcToHuman(raw: string, decimals = 6): number {
  const value = BigInt(raw);
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  return Number(whole) + Number(fraction) / Number(base);
}

export async function payWithSolanaX402(
  target: PaymentTarget,
  sendUsdc: SolanaUsdcSender,
): Promise<SettleResult> {
  const checkoutRes = await fetch(`${API_URL}/payments/solana-x402/checkout`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(target),
  });
  if (checkoutRes.status !== 402) {
    const errBody = await checkoutRes.json().catch(() => null);
    throw new Error(errBody?.error ?? `checkout failed (${checkoutRes.status})`);
  }

  const checkoutBody = (await checkoutRes.json()) as { data: CheckoutResponse };
  const requirements = checkoutBody.data?.accepts?.[0];
  if (!requirements) throw new Error('Server returned no payment requirements');

  const amount = rawUsdcToHuman(requirements.maxAmountRequired, requirements.extra.decimals ?? 6);
  const txSignature = await sendUsdc(amount, requirements.description, requirements.payTo);
  const xPayment = base64Encode(JSON.stringify({
    x402Version: 1,
    scheme: requirements.scheme,
    network: requirements.network,
    payload: {
      txSignature,
      signature: txSignature,
      transaction: txSignature,
    },
  }));

  const settleRes = await fetch(`${API_URL}/payments/solana-x402/settle`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'x-payment': xPayment,
    },
    body: JSON.stringify({ ...target, txSignature }),
  });
  const settleBody = (await settleRes.json()) as { success: boolean; data?: SettleResult; error?: string };
  if (!settleBody.success || !settleBody.data) {
    throw new Error(settleBody.error ?? `settle failed (${settleRes.status})`);
  }
  return settleBody.data;
}
