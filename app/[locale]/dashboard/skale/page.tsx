'use client';

// ============================================================
// Dashboard — SKALE Wallets overview.
//
// Lists every agent the user owns alongside its SKALE wallet
// address, native gas + USDC balance, and ERC-8004 verification
// status. Aggregates totals at the top so the user can see
// "what's parked across all my agents on SKALE" at a glance.
// ============================================================

import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  Wallet as WalletIcon,
  ShieldCheck,
  RefreshCw,
  Copy,
  ExternalLink,
  ArrowLeft,
  AlertTriangle,
  CreditCard,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api, type Agent } from '@/lib/api';
import { payWithSkaleX402, type SettleResult } from '@/lib/skale-x402-client';

interface SkaleWalletRow {
  agent: Agent;
  loading: boolean;
  error: string | null;
  ethFormatted: string;
  usdcFormatted: string;
  ethWei: string;
  usdcRaw: string;
  erc8004AgentId: string | null;
  erc8004RegisteredAt: string | null;
  chainId: number;
}

const FRAMEWORK_GLYPH: Record<string, string> = {
  openclaw: '⊞',
  hermes: '◇',
};

const FRAMEWORK_COLOR: Record<string, string> = {
  openclaw: '#f59e0b',
  hermes: '#a855f7',
};

function shortAddr(addr: string): string {
  return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function explorerBase(_chainId: number): string {
  return 'https://skale-base-explorer.skalenodes.com';
}

function explorerAddrUrl(address: string, chainId: number): string {
  return `${explorerBase(chainId)}/address/${address}`;
}

function explorerTxUrl(txHash: string, chainId: number): string {
  return `${explorerBase(chainId)}/tx/${txHash}`;
}

export default function SkaleDashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [rows, setRows] = useState<Record<string, SkaleWalletRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [evmAccount, setEvmAccount] = useState<string | null>(null);
  const [evmConnecting, setEvmConnecting] = useState(false);
  const [evmError, setEvmError] = useState<string | null>(null);
  const [demoPaying, setDemoPaying] = useState(false);
  const [demoResult, setDemoResult] = useState<SettleResult | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoTier, setDemoTier] = useState<'starter' | 'pro' | 'business'>('starter');

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMyAgents();
      if (res.success) setAgents(res.data ?? []);
      else setError(res.error ?? 'Could not load agents');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOneWallet = useCallback(async (agent: Agent) => {
    if (!agent.skaleWalletAddress) return;
    setRows((prev) => ({
      ...prev,
      [agent.id]: prev[agent.id]
        ? { ...prev[agent.id]!, loading: true, error: null }
        : {
            agent,
            loading: true,
            error: null,
            ethFormatted: '—',
            usdcFormatted: '—',
            ethWei: '0',
            usdcRaw: '0',
            erc8004AgentId: null,
            erc8004RegisteredAt: null,
            chainId: 0,
          },
    }));
    try {
      const res = await api.getAgentSkaleWallet(agent.id);
      if (res.success) {
        setRows((prev) => ({
          ...prev,
          [agent.id]: {
            agent,
            loading: false,
            error: null,
            ethFormatted: res.data.ethFormatted,
            usdcFormatted: res.data.usdcFormatted,
            ethWei: res.data.ethWei,
            usdcRaw: res.data.usdcRaw,
            erc8004AgentId: res.data.erc8004AgentId,
            erc8004RegisteredAt: res.data.erc8004RegisteredAt,
            chainId: res.data.chainId,
          },
        }));
      } else {
        setRows((prev) => ({
          ...prev,
          [agent.id]: { ...prev[agent.id]!, loading: false, error: res.error ?? 'Failed' },
        }));
      }
    } catch (e) {
      setRows((prev) => ({
        ...prev,
        [agent.id]: {
          ...prev[agent.id]!,
          loading: false,
          error: e instanceof Error ? e.message : 'Failed',
        },
      }));
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadAgents();
  }, [isAuthenticated, loadAgents]);

  // Hydrate balances for every agent with a wallet — done in parallel,
  // capped to 6 in flight so a 50-agent account doesn't hammer the api.
  useEffect(() => {
    const withWallet = agents.filter((a) => a.skaleWalletAddress);
    if (withWallet.length === 0) return;
    let cancelled = false;
    let inFlight = 0;
    let i = 0;
    const next = async () => {
      while (!cancelled && i < withWallet.length && inFlight < 6) {
        const agent = withWallet[i++]!;
        inFlight += 1;
        loadOneWallet(agent).finally(() => {
          inFlight -= 1;
          if (!cancelled && i < withWallet.length) void next();
        });
      }
    };
    void next();
    return () => { cancelled = true; };
  }, [agents, loadOneWallet]);

  const totals = useMemo(() => {
    const list = Object.values(rows);
    let totalEth = 0;
    let totalUsdc = 0;
    let registered = 0;
    for (const r of list) {
      totalEth += parseFloat(r.ethFormatted) || 0;
      totalUsdc += parseFloat(r.usdcFormatted) || 0;
      if (r.erc8004AgentId) registered += 1;
    }
    const withWallet = agents.filter((a) => a.skaleWalletAddress).length;
    return { withWallet, registered, totalEth, totalUsdc };
  }, [rows, agents]);

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopyMsg(`${label} copied`);
      setTimeout(() => setCopyMsg(null), 1600);
    }).catch(() => {});
  };

  const tryDemoPay = async () => {
    setDemoPaying(true);
    setDemoError(null);
    setDemoResult(null);
    try {
      const result = await payWithSkaleX402({ kind: 'tier', key: demoTier, billingPeriod: 'monthly' });
      setDemoResult(result);
    } catch (e) {
      setDemoError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setDemoPaying(false);
    }
  };

  const connectEvm = async () => {
    setEvmError(null);
    const eth = (window as unknown as { ethereum?: { request: (a: { method: string }) => Promise<string[]> } }).ethereum;
    if (!eth) {
      setEvmError('No EVM wallet detected. Install MetaMask, Rabby, or any EIP-1193 wallet to connect.');
      return;
    }
    setEvmConnecting(true);
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      setEvmAccount(accounts[0] ?? null);
    } catch (e) {
      setEvmError(e instanceof Error ? e.message : 'Connection rejected');
    } finally {
      setEvmConnecting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="shimmer rounded-xl h-8 w-48" />
        <div className="shimmer rounded-xl h-32 w-full" />
        <div className="shimmer rounded-xl h-64 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 text-center text-[var(--text-muted)]">
        Please <Link href="/login" className="text-[var(--phosphor)] hover:underline">log in</Link> to view your SKALE wallets.
      </div>
    );
  }

  const refreshing = Object.values(rows).some((r) => r.loading);
  const withWalletAgents = agents.filter((a) => a.skaleWalletAddress);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <Link href="/dashboard/agents" className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--phosphor)] transition mb-2">
            <ArrowLeft size={12} /> Back to agents
          </Link>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] flex items-center gap-3">
            <WalletIcon size={22} className="text-[var(--phosphor)]" />
            SKALE Wallets
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Every agent's on-chain identity + USDC balance on the SKALE network. Phase 1+2 of the SKALE integration.
          </p>
        </div>
        <button
          onClick={() => {
            void loadAgents();
            for (const a of withWalletAgents) void loadOneWallet(a);
          }}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-wider border border-[var(--border-subtle)] hover:border-[var(--phosphor)] disabled:opacity-50 transition"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh all
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border border-[var(--border-subtle)] p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-1">Wallets</div>
          <div className="text-2xl font-mono text-[var(--text-primary)]">{totals.withWallet}</div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">of {agents.length} agents</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }} className="border border-[var(--border-subtle)] p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-1">Verified ERC-8004</div>
          <div className="text-2xl font-mono text-[var(--phosphor)]">{totals.registered}</div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">on-chain identity</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }} className="border border-[var(--border-subtle)] p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-1">Total CREDIT</div>
          <div className="text-2xl font-mono text-[var(--text-primary)]">{totals.totalEth.toFixed(4)}</div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">native gas</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }} className="border border-[var(--border-subtle)] p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-1">Total USDC</div>
          <div className="text-2xl font-mono text-[var(--phosphor)]">${totals.totalUsdc.toFixed(2)}</div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">across all wallets</div>
        </motion.div>
      </div>

      {/* Connect EVM wallet (top-up source) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
        className="border border-[var(--border-subtle)] p-5 mb-8"
      >
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] mb-1">Your EVM wallet</div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Top up agent wallets from your own address</h2>
          </div>
          {evmAccount ? (
            <div className="inline-flex items-center gap-2 font-mono text-xs text-[var(--phosphor)]">
              <ShieldCheck size={12} /> {shortAddr(evmAccount)}
            </div>
          ) : (
            <button
              onClick={() => void connectEvm()}
              disabled={evmConnecting}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-wider border border-[var(--phosphor)]/40 text-[var(--phosphor)] hover:bg-[var(--phosphor)]/10 disabled:opacity-50 transition"
            >
              {evmConnecting ? 'Connecting…' : 'Connect EVM wallet'}
            </button>
          )}
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          Connect MetaMask, Rabby, or any EIP-1193 wallet to send CREDIT or USDC to one of your agents — just copy the
          deposit address from the table below. Required for Phase 4 x402 payments once the WalletConnect modal lands.
        </div>
        {evmError && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 border border-amber-500/30 bg-amber-500/5 text-[11px] text-amber-400">
            <AlertTriangle size={12} /> {evmError}
          </div>
        )}
      </motion.div>

      {/* Phase 4 — Pay tier with USDC via x402 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.25 } }}
        className="border border-[var(--phosphor)]/40 p-5 mb-8 bg-[var(--phosphor)]/5"
      >
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-3">
            <CreditCard size={16} className="text-[var(--phosphor)]" />
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--phosphor)] mb-1">Phase 4 · x402</div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Pay a tier with USDC on SKALE</h2>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 border border-[var(--phosphor)]/30 text-[var(--phosphor)]">Mainnet · USDC required</span>
        </div>
        <div className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
          End-to-end demo of the new x402 rail. Connect EVM wallet → pick tier → sign EIP-3009 transferWithAuthorization
          via your wallet → server forwards to PayAI facilitator → tier upgrade applied. Settles in ~1 second on
          SKALE Base Mainnet. You'll need USDC at the connected address (bridge via SKALE Bridge).
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={demoTier}
            onChange={(e) => setDemoTier(e.target.value as 'starter' | 'pro' | 'business')}
            disabled={demoPaying}
            className="px-3 py-2 text-xs uppercase tracking-wider bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--phosphor)] disabled:opacity-50"
          >
            <option value="starter">Starter — $6.99 / mo</option>
            <option value="pro">Pro — $19.99 / mo</option>
            <option value="business">Business — $49.99 / mo</option>
          </select>
          <button
            onClick={() => void tryDemoPay()}
            disabled={demoPaying}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider border border-[var(--phosphor)] bg-[var(--phosphor)]/10 text-[var(--phosphor)] hover:bg-[var(--phosphor)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {demoPaying ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
            {demoPaying ? 'Signing & settling…' : 'Pay with USDC'}
          </button>
        </div>
        {demoResult && (
          <div className="mt-4 p-3 border border-[var(--phosphor)]/40 bg-[var(--phosphor)]/5">
            <div className="flex items-center gap-2 text-xs text-[var(--phosphor)] mb-2">
              <CheckCircle2 size={14} />
              <span className="uppercase tracking-wider">Payment confirmed</span>
              {demoResult.duplicate && <span className="text-amber-400 text-[10px]">(duplicate — not re-applied)</span>}
            </div>
            <div className="space-y-1 text-[11px] font-mono text-[var(--text-muted)]">
              <div>tier: <span className="text-[var(--text-primary)]">{demoResult.description}</span></div>
              <div>amount: <span className="text-[var(--text-primary)]">${demoResult.usd.toFixed(2)}</span></div>
              <div>payer: <span className="text-[var(--text-primary)]">{shortAddr(demoResult.payer)}</span></div>
              <div>tx: <a
                href={explorerTxUrl(demoResult.txSignature, 324705682)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--phosphor)] hover:underline"
              >{shortAddr(demoResult.txSignature)} <ExternalLink size={9} className="inline" /></a></div>
            </div>
          </div>
        )}
        {demoError && (
          <div className="mt-4 inline-flex items-start gap-2 px-3 py-2 border border-amber-500/30 bg-amber-500/5 text-[11px] text-amber-400">
            <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
            <span>{demoError}</span>
          </div>
        )}
      </motion.div>

      {copyMsg && (
        <div className="text-[10px] text-[var(--phosphor)] mb-3">{copyMsg}</div>
      )}

      {/* Agents table */}
      {agents.length === 0 ? (
        <div className="border border-[var(--border-subtle)] p-8 text-center text-[var(--text-muted)]">
          No agents yet — <Link href="/create" className="text-[var(--phosphor)] hover:underline">create your first agent</Link> to start using SKALE.
        </div>
      ) : (
        <div className="border border-[var(--border-subtle)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-left text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3 text-right">CREDIT</th>
                <th className="px-4 py-3 text-right">USDC</th>
                <th className="px-4 py-3">ERC-8004</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const row = rows[agent.id];
                const fwColor = FRAMEWORK_COLOR[agent.framework] ?? 'var(--text-muted)';
                const fwGlyph = FRAMEWORK_GLYPH[agent.framework] ?? '·';
                return (
                  <tr key={agent.id} className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--bg-elevated)]/30 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg" style={{ color: fwColor }}>{fwGlyph}</span>
                        <div>
                          <div className="text-sm text-[var(--text-primary)]">{agent.name}</div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">{agent.framework}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {agent.skaleWalletAddress ? (
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-[var(--text-primary)]">{shortAddr(agent.skaleWalletAddress)}</code>
                          <button
                            onClick={() => copy(agent.skaleWalletAddress!, 'Address')}
                            className="text-[var(--text-muted)] hover:text-[var(--phosphor)] transition"
                            title="Copy address"
                          >
                            <Copy size={12} />
                          </button>
                          {row && row.chainId > 0 && (
                            <a
                              href={explorerAddrUrl(agent.skaleWalletAddress, row.chainId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--text-muted)] hover:text-[var(--phosphor)] transition"
                              title="Open in explorer"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-400">No wallet (legacy — backfill required)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[var(--text-primary)]">
                      {row?.loading ? '…' : row?.error ? <span className="text-amber-400">err</span> : row ? row.ethFormatted : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[var(--phosphor)]">
                      {row?.loading ? '…' : row?.error ? <span className="text-amber-400">err</span> : row ? `$${row.usdcFormatted}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {row?.erc8004AgentId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-[var(--phosphor)]/40 text-[var(--phosphor)] text-[10px] uppercase tracking-wider">
                          <ShieldCheck size={10} /> Verified
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)]">Not registered</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/agent/${agent.id}?tab=wallet`}
                        className="text-[10px] uppercase tracking-wider text-[var(--phosphor)] hover:underline"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div className="mt-4 px-3 py-2 border border-amber-500/30 bg-amber-500/5 text-[11px] text-amber-400">
          {error}
        </div>
      )}

      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] text-center mt-6">
        Phase 1+2 live · Phase 3 (CLI) and Phase 4 (x402) ship per-agent in the Wallet tab
      </div>
    </div>
  );
}
