'use client';

// ============================================================
// WalletTab — SKALE wallet, identity, reputation, signing
//
// Renders five cards stacked top-to-bottom:
//   1. Agent Passport — multichain identity, x402 rails, MCP links.
//   2. Wallet — public address, CREDIT + USDC balances, deposit QR.
//   3. ERC-8004 Identity — on-chain agentId, registry contract,
//      registered-at timestamp; "Verify on SKALE" button when not
//      yet registered.
//   4. On-Chain Reputation — DB thumbs aggregate (up/down/score%)
//      paired with the on-chain attestation count cached from the
//      ReputationRegistry, plus a link to the latest tx.
//   5. Runtime Signing — opt-in toggle that injects the encrypted
//      private key into the container env so the agent process can
//      sign + submit transactions itself. Off by default; receive-only
//      until the user explicitly enables it.
// ============================================================

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, Copy, RefreshCw, ExternalLink, ShieldCheck, Zap, Key, AlertTriangle, Star, ThumbsUp, ThumbsDown, Fingerprint, Server, CreditCard, Link2, Network } from 'lucide-react';
import { useAgentContext, GlassCard } from '../AgentContext';
import { api } from '@/lib/api';
import type { AgentPassport, AgentPassportNetwork, AgentPassportNetworkId, AgentPassportPaymentRail, AgentPassportStatus } from '@/lib/api';
import { buildFallbackPassport, networkStatusLabel, networkStatusTone, shortAddress } from '@/lib/agent-passport';

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

interface ReputationState {
  upCount: number;
  downCount: number;
  total: number;
  scorePct: number | null;
  onChain: {
    agentId: string | null;
    attestationCount: number;
    activityMilestone: number;
    lastTxHash: string | null;
    lastTxAt: string | null;
    contract: string;
    chainId: number;
  };
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

function shortAddr(addr: string): string {
  return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function WalletTab() {
  const { agent, loadAgent } = useAgentContext();
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [passport, setPassport] = useState<AgentPassport | null>(null);
  const [reputation, setReputation] = useState<ReputationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerMsg, setRegisterMsg] = useState<string | null>(null);
  const [signingToggling, setSigningToggling] = useState(false);
  const [signingPendingConfirm, setSigningPendingConfirm] = useState(false);
  const [signingError, setSigningError] = useState<string | null>(null);
  const [provisioningChains, setProvisioningChains] = useState(false);
  const [runtimeRestartNeeded, setRuntimeRestartNeeded] = useState(false);
  const [restartingRuntime, setRestartingRuntime] = useState(false);

  const advanced = (agent.config?.advanced as Record<string, unknown> | undefined) ?? {};
  const signingEnabled = advanced['agent_wallet_signer'] === true;
  const activePassport = useMemo(
    () => passport ?? buildFallbackPassport(agent, agent.id),
    [agent, passport],
  );

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
    // Reputation is best-effort — failure shouldn't break the rest of the
    // wallet view (it's a public endpoint that can be down independently).
    try {
      const rep = await api.getAgentReputation(agent.id);
      if (rep.success) setReputation(rep.data);
    } catch {
      /* swallow — keep card hidden */
    }
    // Passport powers the dashboard multichain card. It is best-effort here:
    // the SKALE wallet view remains usable even if the public manifest route
    // is temporarily unavailable during local development.
    try {
      const pass = await api.getAgentPassport(agent.id);
      if (pass.success) setPassport(pass.data);
    } catch {
      /* fallback derived from the already-loaded agent stays visible */
    }
  }, [agent.id]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const copy = (value: string | null | undefined, label: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopyMsg(`${label} copied`);
      setTimeout(() => setCopyMsg(null), 1600);
    }).catch(() => {
      setCopyMsg('Copy failed');
      setTimeout(() => setCopyMsg(null), 1600);
    });
  };

  // Two-step inline confirm — native confirm() is blocked in iOS WKWebView
  // (the Android app embeds the dashboard in a WebView), and an inline
  // pattern is consistent with how the rest of the dashboard gates
  // destructive toggles (e.g. delete-agent on the management page).
  const requestEnableSigning = () => {
    setSigningError(null);
    setSigningPendingConfirm(true);
  };

  const cancelEnableSigning = () => {
    setSigningPendingConfirm(false);
  };

  const applySigningChange = async (next: boolean) => {
    setSigningPendingConfirm(false);
    setSigningError(null);
    setSigningToggling(true);
    try {
      await api.updateAgent(agent.id, {
        config: { advanced: { agent_wallet_signer: next } },
      } as never);
      await loadAgent();
    } catch (e) {
      setSigningError(e instanceof Error ? e.message : 'Failed to toggle signing');
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

  const provisionChainAccounts = async () => {
    setProvisioningChains(true);
    try {
      const res = await api.provisionAgentChainAccounts(agent.id);
      if (!res.success) throw new Error(res.error || 'Provisioning failed');
      const pass = await api.getAgentPassport(agent.id);
      if (pass.success) setPassport(pass.data);
      setRuntimeRestartNeeded(res.data.needsRestart);
      setCopyMsg(res.data.needsRestart
        ? 'Provisioned. Restart agent to refresh runtime env'
        : res.data.provisioned
          ? 'Multichain accounts provisioned'
          : 'Multichain accounts already provisioned');
      setTimeout(() => setCopyMsg(null), res.data.needsRestart ? 3200 : 1800);
    } catch (e) {
      setCopyMsg(e instanceof Error ? e.message : 'Provisioning failed');
      setTimeout(() => setCopyMsg(null), 2400);
    } finally {
      setProvisioningChains(false);
    }
  };

  const restartRuntime = async () => {
    setRestartingRuntime(true);
    try {
      const res = await api.restartAgent(agent.id);
      if (!res.success) throw new Error(res.error || 'Restart failed');
      setRuntimeRestartNeeded(false);
      setCopyMsg('Agent runtime restarting');
      await loadAgent();
      setTimeout(() => setCopyMsg(null), 2200);
    } catch (e) {
      setCopyMsg(e instanceof Error ? e.message : 'Restart failed');
      setTimeout(() => setCopyMsg(null), 2600);
    } finally {
      setRestartingRuntime(false);
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

      <AgentPassportDashboardCard
        passport={activePassport}
        onCopy={copy}
        onProvision={() => void provisionChainAccounts()}
        provisioning={provisioningChains}
        onRestartRuntime={() => void restartRuntime()}
        runtimeRestartNeeded={runtimeRestartNeeded}
        restartingRuntime={restartingRuntime}
      />

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
              Anyone can send native gas (sFUEL) or USDC to this address. Funds belong to the agent —
              they cover its on-chain activity (gas for ERC-8004 registration, reputation attestations,
              future agent-to-agent payments).
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
            <span className="text-[10px] text-[var(--text-muted)]">CREDIT</span>
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

      {/* ERC-8004 identity — on-chain agent registration */}
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

      {/* ERC-8004 Reputation — DB thumbs aggregate + on-chain attestations */}
      {wallet.erc8004AgentId && reputation && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Star size={16} className="text-[var(--phosphor)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">On-Chain Reputation</h3>
            </div>
            {reputation.scorePct !== null && (
              <span className="px-2 py-0.5 border border-[var(--phosphor)]/40 text-[var(--phosphor)] text-[10px] uppercase tracking-wider">
                {reputation.scorePct}% positive
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <ReputationStat
              label="Thumbs up"
              value={reputation.upCount}
              icon={<ThumbsUp size={11} />}
              tone="phosphor"
            />
            <ReputationStat
              label="Thumbs down"
              value={reputation.downCount}
              icon={<ThumbsDown size={11} />}
              tone="muted"
            />
            <ReputationStat
              label="On-chain"
              value={reputation.onChain.attestationCount}
              icon={<ShieldCheck size={11} />}
              tone="phosphor"
            />
            <ReputationStat
              label="Activity"
              value={reputation.onChain.activityMilestone}
              icon={<Zap size={11} />}
              tone="muted"
            />
          </div>
          <div className="space-y-1.5 text-xs text-[var(--text-muted)]">
            <div className="font-mono break-all">
              Registry:{' '}
              <a
                href={explorerAddrUrl(reputation.onChain.contract, reputation.onChain.chainId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--phosphor)] hover:underline"
              >{shortAddr(reputation.onChain.contract)}</a>
            </div>
            {reputation.onChain.lastTxHash && (
              <div className="font-mono break-all">
                Last attestation:{' '}
                <a
                  href={explorerTxUrl(reputation.onChain.lastTxHash, reputation.onChain.chainId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--phosphor)] hover:underline"
                >{shortAddr(reputation.onChain.lastTxHash)}</a>
                {reputation.onChain.lastTxAt && (
                  <span className="ml-2 text-[var(--text-muted)]">
                    {new Date(reputation.onChain.lastTxAt).toLocaleString()}
                  </span>
                )}
              </div>
            )}
            {reputation.onChain.attestationCount === 0 && reputation.total === 0 && (
              <div className="text-[10px] italic">
                No feedback yet. User thumbs go on-chain automatically; activity milestones every 100 messages.
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Runtime signing — opt-in private-key injection */}
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
        {signingPendingConfirm ? (
          <div className="border border-amber-500/40 bg-amber-500/5 p-3 space-y-3">
            <div className="flex items-start gap-2 text-[11px] text-amber-400">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                Enabling injects the agent&apos;s SKALE private key into the container env
                (<code className="font-mono">SKALE_PRIVATE_KEY</code>) on next start. The agent
                will be able to sign + submit transactions on its own. You can revoke at any
                time. Restart the container after toggling for the change to take effect.
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => void applySigningChange(true)}
                disabled={signingToggling}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider border border-amber-500/60 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition disabled:opacity-50"
              >
                <Key size={12} />
                {signingToggling ? 'Enabling…' : 'Confirm enable'}
              </button>
              <button
                onClick={cancelEnableSigning}
                disabled={signingToggling}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-white/5 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => signingEnabled ? void applySigningChange(false) : requestEnableSigning()}
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
        )}
        {signingError && (
          <div className="mt-3 flex items-start gap-2 p-3 border border-red-500/30 bg-red-500/5 text-[11px] text-red-400">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{signingError}</span>
          </div>
        )}
      </GlassCard>

      {/* Network footer */}
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] text-center">
        Network: SKALE Base Mainnet · Chain ID {wallet.chainId}
      </div>
    </motion.div>
  );
}

const PASSPORT_NETWORK_ORDER: AgentPassportNetworkId[] = ['skale', 'base', 'solana'];

function dashboardNetworkIcon(id: AgentPassportNetworkId) {
  if (id === 'solana') return <Network size={14} />;
  if (id === 'base') return <Link2 size={14} />;
  return <ShieldCheck size={14} />;
}

function statusPill(status: AgentPassportStatus) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider ${networkStatusTone(status)}`}>
      {networkStatusLabel(status)}
    </span>
  );
}

function AgentPassportDashboardCard({
  passport,
  onCopy,
  onProvision,
  provisioning,
  onRestartRuntime,
  runtimeRestartNeeded,
  restartingRuntime,
}: {
  passport: AgentPassport;
  onCopy: (value: string | null | undefined, label: string) => void;
  onProvision: () => void;
  provisioning: boolean;
  onRestartRuntime: () => void;
  runtimeRestartNeeded: boolean;
  restartingRuntime: boolean;
}) {
  const networks = PASSPORT_NETWORK_ORDER
    .map((id) => passport.identity.networks.find((network) => network.id === id))
    .filter((network): network is AgentPassportNetwork => !!network);
  const hasSolanaWallet = networks.some((network) => network.id === 'solana' && network.walletAddress);

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 border border-[var(--phosphor)]/40 flex items-center justify-center">
            <Fingerprint size={18} className="text-[var(--phosphor)]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Agent Passport</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Identity, wallet, x402 and MCP surface shared by dashboard and 3D room.
            </p>
            <button
              type="button"
              onClick={() => onCopy(passport.identity.handle, 'Passport handle')}
              className="mt-2 block max-w-full truncate font-mono text-[11px] text-[var(--phosphor)] hover:underline"
              title={passport.identity.handle}
            >
              {passport.identity.handle}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!hasSolanaWallet && (
            <button
              type="button"
              onClick={onProvision}
              disabled={provisioning}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-wider border border-[var(--phosphor)]/40 text-[var(--phosphor)] hover:bg-[var(--phosphor)]/10 transition disabled:opacity-50"
            >
              <RefreshCw size={10} className={provisioning ? 'animate-spin' : ''} />
              {provisioning ? 'Provisioning' : 'Provision chains'}
            </button>
          )}
          {runtimeRestartNeeded && (
            <button
              type="button"
              onClick={onRestartRuntime}
              disabled={restartingRuntime}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-wider border border-amber-400/40 text-amber-200 hover:bg-amber-400/10 transition disabled:opacity-50"
            >
              <RefreshCw size={10} className={restartingRuntime ? 'animate-spin' : ''} />
              {restartingRuntime ? 'Restarting' : 'Restart runtime'}
            </button>
          )}
          <DashboardLinkButton href={passport.links.room} label="3D room" />
          <DashboardLinkButton href={passport.links.passport} label="passport.json" />
          <DashboardLinkButton href={passport.mcp.manifestUrl} label="MCP manifest" />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {networks.map((network) => (
          <DashboardNetworkCard key={network.id} network={network} onCopy={onCopy} />
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-3 mt-3">
        <div className="border border-[var(--border-subtle)] bg-black/20 p-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <WalletIcon size={12} /> Wallets
            </div>
            {statusPill(passport.wallets[0]?.status ?? 'planned')}
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {passport.wallets.map((wallet) => (
              <button
                key={wallet.id}
                type="button"
                onClick={() => onCopy(wallet.address, `${wallet.chainType.toUpperCase()} wallet`)}
                disabled={!wallet.address}
                className="min-w-0 text-left border border-[var(--border-subtle)] bg-[var(--bg-base)]/40 px-3 py-2 disabled:cursor-default"
              >
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  {wallet.chainType} · {wallet.networks.join(', ')}
                </div>
                <div className="mt-1 truncate font-mono text-xs text-[var(--text-primary)]">
                  {shortAddress(wallet.address)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border border-[var(--border-subtle)] bg-black/20 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] mb-3">
            <CreditCard size={12} /> x402 Payments
          </div>
          <div className="space-y-2">
            {passport.payments.map((rail) => (
              <DashboardPaymentRail key={rail.id} rail={rail} onCopy={onCopy} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 border border-violet-400/25 bg-violet-500/5 p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-violet-200">
            <Server size={12} /> MCP
          </div>
          {statusPill(passport.mcp.status)}
        </div>
        <button
          type="button"
          onClick={() => onCopy(passport.mcp.manifestUrl, 'MCP manifest URL')}
          className="mt-2 max-w-full truncate font-mono text-[11px] text-violet-200/80 hover:text-violet-100"
          title={passport.mcp.manifestUrl}
        >
          {passport.mcp.manifestUrl}
        </button>
      </div>
    </GlassCard>
  );
}

function DashboardNetworkCard({
  network,
  onCopy,
}: {
  network: AgentPassportNetwork;
  onCopy: (value: string | null | undefined, label: string) => void;
}) {
  return (
    <div className="min-w-0 border border-[var(--border-subtle)] bg-black/20 p-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 border border-[var(--border-subtle)] flex items-center justify-center text-[var(--phosphor)]">
          {dashboardNetworkIcon(network.id)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{network.label}</div>
          <div className="truncate font-mono text-[10px] text-[var(--text-muted)]">{network.caip2}</div>
        </div>
      </div>
      <div className="mt-3">{statusPill(network.status)}</div>
      <button
        type="button"
        onClick={() => onCopy(network.walletAddress, `${network.label} wallet`)}
        disabled={!network.walletAddress}
        className="mt-3 flex w-full items-center justify-between gap-2 border border-[var(--border-subtle)] bg-[var(--bg-base)]/40 px-2 py-1.5 disabled:cursor-default"
      >
        <span className="truncate font-mono text-[11px] text-[var(--text-primary)]">
          {shortAddress(network.walletAddress)}
        </span>
        {network.walletAddress && <Copy size={12} className="flex-shrink-0 text-[var(--text-muted)]" />}
      </button>
      <div className="mt-2 truncate text-[11px] text-[var(--text-muted)]">
        {network.agentId ? `agentId ${network.agentId}` : network.registry ?? 'registry pending'}
      </div>
      {network.explorerUrl && (
        <a
          href={network.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--phosphor)] hover:underline"
        >
          Explorer <ExternalLink size={10} />
        </a>
      )}
    </div>
  );
}

function DashboardPaymentRail({
  rail,
  onCopy,
}: {
  rail: AgentPassportPaymentRail;
  onCopy: (value: string | null | undefined, label: string) => void;
}) {
  return (
    <div className="border border-[var(--border-subtle)] bg-[var(--bg-base)]/40 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{rail.network}</span>
        {statusPill(rail.status)}
      </div>
      <button
        type="button"
        onClick={() => onCopy(rail.receivingAddress, `${rail.network} payTo`)}
        disabled={!rail.receivingAddress}
        className="mt-1 block w-full min-w-0 text-left disabled:cursor-default"
      >
        <span className="block truncate font-mono text-[11px] text-[var(--text-primary)]">
          payTo {shortAddress(rail.receivingAddress)}
        </span>
        <span className="block truncate font-mono text-[10px] text-[var(--text-muted)]">
          asset {rail.asset ? shortAddress(rail.asset) : rail.caip2}
        </span>
      </button>
    </div>
  );
}

function DashboardLinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-wider border border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--phosphor)] hover:text-[var(--phosphor)] transition"
    >
      {label} <ExternalLink size={10} />
    </a>
  );
}

function ReputationStat({
  label, value, icon, tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'phosphor' | 'muted';
}) {
  const valueClass = tone === 'phosphor'
    ? 'text-[var(--phosphor)]'
    : 'text-[var(--text-primary)]';
  return (
    <div className="border border-[var(--border-subtle)] bg-black/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-lg font-mono font-semibold ${valueClass}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}
