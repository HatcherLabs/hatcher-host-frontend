'use client';

// ============================================================
// WalletTab — SKALE Phase 1
//
// Shows the agent's SKALE wallet address, native gas + USDC
// balances, and a QR code for the deposit address. Read-only
// for now — Phase 2 adds an "Verify on SKALE" badge once the
// agent is registered against ERC-8004, Phase 3 adds the
// "Enable agent signing" toggle, Phase 4 adds the spend / earn
// view via MPP.
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, Copy, RefreshCw, ExternalLink, ShieldCheck, Zap, Key, AlertTriangle } from 'lucide-react';
import { useAgentContext, GlassCard } from '../AgentContext';
import { api } from '@/lib/api';

interface WalletState {
  address: string;
  chainId: number;
  rpcUrl: string;
  ethFormatted: string;
  usdcFormatted: string;
  usdcContract: string;
  erc8004AgentId: string | null;
  erc8004RegisteredAt: string | null;
  erc8004IdentityContract: string;
  hubAddress: string | null;
}

function explorerAddrUrl(address: string, chainId: number): string {
  // SKALE Base Sepolia (testnet) explorer; switch when mainnet (1564830818).
  if (chainId === 324705682) {
    return `https://base-sepolia-testnet.skalenodes.com/address/${address}`;
  }
  return `https://base.skalenodes.com/address/${address}`;
}

function shortAddr(addr: string): string {
  return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function WalletTab() {
  const { agent, loadAgent } = useAgentContext();
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerMsg, setRegisterMsg] = useState<string | null>(null);
  const [signingToggling, setSigningToggling] = useState(false);

  const advanced = (agent.config?.advanced as Record<string, unknown> | undefined) ?? {};
  const signingEnabled = advanced['agent_wallet_signer'] === true;

  const loadWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentSkaleWallet(agent.id);
      if (res.success) setWallet(res.data);
      else setError(res.error ?? 'Could not load wallet');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load wallet');
    } finally {
      setLoading(false);
    }
  }, [agent.id]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopyMsg(`${label} copied`);
      setTimeout(() => setCopyMsg(null), 1600);
    }).catch(() => {
      setCopyMsg('Copy failed');
      setTimeout(() => setCopyMsg(null), 1600);
    });
  };

  const toggleSigning = async () => {
    const next = !signingEnabled;
    if (next && !confirm(
      'Enable runtime signing?\n\n' +
      'This injects the agent\'s SKALE private key into the container env (SKALE_PRIVATE_KEY) on next start. ' +
      'The agent will be able to sign + submit transactions on its own.\n\n' +
      'You can revoke at any time. The wallet stays receive-only until then.\n\n' +
      'Restart the agent after toggling for the change to take effect.',
    )) return;

    setSigningToggling(true);
    try {
      await api.updateAgent(agent.id, {
        config: { advanced: { agent_wallet_signer: next } },
      } as never);
      await loadAgent();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to toggle signing');
    } finally {
      setSigningToggling(false);
    }
  };

  const registerOnChain = async () => {
    setRegistering(true);
    setRegisterMsg(null);
    try {
      const res = await api.registerAgentSkale(agent.id);
      if (res.success) {
        setRegisterMsg(res.data.txHash ? `Registered. tx=${res.data.txHash.slice(0, 10)}…` : 'Synced from on-chain');
        await loadWallet();
      } else {
        setRegisterMsg(res.error ?? 'Registration failed');
      }
    } catch (e) {
      setRegisterMsg(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setRegistering(false);
      setTimeout(() => setRegisterMsg(null), 6000);
    }
  };

  if (loading && !wallet) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 p-6">
        <div className="shimmer rounded-xl h-8 w-48" />
        <div className="shimmer rounded-xl h-32 w-full" />
        <div className="shimmer rounded-xl h-24 w-full" />
      </motion.div>
    );
  }

  if (error || !wallet) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 text-[var(--text-muted)]">
            <WalletIcon size={18} />
            <span>{error ?? 'No wallet found for this agent.'}</span>
          </div>
          <button
            onClick={() => void loadWallet()}
            className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-wider border border-[var(--border-subtle)] hover:border-[var(--phosphor)] transition"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </GlassCard>
      </motion.div>
    );
  }

  const isTestnet = wallet.chainId === 324705682;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(wallet.address)}&bgcolor=0a0a0a&color=39ff88&margin=8`;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-[var(--phosphor)]/40 flex items-center justify-center">
            <WalletIcon size={18} className="text-[var(--phosphor)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">SKALE Wallet</h2>
            <p className="text-xs text-[var(--text-muted)]">
              On-chain identity for <span className="font-mono text-[var(--phosphor)]">{agent.name}</span>
              {isTestnet && <span className="ml-2 px-1.5 py-0.5 border border-amber-500/30 text-amber-400 text-[10px] uppercase tracking-wider">Testnet</span>}
            </p>
          </div>
        </div>
        <button
          onClick={() => void loadWallet()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-wider border border-[var(--border-subtle)] hover:border-[var(--phosphor)] disabled:opacity-50 transition"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Address + QR card */}
      <GlassCard className="p-6">
        <div className="grid md:grid-cols-[180px_1fr] gap-6 items-center">
          <div className="flex justify-center md:justify-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt="Wallet deposit QR"
              width={180}
              height={180}
              className="border border-[var(--border-subtle)] bg-black"
            />
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-1">Deposit address</div>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-sm font-mono text-[var(--text-primary)] break-all">{wallet.address}</code>
                <button
                  onClick={() => copy(wallet.address, 'Address')}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-wider border border-[var(--border-subtle)] hover:border-[var(--phosphor)] transition"
                  title="Copy address"
                >
                  <Copy size={10} /> Copy
                </button>
                <a
                  href={explorerAddrUrl(wallet.address, wallet.chainId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-wider border border-[var(--border-subtle)] hover:border-[var(--phosphor)] transition"
                >
                  <ExternalLink size={10} /> Explorer
                </a>
              </div>
              {copyMsg && <div className="text-[10px] text-[var(--phosphor)] mt-1">{copyMsg}</div>}
            </div>
            <div className="text-xs text-[var(--text-muted)] leading-relaxed">
              Anyone can send native gas (sFUEL) or USDC to this address. Funds belong to the agent — they
              power Phase 4 x402/MPP payments and Phase 3 on-chain skill calls.
              {isTestnet && (
                <>
                  {' '}On testnet, grab free sFUEL from{' '}
                  <a
                    href="https://www.sfuelstation.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--phosphor)] hover:underline"
                  >sfuelstation.com</a>.
                </>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Balance grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <Zap size={12} /> Native Gas
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">sFUEL</span>
          </div>
          <div className="text-2xl font-mono text-[var(--text-primary)]">{wallet.ethFormatted}</div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <WalletIcon size={12} /> USDC
            </div>
            <a
              href={explorerAddrUrl(wallet.usdcContract, wallet.chainId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[var(--text-muted)] hover:text-[var(--phosphor)] transition"
              title={wallet.usdcContract}
            >
              {shortAddr(wallet.usdcContract)} <ExternalLink size={9} className="inline" />
            </a>
          </div>
          <div className="text-2xl font-mono text-[var(--text-primary)]">${wallet.usdcFormatted}</div>
        </GlassCard>
      </div>

      {/* ERC-8004 status (Phase 2) */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <ShieldCheck size={16} className="text-[var(--phosphor)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">ERC-8004 On-Chain Identity</h3>
          </div>
          {wallet.erc8004AgentId && (
            <span className="px-2 py-0.5 border border-[var(--phosphor)]/40 text-[var(--phosphor)] text-[10px] uppercase tracking-wider">
              Verified
            </span>
          )}
        </div>
        {wallet.erc8004AgentId ? (
          <div className="space-y-2 text-xs">
            <div className="text-[var(--text-muted)]">
              Verified on SKALE since{' '}
              <span className="text-[var(--text-primary)] font-mono">
                {wallet.erc8004RegisteredAt ? new Date(wallet.erc8004RegisteredAt).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className="font-mono text-[var(--text-muted)] break-all">
              Agent ID: <span className="text-[var(--phosphor)]">{wallet.erc8004AgentId}</span>
            </div>
            <div className="font-mono text-[var(--text-muted)] break-all">
              Registry: <a
                href={explorerAddrUrl(wallet.erc8004IdentityContract, wallet.chainId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--phosphor)] hover:underline"
              >{shortAddr(wallet.erc8004IdentityContract)}</a>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-[var(--text-muted)]">
              Not yet registered. Hit the button below to claim a globally unique on-chain ID + reputation
              surface in the SKALE-deployed ERC-8004 registry. Gas is paid by the Hatcher master wallet.
              {wallet.hubAddress && (
                <div className="mt-1 font-mono text-[10px]">
                  Hub: <span className="text-[var(--text-primary)]">{shortAddr(wallet.hubAddress)}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => void registerOnChain()}
              disabled={registering || !wallet.hubAddress}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider border border-[var(--phosphor)]/40 text-[var(--phosphor)] hover:bg-[var(--phosphor)]/10 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title={!wallet.hubAddress ? 'Master Hub wallet not configured' : 'Register agent on-chain'}
            >
              <ShieldCheck size={12} />
              {registering ? 'Registering on-chain…' : 'Verify on SKALE'}
            </button>
            {registerMsg && (
              <div className={`text-[10px] ${registerMsg.includes('failed') || registerMsg.includes('Failed') ? 'text-red-400' : 'text-[var(--phosphor)]'}`}>
                {registerMsg}
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Phase 3 — Runtime signing opt-in */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Key size={16} className={signingEnabled ? 'text-amber-400' : 'text-[var(--phosphor)]'} />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Agent Runtime Signing</h3>
          </div>
          <span className={`px-2 py-0.5 border text-[10px] uppercase tracking-wider ${
            signingEnabled
              ? 'border-amber-500/40 text-amber-400'
              : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
          }`}>
            {signingEnabled ? 'Signing ON' : 'Receive-only'}
          </span>
        </div>
        <div className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
          Off (default): the agent process can read balances and build unsigned transactions but cannot
          submit them. Wallet is receive-only.
          <br /><br />
          On: the SKALE private key is injected into the container env at start time. The agent can use
          the bundled <code className="text-[var(--phosphor)] font-mono">skale</code> CLI or
          <code className="text-[var(--phosphor)] font-mono"> ethers</code> directly to sign + submit
          on-chain transactions, including x402 / MPP payments and ERC-8004 reputation calls.
        </div>
        {signingEnabled && (
          <div className="flex items-start gap-2 p-3 mb-3 border border-amber-500/30 bg-amber-500/5 text-[11px] text-amber-400">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              Active. The agent runtime now controls funds in this wallet. Restart the container after
              the toggle for the change to take effect. Only enable for trusted skill sets.
            </span>
          </div>
        )}
        <button
          onClick={() => void toggleSigning()}
          disabled={signingToggling}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider border transition disabled:opacity-50 disabled:cursor-not-allowed ${
            signingEnabled
              ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
              : 'border-[var(--phosphor)]/40 text-[var(--phosphor)] hover:bg-[var(--phosphor)]/10'
          }`}
        >
          <Key size={12} />
          {signingToggling
            ? 'Updating…'
            : signingEnabled
              ? 'Disable signing'
              : 'Enable agent signing'}
        </button>
      </GlassCard>

      {/* Network footer */}
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] text-center">
        Network: SKALE Base {isTestnet ? 'Sepolia' : 'Mainnet'} · Chain ID {wallet.chainId}
      </div>
    </motion.div>
  );
}
