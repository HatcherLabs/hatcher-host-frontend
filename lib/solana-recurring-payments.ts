'use client';

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { createRevokeInstruction } from '@solana/spl-token';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import {
  AccountRole,
  address,
  createClient,
  createSolanaRpc,
  type Instruction,
  type TransactionSigner,
} from '@solana/kit';
import {
  findRecurringDelegationPda,
  findSubscriptionAuthorityPda,
  getCloseSubscriptionAuthorityOverlayInstructionAsync,
  getInitSubscriptionAuthorityOverlayInstructionAsync,
  getRevokeDelegationOverlayInstruction,
  subscriptionsProgram,
} from '@solana/subscriptions';
import { Buffer } from 'buffer';
import type {
  SolanaRecurringAuthorization,
  SolanaRecurringQuote,
  SolanaRecurringSetupRecordInput,
} from '@/lib/api/types';
import { SOLANA_SUBSCRIPTIONS_PROGRAM_ID } from '@/lib/config';

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

type SolanaRecurringRecordMessageInput = Omit<SolanaRecurringSetupRecordInput, 'walletProofSignature'>;

export interface SolanaRecurringSetupPlan {
  authorityTransaction: Transaction;
  delegationTransaction: Transaction;
  recordInput: SolanaRecurringRecordMessageInput;
}

export interface SolanaRecurringCancelPlan {
  revocationTransaction: Transaction;
}

export interface SetupSolanaRecurringAuthorizationParams {
  wallet: WalletContextState;
  connection: Connection;
  quote: SolanaRecurringQuote;
  tokenAccount?: PublicKey;
  onSignature?: (stage: 'authority' | 'delegation', signature: string) => void;
}

export interface CancelSolanaRecurringAuthorizationOnChainParams {
  wallet: WalletContextState;
  connection: Connection;
  authorization: SolanaRecurringAuthorization;
  subscriptionsProgramId?: string;
}

interface SolanaRecurringAuthoritySetup {
  authorityTransaction: Transaction;
  canonicalTokenAccount: PublicKey;
  delegatee: ReturnType<typeof address>;
  ownerSigner: TransactionSigner;
  programAddress: ReturnType<typeof address>;
  sourceTokenAccount: PublicKey;
  subscriptionAuthority: ReturnType<typeof address>;
  tokenMint: PublicKey;
  tokenProgram: PublicKey;
}

function signerFromPublicKey(publicKey: PublicKey): TransactionSigner {
  return { address: address(publicKey.toBase58()) } as TransactionSigner;
}

function recurringPluginTransactionMethodUnavailable(): never {
  throw new Error('Recurring setup only builds plugin instructions; transaction planning/sending is handled by the wallet adapter.');
}

function createRecurringSubscriptionsClient(params: {
  ownerSigner: TransactionSigner;
  rpcEndpoint: string;
}) {
  const { ownerSigner, rpcEndpoint } = params;
  return createClient({
    identity: ownerSigner,
    payer: ownerSigner,
    planTransaction: async () => recurringPluginTransactionMethodUnavailable(),
    planTransactions: async () => recurringPluginTransactionMethodUnavailable(),
    rpc: createSolanaRpc(rpcEndpoint),
    sendTransaction: async () => recurringPluginTransactionMethodUnavailable(),
    sendTransactions: async () => recurringPluginTransactionMethodUnavailable(),
  }).use(subscriptionsProgram());
}

function roleIsSigner(role: AccountRole): boolean {
  return role === AccountRole.READONLY_SIGNER
    || role === AccountRole.WRITABLE_SIGNER
    || String(role).toLowerCase().includes('signer')
    || Number(role) === 2
    || Number(role) === 3;
}

function roleIsWritable(role: AccountRole): boolean {
  return role === AccountRole.WRITABLE
    || role === AccountRole.WRITABLE_SIGNER
    || String(role).toLowerCase().includes('writable')
    || Number(role) === 1
    || Number(role) === 3;
}

function kitInstructionToWeb3(instruction: Instruction): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programAddress),
    keys: (instruction.accounts ?? []).map((account) => {
      if ('lookupTableAddress' in account) {
        throw new Error('Address lookup table accounts are not supported for recurring setup');
      }
      return {
        pubkey: new PublicKey(account.address),
        isSigner: roleIsSigner(account.role),
        isWritable: roleIsWritable(account.role),
      };
    }),
    data: Buffer.from(instruction.data ?? []),
  });
}

function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  tokenProgramId: PublicKey,
): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgramId.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return address;
}

function createAssociatedTokenAccountIdempotentInstruction(params: {
  payer: PublicKey;
  associatedToken: PublicKey;
  owner: PublicKey;
  mint: PublicKey;
  tokenProgramId: PublicKey;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: params.payer, isSigner: true, isWritable: true },
      { pubkey: params.associatedToken, isSigner: false, isWritable: true },
      { pubkey: params.owner, isSigner: false, isWritable: false },
      { pubkey: params.mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: params.tokenProgramId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]),
  });
}

function recurringNonce(): bigint {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const values = new Uint32Array(2);
    cryptoApi.getRandomValues(values);
    const nonce = (BigInt(values[0] ?? 0) << 32n) | BigInt(values[1] ?? 0);
    if (nonce > 0n) return nonce;
  }
  return BigInt(Date.now());
}

function toUnixSeconds(value: string): number {
  return Math.floor(new Date(value).getTime() / 1000);
}

export function recurringWalletProofMessage(params: {
  input: SolanaRecurringRecordMessageInput;
  delegatee: string;
}): string {
  const { input } = params;
  return [
    'Hatcher Solana recurring authorization',
    `kind:${input.kind}`,
    `key:${input.key}`,
    `billingPeriod:${input.billingPeriod ?? 'monthly'}`,
    `asset:${input.asset}`,
    `ownerWallet:${input.ownerWallet}`,
    `tokenAccount:${input.tokenAccount}`,
    `subscriptionAuthority:${input.subscriptionAuthority}`,
    `delegationPda:${input.delegationPda}`,
    `nonce:${input.nonce}`,
    `delegateeWallet:${params.delegatee}`,
    `amountPerPeriodBaseUnits:${input.amountPerPeriodBaseUnits}`,
    `periodSeconds:${2_592_000}`,
    `allowancePeriods:${input.allowancePeriods}`,
    `startAt:${input.startAt}`,
    `expiresAt:${input.expiresAt}`,
    `authorityTxSignature:${input.authorityTxSignature ?? ''}`,
    `delegationTxSignature:${input.delegationTxSignature}`,
  ].join('\n');
}

export async function buildSolanaRecurringSetupPlan(params: {
  owner: PublicKey;
  quote: SolanaRecurringQuote;
  rpcEndpoint: string;
  tokenAccount?: PublicKey;
  nonce?: bigint;
}): Promise<SolanaRecurringSetupPlan> {
  const authoritySetup = await buildSolanaRecurringAuthoritySetup(params);
  const {
    authorityTransaction,
    delegatee,
    ownerSigner,
    programAddress,
    sourceTokenAccount,
    subscriptionAuthority,
    tokenMint,
  } = authoritySetup;
  const { owner, quote } = params;
  const nonce = params.nonce ?? recurringNonce();
  const [delegationPda] = await findRecurringDelegationPda({
    subscriptionAuthority,
    delegator: address(owner.toBase58()),
    delegatee,
    nonce,
  }, { programAddress });

  const recurringClient = createRecurringSubscriptionsClient({
    ownerSigner,
    rpcEndpoint: params.rpcEndpoint,
  });
  const recurringInstruction = await recurringClient.subscriptions.instructions.createRecurringDelegation({
    amountPerPeriod: BigInt(quote.amountPerPeriodBaseUnits),
    delegatee,
    delegator: ownerSigner,
    expiryTs: toUnixSeconds(quote.expiresAt),
    nonce,
    payer: ownerSigner,
    periodLengthS: quote.periodSeconds,
    programAddress,
    startTs: toUnixSeconds(quote.startAt),
    tokenMint: address(tokenMint.toBase58()),
  });

  const delegationTransaction = new Transaction().add(kitInstructionToWeb3(recurringInstruction));
  const target = quote.target;
  const recordInput: SolanaRecurringRecordMessageInput = {
    kind: target.kind,
    key: target.key,
    billingPeriod: 'monthly',
    ...(target.kind === 'addon' && target.agentId ? { agentId: target.agentId } : {}),
    asset: quote.asset.asset,
    allowancePeriods: quote.allowancePeriods,
    ownerWallet: owner.toBase58(),
    tokenAccount: sourceTokenAccount.toBase58(),
    subscriptionAuthority: String(subscriptionAuthority),
    delegationPda: String(delegationPda),
    nonce: nonce.toString(),
    amountPerPeriodBaseUnits: quote.amountPerPeriodBaseUnits,
    amountPerPeriodHuman: quote.amountPerPeriodHuman,
    startAt: quote.startAt,
    expiresAt: quote.expiresAt,
    authorityTxSignature: '',
    delegationTxSignature: '',
  };

  return { authorityTransaction, delegationTransaction, recordInput };
}

export async function buildSolanaRecurringCancelPlan(params: {
  owner: PublicKey;
  authorization: SolanaRecurringAuthorization;
  subscriptionsProgramId?: string;
}): Promise<SolanaRecurringCancelPlan> {
  const { authorization, owner } = params;
  if (authorization.ownerWallet !== owner.toBase58()) {
    throw new Error('Connected wallet does not own this recurring authorization');
  }

  const ownerSigner = signerFromPublicKey(owner);
  const programAddress = address(params.subscriptionsProgramId ?? SOLANA_SUBSCRIPTIONS_PROGRAM_ID);
  const tokenMint = new PublicKey(authorization.tokenMint);
  const tokenProgram = new PublicKey(authorization.tokenProgram);
  const tokenAccount = new PublicKey(authorization.tokenAccount);

  const revokeDelegationInstruction = getRevokeDelegationOverlayInstruction({
    authority: ownerSigner,
    delegationAccount: address(authorization.delegationPda),
    receiver: ownerSigner.address,
    programAddress,
  });
  const closeAuthorityInstruction = await getCloseSubscriptionAuthorityOverlayInstructionAsync({
    user: ownerSigner,
    tokenMint: address(tokenMint.toBase58()),
    receiver: ownerSigner.address,
    programAddress,
  });

  const revocationTransaction = new Transaction().add(
    kitInstructionToWeb3(revokeDelegationInstruction),
    createRevokeInstruction(tokenAccount, owner, [], tokenProgram),
    kitInstructionToWeb3(closeAuthorityInstruction),
  );

  return { revocationTransaction };
}

async function buildSolanaRecurringAuthoritySetup(params: {
  owner: PublicKey;
  quote: SolanaRecurringQuote;
  tokenAccount?: PublicKey;
}): Promise<SolanaRecurringAuthoritySetup> {
  const { owner, quote } = params;
  const tokenMint = new PublicKey(quote.asset.tokenMint);
  const tokenProgram = new PublicKey(quote.asset.tokenProgram);
  const programAddress = address(quote.subscriptionsProgramId);
  const delegatee = address(quote.delegateeWallet);
  const ownerSigner = signerFromPublicKey(owner);
  const canonicalTokenAccount = getAssociatedTokenAddress(tokenMint, owner, tokenProgram);
  const sourceTokenAccount = params.tokenAccount ?? canonicalTokenAccount;
  const [subscriptionAuthority] = await findSubscriptionAuthorityPda({
    user: address(owner.toBase58()),
    tokenMint: address(tokenMint.toBase58()),
  }, { programAddress });

  const initInstruction = await getInitSubscriptionAuthorityOverlayInstructionAsync({
    owner: ownerSigner,
    payer: ownerSigner,
    tokenMint: address(tokenMint.toBase58()),
    tokenProgram: address(tokenProgram.toBase58()),
    userAta: address(sourceTokenAccount.toBase58()),
    programAddress,
  });

  const authorityTransaction = new Transaction();
  if (!params.tokenAccount) {
    authorityTransaction.add(createAssociatedTokenAccountIdempotentInstruction({
      payer: owner,
      associatedToken: canonicalTokenAccount,
      owner,
      mint: tokenMint,
      tokenProgramId: tokenProgram,
    }));
  }
  authorityTransaction.add(kitInstructionToWeb3(initInstruction));

  return {
    authorityTransaction,
    canonicalTokenAccount,
    delegatee,
    ownerSigner,
    programAddress,
    sourceTokenAccount,
    subscriptionAuthority,
    tokenMint,
    tokenProgram,
  };
}

async function sendTransactionWithWallet(params: {
  wallet: WalletContextState;
  connection: Connection;
  transaction: Transaction;
}): Promise<string> {
  const { wallet, connection, transaction } = params;
  if (!wallet.publicKey) throw new Error('Connect a Solana wallet first');
  const blockhash = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash.blockhash;
  transaction.feePayer = wallet.publicKey;

  let signature: string;
  if (wallet.signTransaction) {
    const signed = await wallet.signTransaction(transaction);
    signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
  } else if (wallet.sendTransaction) {
    signature = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
  } else {
    throw new Error('Wallet cannot sign Solana transactions');
  }

  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight,
  }, 'confirmed');
  if (confirmation.value.err) {
    throw new Error(`Solana transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }
  return signature;
}

function signatureBytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

export async function setupSolanaRecurringAuthorization(
  params: SetupSolanaRecurringAuthorizationParams,
): Promise<SolanaRecurringSetupRecordInput> {
  const { wallet, connection, quote } = params;
  if (!wallet.publicKey) throw new Error('Connect a Solana wallet first');
  if (!wallet.signMessage) throw new Error('Wallet must support message signing to set up recurring billing');

  const authoritySetup = await buildSolanaRecurringAuthoritySetup({
    owner: wallet.publicKey,
    quote,
    tokenAccount: params.tokenAccount,
  });

  let authorityTxSignature = '';
  try {
    authorityTxSignature = await sendTransactionWithWallet({
      wallet,
      connection,
      transaction: authoritySetup.authorityTransaction,
    });
    params.onSignature?.('authority', authorityTxSignature);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists|already in use|custom program error: 0x0/i.test(message)) throw error;
  }

  const plan = await buildSolanaRecurringSetupPlan({
    owner: wallet.publicKey,
    quote,
    rpcEndpoint: connection.rpcEndpoint,
    tokenAccount: params.tokenAccount,
  });
  const delegationTxSignature = await sendTransactionWithWallet({
    wallet,
    connection,
    transaction: plan.delegationTransaction,
  });
  params.onSignature?.('delegation', delegationTxSignature);

  const recordInput: SolanaRecurringRecordMessageInput = {
    ...plan.recordInput,
    authorityTxSignature,
    delegationTxSignature,
  };
  const proof = recurringWalletProofMessage({
    input: recordInput,
    delegatee: quote.delegateeWallet,
  });
  const walletProofSignature = signatureBytesToBase64(
    await wallet.signMessage(new TextEncoder().encode(proof)),
  );

  return {
    ...recordInput,
    walletProofSignature,
    metadata: {
      client: 'hatcher-web',
      subscriptionsProgramId: quote.subscriptionsProgramId,
    },
  };
}

export async function cancelSolanaRecurringAuthorizationOnChain(
  params: CancelSolanaRecurringAuthorizationOnChainParams,
): Promise<string> {
  const { authorization, connection, wallet } = params;
  if (!wallet.publicKey) throw new Error('Connect a Solana wallet first');
  const plan = await buildSolanaRecurringCancelPlan({
    owner: wallet.publicKey,
    authorization,
    subscriptionsProgramId: params.subscriptionsProgramId,
  });
  return sendTransactionWithWallet({
    wallet,
    connection,
    transaction: plan.revocationTransaction,
  });
}
