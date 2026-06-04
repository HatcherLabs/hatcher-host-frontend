'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Fingerprint,
  Key,
  Layers3,
  Lock,
  RefreshCw,
  ShieldCheck,
  Star,
  ThumbsDown,
  ThumbsUp,
  Wallet as WalletIcon,
  X,
  Zap,
} from 'lucide-react';
import { useAgentContext, GlassCard } from '../AgentContext';
import { api } from '@/lib/api';
import type {
  AgentPassport,
  AgentPassportNetwork,
  AgentPassportNetworkId,
  AgentWalletNetworkBalance,
  AgentWalletPrivateKeyResponse,
  AgentWalletsResponse,
} from '@/lib/api';
import { buildFallbackPassport, shortAddress } from '@/lib/agent-passport';
import { KausalayerWalletPanel } from './KausalayerWalletPanel';
import { ConduitWalletPanel } from './ConduitWalletPanel';
import { OobeWalletPanel } from './OobeWalletPanel';
import { ClawVilleWalletPanel } from './ClawVilleWalletPanel';

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

type WalletPanel = 'passport' | AgentPassportNetworkId;

const TAB_ORDER: WalletPanel[] = ['passport', 'skale', 'solana', 'base'];
const NETWORK_ORDER: AgentPassportNetworkId[] = ['skale', 'solana', 'base'];

function labelForPanel(panel: WalletPanel): string {
  if (panel === 'passport') return 'Passport';
  if (panel === 'skale') return 'SKALE';
  if (panel === 'solana') return 'Solana';
  return 'Base';
}

function iconForPanel(panel: WalletPanel) {
  if (panel === 'passport') return <Fingerprint size={14} />;
  if (panel === 'skale') return <ShieldCheck size={14} />;
  if (panel === 'solana') return <Zap size={14} />;
  return <Layers3 size={14} />;
}

function explorerTxUrl(txHash: string, chainId: number): string {
  return `https://skale-base-explorer.skalenodes.com/tx/${txHash}`;
}

function explorerAddrUrl(address: string, chainId: number): string {
  return `https://skale-base-explorer.skalenodes.com/address/${address}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatBalance(value: string | null | undefined): string {
  if (!value) return '0';
  if (!value.includes('.')) return value;
  const [whole, fraction = ''] = value.split('.');
  const trimmed = fraction.replace(/0+$/, '').slice(0, 6);
  return trimmed ? `${whole}.${trimmed}` : whole;
}

function walletEnvFor(id: AgentPassportNetworkId): { walletEnvVar: string; privateKeyEnvVar: string } {
  if (id === 'skale') return { walletEnvVar: 'SKALE_WALLET_ADDRESS', privateKeyEnvVar: 'SKALE_PRIVATE_KEY' };
  if (id === 'base') return { walletEnvVar: 'BASE_WALLET_ADDRESS', privateKeyEnvVar: 'BASE_PRIVATE_KEY' };
  return { walletEnvVar: 'SOLANA_WALLET_ADDRESS', privateKeyEnvVar: 'SOLANA_PRIVATE_KEY' };
}

function fallbackWalletNetwork(network: AgentPassportNetwork): AgentWalletNetworkBalance {
  const env = walletEnvFor(network.id);
  return {
    id: network.id,
    label: network.label,
    chainType: network.chainType,
    status: network.status,
    caip2: network.caip2,
    chainId: network.chainId ? String(network.chainId) : null,
    address: network.walletAddress,
    explorerUrl: network.explorerUrl,
    sharedWalletWith: network.sharedWalletWith,
    walletEnvVar: env.walletEnvVar,
    privateKeyEnvVar: env.privateKeyEnvVar,
    canSign: !!network.walletAddress,
    nativeBalance: null,
    tokenBalances: [],
    balanceError: null,
    identity:
      network.id === 'skale'
        ? {
            agentId: network.agentId,
            registry: network.contracts?.identity ?? network.registry,
            registrationTxHash: null,
            registeredAt: network.registeredAt,
          }
        : null,
  };
}

export function WalletTab() {
  const { agent, loadAgent } = useAgentContext();
  const [passport, setPassport] = useState<AgentPassport | null>(null);
  const [wallets, setWallets] = useState<AgentWalletsResponse | null>(null);
  const [reputation, setReputation] = useState<ReputationState | null>(null);
  const [activePanel, setActivePanel] = useState<WalletPanel>('passport');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [registeringSkale, setRegisteringSkale] = useState(false);
  const [registerMsg, setRegisterMsg] = useState<string | null>(null);
  const [provisioningChains, setProvisioningChains] = useState(false);
  const [runtimeRestartNeeded, setRuntimeRestartNeeded] = useState(false);
  const [restartingRuntime, setRestartingRuntime] = useState(false);
  const [privateKeyNetwork, setPrivateKeyNetwork] = useState<AgentWalletNetworkBalance | null>(null);
  const [privateKeyPassword, setPrivateKeyPassword] = useState('');
  const [privateKeyValue, setPrivateKeyValue] = useState<AgentWalletPrivateKeyResponse | null>(null);
  const [privateKeyLoading, setPrivateKeyLoading] = useState(false);
  const [privateKeyError, setPrivateKeyError] = useState<string | null>(null);
  const [privateKeyVisible, setPrivateKeyVisible] = useState(false);

  const activePassport = useMemo(() => passport ?? buildFallbackPassport(agent, agent.id), [agent, passport]);

  const networks = useMemo(() => {
    const fromWallets = new Map((wallets?.networks ?? []).map((network) => [network.id, network]));
    const fromPassport = new Map(
      activePassport.identity.networks.map((network) => [network.id, fallbackWalletNetwork(network)]),
    );
    return NETWORK_ORDER.map((id) => fromWallets.get(id) ?? fromPassport.get(id)).filter(
      (network): network is AgentWalletNetworkBalance => !!network,
    );
  }, [activePassport.identity.networks, wallets]);

  const networkById = useMemo(() => new Map(networks.map((network) => [network.id, network])), [networks]);

  const loadWalletData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [walletsRes, passportRes, reputationRes] = await Promise.allSettled([
      api.getAgentWallets(agent.id),
      api.getAgentPassport(agent.id),
      api.getAgentReputation(agent.id),
    ]);

    if (walletsRes.status === 'fulfilled' && walletsRes.value.success) {
      setWallets(walletsRes.value.data);
    } else {
      let message: string | null = null;
      if (walletsRes.status === 'fulfilled') {
        message = walletsRes.value.success ? null : walletsRes.value.error;
      } else if (walletsRes.reason instanceof Error) {
        message = walletsRes.reason.message;
      }
      setError(message ?? 'Could not load wallet balances');
    }

    if (passportRes.status === 'fulfilled' && passportRes.value.success) {
      setPassport(passportRes.value.data);
    }

    if (reputationRes.status === 'fulfilled' && reputationRes.value.success) {
      setReputation(reputationRes.value.data);
    }

    setLoading(false);
  }, [agent.id]);

  useEffect(() => {
    void loadWalletData();
  }, [loadWalletData]);

  const copy = (value: string | null | undefined, label: string) => {
    if (!value) return;
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopyMsg(`${label} copied`);
        setTimeout(() => setCopyMsg(null), 1600);
      })
      .catch(() => {
        setCopyMsg('Copy failed');
        setTimeout(() => setCopyMsg(null), 1600);
      });
  };

  const registerSkaleIdentity = async () => {
    setRegisteringSkale(true);
    setRegisterMsg(null);
    try {
      const res = await api.registerAgentSkale(agent.id);
      if (!res.success) throw new Error(res.error || 'SKALE registration failed');
      setRegisterMsg(
        res.data.txHash ? `SKALE identity registered. tx=${res.data.txHash.slice(0, 10)}...` : 'SKALE identity synced',
      );
      await loadWalletData();
      await loadAgent();
    } catch (e) {
      setRegisterMsg(e instanceof Error ? e.message : 'SKALE registration failed');
    } finally {
      setRegisteringSkale(false);
      setTimeout(() => setRegisterMsg(null), 6000);
    }
  };

  const provisionChainAccounts = async () => {
    setProvisioningChains(true);
    try {
      const res = await api.provisionAgentChainAccounts(agent.id);
      if (!res.success) throw new Error(res.error || 'Provisioning failed');
      await loadWalletData();
      setRuntimeRestartNeeded(res.data.needsRestart);
      setCopyMsg(
        res.data.needsRestart
          ? 'Provisioned. Restart agent to refresh runtime env'
          : res.data.provisioned
            ? 'Wallets provisioned'
            : 'Wallets already provisioned',
      );
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

  const openPrivateKeyModal = (network: AgentWalletNetworkBalance) => {
    setPrivateKeyNetwork(network);
    setPrivateKeyPassword('');
    setPrivateKeyValue(null);
    setPrivateKeyError(null);
    setPrivateKeyVisible(false);
  };

  const closePrivateKeyModal = () => {
    setPrivateKeyNetwork(null);
    setPrivateKeyPassword('');
    setPrivateKeyValue(null);
    setPrivateKeyError(null);
    setPrivateKeyVisible(false);
    setPrivateKeyLoading(false);
  };

  const exportPrivateKey = async () => {
    if (!privateKeyNetwork) return;
    setPrivateKeyLoading(true);
    setPrivateKeyError(null);
    try {
      const res = await api.exportAgentWalletPrivateKey(agent.id, privateKeyNetwork.id, privateKeyPassword);
      if (!res.success) throw new Error(res.error || 'Private key export failed');
      setPrivateKeyValue(res.data);
      setPrivateKeyVisible(true);
      setPrivateKeyPassword('');
    } catch (e) {
      setPrivateKeyError(e instanceof Error ? e.message : 'Private key export failed');
      setPrivateKeyValue(null);
      setPrivateKeyVisible(false);
    } finally {
      setPrivateKeyLoading(false);
    }
  };

  const missingWallets = networks.some((network) => !network.address);
  const activeNetwork = activePanel === 'passport' ? null : networkById.get(activePanel);

  if (loading && !wallets && !passport) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 p-6">
        <div className="shimmer h-8 w-48 rounded-xl" />
        <div className="shimmer h-32 w-full rounded-xl" />
        <div className="shimmer h-24 w-full rounded-xl" />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border border-[var(--phosphor)]/40">
            <WalletIcon size={18} className="text-[var(--phosphor)]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Agent Wallets</h2>
            <button
              type="button"
              onClick={() => copy(activePassport.identity.handle, 'Passport handle')}
              className="block max-w-full truncate font-mono text-xs text-[var(--phosphor)] hover:underline"
              title={activePassport.identity.handle}
            >
              {activePassport.identity.handle}
            </button>
          </div>
        </div>
        <button
          onClick={() => void loadWalletData()}
          disabled={loading}
          className="inline-flex items-center gap-2 border border-[var(--border-subtle)] px-3 py-1.5 text-xs uppercase tracking-wider transition hover:border-[var(--phosphor)] disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--border-subtle)] bg-black/20 p-1 md:grid-cols-4">
        {TAB_ORDER.map((panel) => (
          <button
            key={panel}
            type="button"
            onClick={() => setActivePanel(panel)}
            className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-xs font-medium uppercase tracking-wider transition ${
              activePanel === panel
                ? 'border border-[var(--phosphor)]/40 bg-[var(--phosphor)]/10 text-[var(--phosphor)]'
                : 'border border-transparent text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]'
            }`}
          >
            {iconForPanel(panel)}
            {labelForPanel(panel)}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{error}. Showing cached passport data where available.</span>
        </div>
      )}

      {copyMsg && <div className="text-[10px] text-[var(--phosphor)]">{copyMsg}</div>}

      {activePanel === 'passport' ? (
        <PassportPanel
          passport={activePassport}
          wallets={wallets}
          networks={networks}
          missingWallets={missingWallets}
          provisioningChains={provisioningChains}
          runtimeRestartNeeded={runtimeRestartNeeded}
          restartingRuntime={restartingRuntime}
          onCopy={copy}
          onProvision={() => void provisionChainAccounts()}
          onRestartRuntime={() => void restartRuntime()}
          onOpenNetwork={setActivePanel}
        />
      ) : activeNetwork ? (
        <div className="space-y-4">
          <ChainWalletPanel
            network={activeNetwork}
            reputation={reputation}
            registeringSkale={registeringSkale}
            registerMsg={registerMsg}
            onRegisterSkale={() => void registerSkaleIdentity()}
            onCopy={copy}
            onViewPrivateKey={openPrivateKeyModal}
          />
          {activeNetwork.id === 'solana' && (
            <>
              <ConduitWalletPanel agentId={agent.id} />
              <OobeWalletPanel agentId={agent.id} />
              <ClawVilleWalletPanel agentId={agent.id} />
              <KausalayerWalletPanel agentId={agent.id} />
            </>
          )}
        </div>
      ) : (
        <GlassCard className="p-6 text-sm text-[var(--text-muted)]">Wallet not provisioned yet.</GlassCard>
      )}

      {privateKeyNetwork && (
        <PrivateKeyModal
          network={privateKeyNetwork}
          password={privateKeyPassword}
          privateKey={privateKeyValue}
          loading={privateKeyLoading}
          error={privateKeyError}
          visible={privateKeyVisible}
          onPasswordChange={setPrivateKeyPassword}
          onSubmit={() => void exportPrivateKey()}
          onToggleVisible={() => setPrivateKeyVisible((value) => !value)}
          onCopy={() => copy(privateKeyValue?.privateKey, `${labelForPanel(privateKeyNetwork.id)} private key`)}
          onClose={closePrivateKeyModal}
        />
      )}
    </motion.div>
  );
}

function PassportPanel({
  passport,
  wallets,
  networks,
  missingWallets,
  provisioningChains,
  runtimeRestartNeeded,
  restartingRuntime,
  onCopy,
  onProvision,
  onRestartRuntime,
  onOpenNetwork,
}: {
  passport: AgentPassport;
  wallets: AgentWalletsResponse | null;
  networks: AgentWalletNetworkBalance[];
  missingWallets: boolean;
  provisioningChains: boolean;
  runtimeRestartNeeded: boolean;
  restartingRuntime: boolean;
  onCopy: (value: string | null | undefined, label: string) => void;
  onProvision: () => void;
  onRestartRuntime: () => void;
  onOpenNetwork: (panel: WalletPanel) => void;
}) {
  const transactionNetworks =
    wallets?.runtime.transactionNetworks ?? networks.filter((network) => network.canSign).map((network) => network.id);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <Fingerprint size={12} /> Passport Overview
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{passport.agent.name}</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
              SKALE remains the identity and reputation anchor. SKALE, Solana, and Base wallets are available to
              OpenClaw and Hermes runtimes by default for delegated autonomous trading.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {missingWallets && (
              <button
                type="button"
                onClick={onProvision}
                disabled={provisioningChains}
                className="inline-flex items-center gap-1 border border-[var(--phosphor)]/40 px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--phosphor)] transition hover:bg-[var(--phosphor)]/10 disabled:opacity-50"
              >
                <RefreshCw size={10} className={provisioningChains ? 'animate-spin' : ''} />
                {provisioningChains ? 'Provisioning' : 'Provision wallets'}
              </button>
            )}
            {runtimeRestartNeeded && (
              <button
                type="button"
                onClick={onRestartRuntime}
                disabled={restartingRuntime}
                className="inline-flex items-center gap-1 border border-amber-400/40 px-2 py-1 text-[10px] uppercase tracking-wider text-amber-200 transition hover:bg-amber-400/10 disabled:opacity-50"
              >
                <RefreshCw size={10} className={restartingRuntime ? 'animate-spin' : ''} />
                {restartingRuntime ? 'Restarting' : 'Restart runtime'}
              </button>
            )}
            <LinkButton href={passport.links.passport} label="passport.json" />
            <LinkButton href={passport.mcp.manifestUrl} label="MCP manifest" />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {networks.map((network) => (
            <button
              key={network.id}
              type="button"
              onClick={() => onOpenNetwork(network.id)}
              className="min-w-0 border border-[var(--border-subtle)] bg-black/20 p-3 text-left transition hover:border-[var(--phosphor)]/50"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center border border-[var(--border-subtle)] text-[var(--phosphor)]">
                    {iconForPanel(network.id)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{network.label}</div>
                    <div className="truncate font-mono text-[10px] text-[var(--text-muted)]">{network.caip2}</div>
                  </div>
                </div>
                <div className="text-[var(--phosphor)]">{iconForPanel(network.id)}</div>
              </div>
              <div className="mt-3 truncate font-mono text-xs text-[var(--text-primary)]">
                {shortAddress(network.address)}
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                {network.id === 'skale' ? 'Identity and reputation' : 'Runtime wallet'}
              </div>
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <Key size={12} /> Runtime Access
          </div>
        </div>
        <div className="space-y-3 text-xs leading-relaxed text-[var(--text-muted)]">
          <p>
            The agent runtime can sign on every provisioned chain and can run delegated autonomous trading when
            the wallet has enough gas or fees.
          </p>
          <div className="grid gap-2">
            {networks.map((network) => (
              <div key={network.id} className="border border-[var(--border-subtle)] bg-black/20 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--text-primary)]">{network.label}</span>
                  <button
                    type="button"
                    onClick={() => onCopy(network.address, `${network.label} address`)}
                    disabled={!network.address}
                    className="max-w-[70%] truncate font-mono text-[10px] text-[var(--phosphor)] hover:underline disabled:cursor-default disabled:text-[var(--text-muted)] disabled:no-underline"
                    title={network.address ?? 'Not provisioned'}
                  >
                    {network.address ?? 'Not provisioned'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px]">
            Transaction networks:{' '}
            <span className="text-[var(--text-primary)]">
              {transactionNetworks.length > 0 ? transactionNetworks.join(', ') : 'none'}
            </span>
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

function ChainWalletPanel({
  network,
  reputation,
  registeringSkale,
  registerMsg,
  onRegisterSkale,
  onCopy,
  onViewPrivateKey,
}: {
  network: AgentWalletNetworkBalance;
  reputation: ReputationState | null;
  registeringSkale: boolean;
  registerMsg: string | null;
  onRegisterSkale: () => void;
  onCopy: (value: string | null | undefined, label: string) => void;
  onViewPrivateKey: (network: AgentWalletNetworkBalance) => void;
}) {
  const isSkale = network.id === 'skale';
  const native = network.nativeBalance;
  const token = network.tokenBalances[0] ?? null;

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {iconForPanel(network.id)} {network.label} Wallet
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                {network.label} wallet
              </h3>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {isSkale
                ? 'SKALE stores the Hatcher agent identity and reputation anchor.'
                : 'Available to the agent runtime for delegated autonomous trading.'}
            </p>
          </div>
          {network.explorerUrl && <LinkButton href={network.explorerUrl} label="Explorer" />}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.75fr_1.25fr_0.8fr]">
          <WalletQr address={network.address} label={network.label} />

          <div className="min-w-0 border border-[var(--border-subtle)] bg-black/20 p-4">
            <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Address</div>
            <button
              type="button"
              onClick={() => onCopy(network.address, `${network.label} address`)}
              disabled={!network.address}
              className="block max-w-full break-all text-left font-mono text-sm text-[var(--text-primary)] hover:text-[var(--phosphor)] disabled:cursor-default disabled:hover:text-[var(--text-primary)]"
            >
              {network.address ?? 'Not provisioned'}
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onCopy(network.address, `${network.label} address`)}
                disabled={!network.address}
                className="inline-flex items-center gap-1 border border-[var(--border-subtle)] px-2 py-1 text-[10px] uppercase tracking-wider transition hover:border-[var(--phosphor)] disabled:opacity-50"
              >
                <Copy size={10} /> Copy
              </button>
              <button
                type="button"
                onClick={() => onViewPrivateKey(network)}
                disabled={!network.address}
                className="inline-flex items-center gap-1 border border-red-400/30 px-2 py-1 text-[10px] uppercase tracking-wider text-red-200 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                <Key size={10} /> View private key
              </button>
              {network.sharedWalletWith && (
                <span className="inline-flex items-center border border-[var(--border-subtle)] px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  Shares EVM key with {network.sharedWalletWith}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <BalanceTile
              label={native ? `${network.label} ${native.symbol}` : 'Native balance'}
              value={native ? formatBalance(native.formatted) : '-'}
              symbol={native?.symbol ?? ''}
              error={network.balanceError}
            />
            <BalanceTile
              label={token ? `${token.symbol} balance` : 'Token balance'}
              value={token ? formatBalance(token.formatted) : '-'}
              symbol={token?.symbol ?? ''}
            />
          </div>
        </div>
      </GlassCard>

      {isSkale ? (
        <SkaleIdentityPanel
          network={network}
          reputation={reputation}
          registeringSkale={registeringSkale}
          registerMsg={registerMsg}
          onRegisterSkale={onRegisterSkale}
          onCopy={onCopy}
        />
      ) : null}
    </div>
  );
}

function PrivateKeyModal({
  network,
  password,
  privateKey,
  loading,
  error,
  visible,
  onPasswordChange,
  onSubmit,
  onToggleVisible,
  onCopy,
  onClose,
}: {
  network: AgentWalletNetworkBalance;
  password: string;
  privateKey: AgentWalletPrivateKeyResponse | null;
  loading: boolean;
  error: string | null;
  visible: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onToggleVisible: () => void;
  onCopy: () => void;
  onClose: () => void;
}) {
  const maskedKey = privateKey ? '*'.repeat(Math.min(privateKey.privateKey.length, 96)) : '';
  const passwordInputId = `wallet-private-key-password-${network.id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!privateKey) onSubmit();
        }}
        className="w-full max-w-xl border border-red-400/30 bg-[#050807] p-5 shadow-2xl shadow-black/60"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-red-200">
              <Lock size={12} /> Private Key Export
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {network.label} private key
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              Confirm your account password to reveal this managed wallet key. Anyone with this key can move funds from
              the wallet.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center border border-[var(--border-subtle)] text-[var(--text-muted)] transition hover:border-red-300 hover:text-red-200"
            aria-label="Close private key dialog"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mt-4 border border-[var(--border-subtle)] bg-black/25 p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Wallet address</div>
          <div className="mt-1 break-all font-mono text-xs text-[var(--text-primary)]">
            {network.address}
          </div>
          {privateKey?.sharedWalletWith && (
            <div className="mt-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Shares EVM key with {privateKey.sharedWalletWith}
            </div>
          )}
        </div>

        {!privateKey ? (
          <div className="mt-4">
            <label
              htmlFor={passwordInputId}
              className="block text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]"
            >
              Account password
            </label>
            <input
              id={passwordInputId}
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              autoComplete="current-password"
              autoFocus
              className="mt-2 w-full border border-[var(--border-subtle)] bg-black/30 px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--phosphor)]"
            />
          </div>
        ) : (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Private key ({privateKey.format})
              </div>
              <button
                type="button"
                onClick={onToggleVisible}
                className="inline-flex items-center gap-1 border border-[var(--border-subtle)] px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)] transition hover:border-[var(--phosphor)] hover:text-[var(--phosphor)]"
              >
                {visible ? <EyeOff size={10} /> : <Eye size={10} />}
                {visible ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="max-h-44 overflow-auto break-all border border-red-400/30 bg-red-500/5 p-3 font-mono text-xs leading-relaxed text-red-100">
              {visible ? privateKey.privateKey : maskedKey}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-200">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {privateKey ? (
            <>
              <button
                type="button"
                onClick={onCopy}
                className="inline-flex items-center gap-2 border border-[var(--phosphor)]/40 px-3 py-1.5 text-xs uppercase tracking-wider text-[var(--phosphor)] transition hover:bg-[var(--phosphor)]/10"
              >
                <Copy size={12} /> Copy key
              </button>
              <button
                type="button"
                onClick={onClose}
                className="border border-[var(--border-subtle)] px-3 py-1.5 text-xs uppercase tracking-wider text-[var(--text-muted)] transition hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="border border-[var(--border-subtle)] px-3 py-1.5 text-xs uppercase tracking-wider text-[var(--text-muted)] transition hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !password.trim()}
                className="inline-flex items-center gap-2 border border-red-400/40 px-3 py-1.5 text-xs uppercase tracking-wider text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Lock size={12} /> {loading ? 'Checking' : 'View private key'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

function WalletQr({ address, label }: { address: string | null; label: string }) {
  const qrUrl = address
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(address)}`
    : null;

  return (
    <div className="flex min-h-[190px] items-center justify-center border border-[var(--border-subtle)] bg-black/20 p-4">
      {qrUrl ? (
        <div className="space-y-3 text-center">
          <div className="mx-auto border border-white/10 bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt={`${label} wallet QR code`} className="h-36 w-36" loading="lazy" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Receive</div>
        </div>
      ) : (
        <div className="text-center text-xs text-[var(--text-muted)]">QR unavailable until wallet is provisioned.</div>
      )}
    </div>
  );
}

function BalanceTile({
  label,
  value,
  symbol,
  error,
}: {
  label: string;
  value: string;
  symbol: string;
  error?: string | null;
}) {
  return (
    <div className="border border-[var(--border-subtle)] bg-black/20 p-4">
      <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
      <div className="truncate font-mono text-2xl text-[var(--text-primary)]">
        {value} {symbol && <span className="text-sm text-[var(--text-muted)]">{symbol}</span>}
      </div>
      {error && <div className="mt-2 text-[10px] text-amber-300">Balance lookup failed: {error}</div>}
    </div>
  );
}

function SkaleIdentityPanel({
  network,
  reputation,
  registeringSkale,
  registerMsg,
  onRegisterSkale,
  onCopy,
}: {
  network: AgentWalletNetworkBalance;
  reputation: ReputationState | null;
  registeringSkale: boolean;
  registerMsg: string | null;
  onRegisterSkale: () => void;
  onCopy: (value: string | null | undefined, label: string) => void;
}) {
  const identity = network.identity;
  const agentId = identity?.agentId ?? null;
  const onChainRep = identity?.reputation;
  const needsRegister = !!network.address && !agentId;
  const registerMsgIsError = !!registerMsg && /failed|unavailable|awaiting|error|temporarily/i.test(registerMsg);
  const registrationHref = identity?.registrationTxHash
    ? explorerTxUrl(identity.registrationTxHash, Number(network.chainId ?? 0))
    : identity?.registry
      ? explorerAddrUrl(identity.registry, Number(network.chainId ?? 0))
      : null;
  const registrationLabel = identity?.registrationTxHash ? 'Registration tx' : 'Registry';
  const registrationValue = identity?.registrationTxHash ?? identity?.registry ?? '-';
  const reputationTxHash = onChainRep?.lastTxHash ?? reputation?.onChain.lastTxHash ?? null;
  const reputationHref = reputationTxHash
    ? explorerTxUrl(reputationTxHash, reputation?.onChain.chainId ?? Number(network.chainId ?? 0))
    : onChainRep?.contract
      ? explorerAddrUrl(onChainRep.contract, reputation?.onChain.chainId ?? Number(network.chainId ?? 0))
      : null;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <GlassCard className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <ShieldCheck size={12} /> Agent Identity
          </div>
        </div>
        <div className="space-y-3 text-xs text-[var(--text-muted)]">
          <InfoLine label="Agent ID" value={agentId ?? '-'} onCopy={() => onCopy(agentId, 'SKALE agent ID')} />
          <InfoLine
            label={registrationLabel}
            value={registrationValue}
            href={registrationHref ?? undefined}
            onCopy={() => onCopy(registrationValue === '-' ? null : registrationValue, registrationLabel)}
          />
          <InfoLine label="Registered" value={formatDate(identity?.registeredAt)} />
        </div>
        {needsRegister && (
          <button
            type="button"
            onClick={onRegisterSkale}
            disabled={registeringSkale}
            className="mt-4 inline-flex items-center gap-2 border border-[var(--phosphor)]/40 px-3 py-1.5 text-[10px] uppercase tracking-wider text-[var(--phosphor)] transition hover:bg-[var(--phosphor)]/10 disabled:opacity-50"
          >
            <ShieldCheck size={11} />
            {registeringSkale ? 'Registering' : 'Verify on SKALE'}
          </button>
        )}
        {registerMsg && (
          <div className={`mt-3 text-[10px] ${registerMsgIsError ? 'text-red-400' : 'text-[var(--phosphor)]'}`}>
            {registerMsg}
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <Star size={12} /> Reputation
          </div>
          {reputation?.scorePct !== null && reputation?.scorePct !== undefined && (
            <span className="border border-[var(--phosphor)]/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--phosphor)]">
              {reputation.scorePct}% positive
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ReputationStat label="Thumbs up" value={reputation?.upCount ?? 0} icon={<ThumbsUp size={11} />} />
          <ReputationStat label="Thumbs down" value={reputation?.downCount ?? 0} icon={<ThumbsDown size={11} />} />
          <ReputationStat
            label="On-chain"
            value={onChainRep?.attestationCount ?? reputation?.onChain.attestationCount ?? 0}
            icon={<ShieldCheck size={11} />}
          />
          <ReputationStat label="Activity" value={reputation?.onChain.activityMilestone ?? 0} icon={<Zap size={11} />} />
        </div>
        <div className="mt-3 space-y-1.5 text-[11px] text-[var(--text-muted)]">
          {reputationHref && (
            <a
              href={reputationHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 truncate font-mono text-[var(--phosphor)] hover:underline"
            >
              {reputationTxHash ? 'Reputation tx' : 'Reputation contract'}{' '}
              {shortAddress(reputationTxHash ?? onChainRep?.contract)} <ExternalLink size={10} />
            </a>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function InfoLine({
  label,
  value,
  href,
  onCopy,
}: {
  label: string;
  value: string;
  href?: string;
  onCopy?: () => void;
}) {
  return (
    <div className="min-w-0 border border-[var(--border-subtle)] bg-black/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onCopy}
          disabled={!onCopy || value === '-'}
          className="block min-w-0 truncate font-mono text-xs text-[var(--text-primary)] hover:text-[var(--phosphor)] disabled:cursor-default disabled:hover:text-[var(--text-primary)]"
          title={value}
        >
          {value}
        </button>
        {href && value !== '-' && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-[var(--phosphor)] hover:text-[var(--text-primary)]"
            aria-label={`Open ${label}`}
          >
            <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
}

function ReputationStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="border border-[var(--border-subtle)] bg-black/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-mono text-lg font-semibold text-[var(--text-primary)]">{value.toLocaleString()}</div>
    </div>
  );
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 border border-[var(--border-subtle)] px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)] transition hover:border-[var(--phosphor)] hover:text-[var(--phosphor)]"
    >
      {label} <ExternalLink size={10} />
    </a>
  );
}
