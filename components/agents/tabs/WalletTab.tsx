'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CircleDot,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Fingerprint,
  History,
  Key,
  Layers3,
  Lock,
  RefreshCw,
  Repeat2,
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
  AgentWalletActivityDirection,
  AgentWalletActivityNetwork,
  AgentWalletActivityResponse,
  AgentWalletActivityTransaction,
  AgentWalletNetworkBalance,
  AgentWalletPrivateKeyResponse,
  AgentWalletsResponse,
} from '@/lib/api';
import { buildFallbackPassport, shortAddress } from '@/lib/agent-passport';
import { KausalayerWalletPanel } from './KausalayerWalletPanel';
import { EarnFiWalletPanel } from './EarnFiWalletPanel';
import { OobeWalletPanel } from './OobeWalletPanel';
import { ClawVilleWalletPanel } from './ClawVilleWalletPanel';
import { MirariWalletPanel } from './MirariWalletPanel';
import { XonaPartnerResourcesPanel } from './XonaPartnerResourcesPanel';
import { Mpp32WalletPanel } from './Mpp32WalletPanel';
import { MedusaWalletPanel } from './MedusaWalletPanel';
import { MetaplexWalletPanel } from './MetaplexWalletPanel';

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
type WalletSection = 'overview' | 'networks' | 'providers' | 'security';
type ProviderPanelId = 'xona' | 'earnfi' | 'oobe' | 'clawville' | 'kausalayer' | 'mirari' | 'mpp32' | 'medusa' | 'metaplex';
type AgentRuntime = 'hermes' | 'openclaw' | (string & {});

const TAB_ORDER: WalletPanel[] = ['passport', 'skale', 'solana', 'base'];
const NETWORK_ORDER: AgentPassportNetworkId[] = ['skale', 'solana', 'base'];
const WALLET_SECTIONS: ReadonlyArray<{
  id: WalletSection;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  { id: 'overview', label: 'Overview', description: 'Identity, balances, and readiness.', icon: <Fingerprint size={14} /> },
  { id: 'networks', label: 'Networks', description: 'SKALE, Solana, and Base wallets.', icon: <Layers3 size={14} /> },
  { id: 'providers', label: 'Providers', description: 'Partner rails and runtime tools.', icon: <Zap size={14} /> },
  { id: 'security', label: 'Security', description: 'Runtime access and key export.', icon: <Key size={14} /> },
];

const SOLANA_PROVIDERS: ReadonlyArray<{ id: ProviderPanelId; label: string; description: string; network: 'Solana' }> = [
  { id: 'metaplex', label: 'Metaplex', description: 'Agent Registry identity and public metadata.', network: 'Solana' },
  { id: 'xona', label: 'Xona', description: 'xPay partner resources and agent tools.', network: 'Solana' },
  { id: 'earnfi', label: 'EarnFi', description: 'Paid task creation and verification.', network: 'Solana' },
  { id: 'oobe', label: 'Oobe', description: 'SAP registration and x402 access.', network: 'Solana' },
  { id: 'clawville', label: 'ClawVille', description: 'Identity wallet and access state.', network: 'Solana' },
  { id: 'kausalayer', label: 'KausaLayer', description: 'Private pockets and saved wallets.', network: 'Solana' },
  { id: 'mirari', label: 'Mirari', description: 'Signal ingest and live mirror.', network: 'Solana' },
  { id: 'mpp32', label: 'MPP32', description: 'Signed AGTP intelligence and x402 settlement.', network: 'Solana' },
  { id: 'medusa', label: 'Medusa', description: 'Privacy passport and presale enrollment.', network: 'Solana' },
];

const BASE_PROVIDERS: ReadonlyArray<{ id: ProviderPanelId; label: string; description: string; network: 'Base' }> = [];

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

export function shouldShowMirariPanelForWallet(
  networkId: AgentPassportNetworkId,
  runtime: AgentRuntime | null | undefined,
): boolean {
  return networkId === 'solana' && runtime === 'hermes';
}

function solanaProvidersForRuntime(runtime: AgentRuntime | null | undefined) {
  return SOLANA_PROVIDERS.filter((provider) => (
    provider.id !== 'mirari' || shouldShowMirariPanelForWallet('solana', runtime)
  ));
}

function providersForRuntime(runtime: AgentRuntime | null | undefined) {
  return [...solanaProvidersForRuntime(runtime), ...BASE_PROVIDERS];
}

export function getProviderPanelIdsForWallet(
  networkId: AgentPassportNetworkId,
  runtime: AgentRuntime | null | undefined = 'hermes',
): ProviderPanelId[] {
  if (networkId === 'solana') return solanaProvidersForRuntime(runtime).map((provider) => provider.id);
  if (networkId === 'base') return BASE_PROVIDERS.map((provider) => provider.id);
  return [];
}

function providerIds(runtime: AgentRuntime | null | undefined = 'hermes'): ProviderPanelId[] {
  return providersForRuntime(runtime).map((provider) => provider.id);
}

export function getInitialWalletSectionFromSearch(search: string): WalletSection {
  const requested = new URLSearchParams(search).get('walletSection');
  return WALLET_SECTIONS.some((section) => section.id === requested) ? requested as WalletSection : 'overview';
}

export function getInitialWalletProviderFromSearch(
  search: string,
  runtime: AgentRuntime | null | undefined = 'hermes',
): ProviderPanelId {
  const requested = new URLSearchParams(search).get('walletProvider');
  const ids = providerIds(runtime);
  return ids.includes(requested as ProviderPanelId) ? requested as ProviderPanelId : ids[0] ?? 'metaplex';
}

function readInitialWalletPanel(): WalletPanel {
  if (typeof window === 'undefined') return 'passport';
  const requested = new URLSearchParams(window.location.search).get('wallet');
  return TAB_ORDER.includes(requested as WalletPanel) ? (requested as WalletPanel) : 'passport';
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

export function formatWalletActivityAmount(amount: string | null, asset: string | null): string {
  if (!amount) return '-';
  const formatted = formatBalance(amount);
  if (!asset) return formatted;
  return `${formatted} ${asset.length > 18 ? shortAddress(asset) : asset}`;
}

export function getWalletActivityNetworkForId(
  activity: AgentWalletActivityResponse | null,
  networkId: AgentPassportNetworkId,
): AgentWalletActivityNetwork | null {
  return activity?.networks.find((network) => network.id === networkId) ?? null;
}

export function getWalletActivityTransactionsForNetwork(
  activity: AgentWalletActivityResponse | null,
  networkId: AgentPassportNetworkId,
): AgentWalletActivityTransaction[] {
  return getWalletActivityNetworkForId(activity, networkId)?.transactions ?? [];
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
  const [walletActivity, setWalletActivity] = useState<AgentWalletActivityResponse | null>(null);
  const [walletActivityError, setWalletActivityError] = useState<string | null>(null);
  const [reputation, setReputation] = useState<ReputationState | null>(null);
  const [activeSection, setActiveSection] = useState<WalletSection>(() => (
    typeof window === 'undefined' ? 'overview' : getInitialWalletSectionFromSearch(window.location.search)
  ));
  const [activePanel, setActivePanelRaw] = useState<WalletPanel>(() => readInitialWalletPanel());
  const [activeProvider, setActiveProvider] = useState<ProviderPanelId>(() => (
    typeof window === 'undefined' ? 'xona' : getInitialWalletProviderFromSearch(window.location.search, agent.framework)
  ));
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

  const setActivePanel = useCallback((panel: WalletPanel) => {
    setActivePanelRaw(panel);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('wallet', panel);
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  }, []);

  const loadWalletData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWalletActivityError(null);

    const [walletsRes, passportRes, reputationRes, activityRes] = await Promise.allSettled([
      api.getAgentWallets(agent.id),
      api.getAgentPassport(agent.id),
      api.getAgentReputation(agent.id),
      api.getAgentWalletActivity(agent.id, 10),
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

    if (activityRes.status === 'fulfilled' && activityRes.value.success) {
      setWalletActivity(activityRes.value.data);
    } else {
      let message: string | null = null;
      if (activityRes.status === 'fulfilled') {
        message = activityRes.value.success ? null : activityRes.value.error;
      } else if (activityRes.reason instanceof Error) {
        message = activityRes.reason.message;
      }
      setWalletActivityError(message ?? 'Could not load wallet activity');
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
  const selectedNetworkPanel: AgentPassportNetworkId =
    activePanel === 'passport' ? (networks[0]?.id ?? 'skale') : activePanel;
  const activeNetwork = networkById.get(selectedNetworkPanel);

  if (loading && !wallets && !passport) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 p-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl shimmer" />
              <div className="space-y-2">
                <div className="h-5 w-44 rounded-full shimmer" />
                <div className="h-3 w-64 rounded-full shimmer" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-28 rounded-xl shimmer" />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-5 h-5 w-36 rounded-full shimmer" />
            <div className="space-y-3">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-10 rounded-xl shimmer" />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 p-4 sm:p-6">
      <WalletSurface className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
              <WalletIcon size={18} className="text-[var(--phosphor)]" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-[var(--text-muted)]">Managed wallets</div>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                Runtime credentials and provider access
              </h2>
              <button
                type="button"
                onClick={() => copy(activePassport.identity.handle, 'Passport handle')}
                className="mt-1 block max-w-full truncate font-mono text-xs text-[var(--accent)] hover:underline"
                title={activePassport.identity.handle}
              >
                {activePassport.identity.handle}
              </button>
            </div>
          </div>
          <button
            onClick={() => void loadWalletData()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)] disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-4">
          {WALLET_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`rounded-xl border p-3 text-left transition ${
                activeSection === section.id
                  ? 'border-[var(--border-hover)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold">
                <span className="text-[var(--accent)]">{section.icon}</span>
                {section.label}
              </span>
              <span className="block text-[11px] leading-relaxed text-[var(--text-muted)]">{section.description}</span>
            </button>
          ))}
        </div>
      </WalletSurface>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-xs text-[var(--color-warning)]">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{error}. Showing cached passport data where available.</span>
        </div>
      )}

      {copyMsg && <div className="text-xs font-medium text-[var(--accent)]">{copyMsg}</div>}

      {activeSection === 'overview' ? (
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
          onOpenNetwork={(panel) => {
            setActivePanel(panel);
            setActiveSection('networks');
          }}
        />
      ) : activeSection === 'networks' ? (
        <div className="space-y-4">
          <NetworkSelector networks={networks} activePanel={selectedNetworkPanel} onSelect={setActivePanel} />
          {activeNetwork ? (
            <ChainWalletPanel
              network={activeNetwork}
              activity={walletActivity}
              activityLoading={loading && !walletActivity}
              activityError={walletActivityError}
              reputation={reputation}
              registeringSkale={registeringSkale}
              registerMsg={registerMsg}
              onRegisterSkale={() => void registerSkaleIdentity()}
              onCopy={copy}
            />
          ) : (
            <WalletSurface className="p-6 text-sm text-[var(--text-muted)]">Wallet not provisioned yet.</WalletSurface>
          )}
        </div>
      ) : activeSection === 'providers' ? (
        <ProviderIntegrationsPanel
          agentId={agent.id}
          runtime={agent.framework}
          solanaWallet={networkById.get('solana')?.address}
          activeProvider={activeProvider}
          onProviderChange={setActiveProvider}
        />
      ) : activeSection === 'security' ? (
        <RuntimeAccessPanel
          networks={networks}
          wallets={wallets}
          onCopy={copy}
          onViewPrivateKey={openPrivateKeyModal}
        />
      ) : (
        <WalletSurface className="p-6 text-sm text-[var(--text-muted)]">Wallet not provisioned yet.</WalletSurface>
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

function WalletSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-soft)] ${className}`}>
      {children}
    </div>
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
  const readyNetworks = networks.filter((network) => !!network.address).length;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <WalletSurface className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <Fingerprint size={12} /> Passport Overview
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{passport.agent.name}</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
              SKALE anchors identity and reputation. Solana and Base credentials are available to the runtime for
              approved provider workflows and scoped signing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {missingWallets && (
              <button
                type="button"
                onClick={onProvision}
                disabled={provisioningChains}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-hover)] px-2 py-1 text-[10px] font-semibold text-[var(--accent)] transition hover:bg-[var(--tech-accent-soft)] disabled:opacity-50"
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
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-warning-border)] px-2 py-1 text-[10px] font-semibold text-[var(--color-warning)] transition hover:bg-[var(--color-warning-bg)] disabled:opacity-50"
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
              className="min-w-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3 text-left transition hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent)]">
                    {iconForPanel(network.id)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{network.label}</div>
                    <div className="truncate font-mono text-[10px] text-[var(--text-muted)]">{network.caip2}</div>
                  </div>
                </div>
                <span
                  className={`h-2 w-2 rounded-full ${network.address ? 'bg-[var(--status-live)]' : 'bg-[var(--text-dim)]'}`}
                  aria-hidden
                />
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
      </WalletSurface>

      <WalletSurface className="p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <ShieldCheck size={12} /> Readiness
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Runtime credential state</h3>
          </div>
          <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
            {readyNetworks}/{networks.length} ready
          </span>
        </div>
        <div className="grid gap-3">
          <ReadinessRow label="Identity anchor" value={networkByLabel(networks, 'skale')?.address ? 'Configured' : 'Pending'} />
          <ReadinessRow label="Provider networks" value={transactionNetworks.length > 0 ? transactionNetworks.join(', ') : 'None'} />
          <ReadinessRow label="Passport file" value={passport.links.passport ? 'Available' : 'Generated on demand'} />
        </div>
        <div className="mt-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            Provider-specific forms live under <span className="font-semibold text-[var(--text-primary)]">Providers</span>.
            Raw private key export is isolated under <span className="font-semibold text-[var(--text-primary)]">Security</span>.
          </p>
        </div>
      </WalletSurface>
    </div>
  );
}

function networkByLabel(networks: AgentWalletNetworkBalance[], id: AgentPassportNetworkId) {
  return networks.find((network) => network.id === id);
}

function ReadinessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span className="truncate text-right text-xs font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function NetworkSelector({
  networks,
  activePanel,
  onSelect,
}: {
  networks: AgentWalletNetworkBalance[];
  activePanel: WalletPanel;
  onSelect: (panel: WalletPanel) => void;
}) {
  return (
    <WalletSurface className="p-2">
      <div className="grid gap-2 md:grid-cols-3">
        {networks.map((network) => {
          const isActive = activePanel === network.id;
          return (
            <button
              key={network.id}
              type="button"
              onClick={() => onSelect(network.id)}
              className={`rounded-xl border p-3 text-left transition ${
                isActive
                  ? 'border-[var(--border-hover)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]'
                  : 'border-transparent hover:border-[var(--border-default)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent)]">
                    {iconForPanel(network.id)}
                  </span>
                  {network.label}
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${network.address ? 'bg-[var(--status-live)]' : 'bg-[var(--text-dim)]'}`}
                  aria-hidden
                />
              </div>
              <div className="mt-3 truncate font-mono text-xs text-[var(--text-secondary)]">
                {shortAddress(network.address)}
              </div>
              <div className="mt-1 truncate text-[11px] text-[var(--text-muted)]">{network.caip2}</div>
            </button>
          );
        })}
      </div>
    </WalletSurface>
  );
}

function ProviderIntegrationsPanel({
  agentId,
  runtime,
  solanaWallet,
  activeProvider,
  onProviderChange,
}: {
  agentId: string;
  runtime: AgentRuntime | null | undefined;
  solanaWallet?: string | null;
  activeProvider: ProviderPanelId;
  onProviderChange: (provider: ProviderPanelId) => void;
}) {
  const providers = providersForRuntime(runtime);
  const effectiveProvider = providers.some((provider) => provider.id === activeProvider)
    ? activeProvider
    : providers[0]?.id ?? 'xona';
  const current = providers.find((provider) => provider.id === effectiveProvider) ?? providers[0];

  return (
    <div className="space-y-4">
      <WalletSurface className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-[var(--text-muted)]">Provider integrations</div>
            <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{current.label}</h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--text-muted)]">
              {current.description}
            </p>
          </div>
          <label className="w-full text-xs font-medium text-[var(--text-muted)] lg:max-w-sm">
            Provider
            <select
              value={effectiveProvider}
              onChange={(event) => onProviderChange(event.target.value as ProviderPanelId)}
              className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-black/30 px-3 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--phosphor)]"
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label} - {provider.network}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--text-muted)]">
          <span className="rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-1">{current.network}</span>
          <span className="rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-1">Advanced setup</span>
        </div>
      </WalletSurface>

      <ProviderPanel provider={effectiveProvider} agentId={agentId} solanaWallet={solanaWallet} />
    </div>
  );
}

function ProviderPanel({ provider, agentId, solanaWallet }: { provider: ProviderPanelId; agentId: string; solanaWallet?: string | null }) {
  switch (provider) {
    case 'xona':
      return <XonaPartnerResourcesPanel agentId={agentId} />;
    case 'earnfi':
      return <EarnFiWalletPanel agentId={agentId} />;
    case 'oobe':
      return <OobeWalletPanel agentId={agentId} />;
    case 'clawville':
      return <ClawVilleWalletPanel agentId={agentId} />;
    case 'kausalayer':
      return <KausalayerWalletPanel agentId={agentId} />;
    case 'mirari':
      return <MirariWalletPanel agentId={agentId} />;
    case 'mpp32':
      return <Mpp32WalletPanel agentId={agentId} />;
    case 'medusa':
      return <MedusaWalletPanel agentId={agentId} solanaWallet={solanaWallet} />;
    case 'metaplex':
      return <MetaplexWalletPanel agentId={agentId} solanaWallet={solanaWallet} />;
    default:
      return null;
  }
}

function RuntimeAccessPanel({
  networks,
  wallets,
  onCopy,
  onViewPrivateKey,
}: {
  networks: AgentWalletNetworkBalance[];
  wallets: AgentWalletsResponse | null;
  onCopy: (value: string | null | undefined, label: string) => void;
  onViewPrivateKey: (network: AgentWalletNetworkBalance) => void;
}) {
  const transactionNetworks =
    wallets?.runtime.transactionNetworks ?? networks.filter((network) => network.canSign).map((network) => network.id);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <WalletSurface className="p-5">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
          <Key size={13} /> Runtime access
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
          Hatcher injects scoped wallet environment variables into the agent runtime. Use this page to audit addresses,
          copy public wallet IDs, and keep raw key export isolated from routine operations.
        </p>
        <div className="mt-5 grid gap-3">
          {networks.map((network) => (
            <div
              key={network.id}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <span className="text-[var(--accent)]">{iconForPanel(network.id)}</span>
                  {network.label}
                </span>
                <button
                  type="button"
                  onClick={() => onCopy(network.address, `${network.label} address`)}
                  disabled={!network.address}
                  className="max-w-full truncate font-mono text-xs text-[var(--accent)] hover:underline disabled:cursor-default disabled:text-[var(--text-muted)] disabled:no-underline sm:max-w-[70%]"
                  title={network.address ?? 'Not provisioned'}
                >
                  {network.address ?? 'Not provisioned'}
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Runtime signing networks:{' '}
          <span className="font-medium text-[var(--text-primary)]">
            {transactionNetworks.length > 0 ? transactionNetworks.join(', ') : 'none'}
          </span>
        </p>
      </WalletSurface>

      <WalletSurface className="p-5">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-[var(--color-destructive)]">
          <Lock size={13} /> Danger zone
        </div>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          Raw private keys are rarely needed. Export only for recovery or migration, and keep the key out of agent logs,
          prompts, and third-party tools.
        </p>
        <div className="mt-5 grid gap-2">
          {networks.map((network) => (
            <button
              key={network.id}
              type="button"
              onClick={() => onViewPrivateKey(network)}
              disabled={!network.address}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] px-3 py-2 text-left text-xs font-semibold text-[var(--color-destructive)] transition hover:border-[var(--color-destructive)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span>{network.label} private key</span>
              <Key size={13} />
            </button>
          ))}
        </div>
      </WalletSurface>
    </div>
  );
}

function ChainWalletPanel({
  network,
  activity,
  activityLoading,
  activityError,
  reputation,
  registeringSkale,
  registerMsg,
  onRegisterSkale,
  onCopy,
}: {
  network: AgentWalletNetworkBalance;
  activity: AgentWalletActivityResponse | null;
  activityLoading: boolean;
  activityError: string | null;
  reputation: ReputationState | null;
  registeringSkale: boolean;
  registerMsg: string | null;
  onRegisterSkale: () => void;
  onCopy: (value: string | null | undefined, label: string) => void;
}) {
  const isSkale = network.id === 'skale';
  const native = network.nativeBalance;
  const token = network.tokenBalances[0] ?? null;

  return (
    <div className="space-y-4">
      <WalletSurface className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
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
                : 'Available to the agent runtime for approved provider workflows and scoped signing.'}
            </p>
          </div>
          {network.explorerUrl && <LinkButton href={network.explorerUrl} label="Explorer" />}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.75fr_1.25fr_0.8fr]">
          <WalletQr address={network.address} label={network.label} />

          <div className="min-w-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
            <div className="mb-2 text-[10px] font-semibold text-[var(--text-muted)]">Address</div>
            <button
              type="button"
              onClick={() => onCopy(network.address, `${network.label} address`)}
              disabled={!network.address}
              className="block max-w-full break-all text-left font-mono text-sm text-[var(--text-primary)] hover:text-[var(--accent)] disabled:cursor-default disabled:hover:text-[var(--text-primary)]"
            >
              {network.address ?? 'Not provisioned'}
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onCopy(network.address, `${network.label} address`)}
                disabled={!network.address}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)] disabled:opacity-50"
              >
                <Copy size={10} /> Copy
              </button>
              {network.sharedWalletWith && (
                <span className="inline-flex items-center rounded-lg border border-[var(--border-default)] px-2 py-1 text-[10px] font-semibold text-[var(--text-muted)]">
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
      </WalletSurface>

      <WalletActivityPanel
        network={network}
        activity={activity}
        loading={activityLoading}
        error={activityError}
      />

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

function WalletActivityPanel({
  network,
  activity,
  loading,
  error,
}: {
  network: AgentWalletNetworkBalance;
  activity: AgentWalletActivityResponse | null;
  loading: boolean;
  error: string | null;
}) {
  const activityNetwork = getWalletActivityNetworkForId(activity, network.id);
  const transactions = getWalletActivityTransactionsForNetwork(activity, network.id);
  const networkError = activityNetwork?.error ?? null;

  return (
    <WalletSurface className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
            <History size={12} /> Transaction activity
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{network.label} recent activity</h3>
        </div>
        <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
          {transactions.length} tx
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 rounded-xl shimmer" />
          ))}
        </div>
      ) : error ? (
        <ActivityNotice tone="warn" message={error} />
      ) : !network.address ? (
        <ActivityNotice tone="muted" message={`${network.label} wallet activity appears after the wallet is provisioned.`} />
      ) : networkError ? (
        <div className="space-y-3">
          <ActivityNotice tone="muted" message={networkError} />
          {activity?.notes.map((note) => (
            <p key={note} className="text-xs leading-relaxed text-[var(--text-muted)]">{note}</p>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <ActivityNotice tone="muted" message="No recent transaction activity found for this wallet." />
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <WalletActivityRow key={tx.id} tx={tx} />
          ))}
        </div>
      )}
    </WalletSurface>
  );
}

function WalletActivityRow({ tx }: { tx: AgentWalletActivityTransaction }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
      <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${walletActivityDirectionClass(tx.direction)}`}>
        <WalletActivityDirectionIcon direction={tx.direction} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs font-semibold text-[var(--text-primary)]">{formatWalletActivityType(tx.type)}</span>
          <span className="font-mono text-xs text-[var(--accent)]">{formatWalletActivityAmount(tx.amount, tx.asset)}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          {tx.description || 'Wallet transaction'}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]">
          <span>{formatDate(tx.timestamp)}</span>
          {tx.from && <span>from {shortAddress(tx.from)}</span>}
          {tx.to && <span>to {shortAddress(tx.to)}</span>}
        </div>
      </div>
      {tx.explorerUrl && (
        <a
          href={tx.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] transition hover:border-[var(--border-hover)] hover:text-[var(--accent)]"
          aria-label="Open transaction"
        >
          <ExternalLink size={13} />
        </a>
      )}
    </div>
  );
}

function ActivityNotice({ tone, message }: { tone: 'muted' | 'warn'; message: string }) {
  return (
    <div className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
      tone === 'warn'
        ? 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
        : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)]'
    }`}>
      {tone === 'warn' ? <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> : <History size={14} className="mt-0.5 flex-shrink-0" />}
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}

function WalletActivityDirectionIcon({ direction }: { direction: AgentWalletActivityDirection }) {
  if (direction === 'in') return <ArrowDownLeft size={14} />;
  if (direction === 'out') return <ArrowUpRight size={14} />;
  if (direction === 'self') return <Repeat2 size={14} />;
  return <CircleDot size={14} />;
}

function walletActivityDirectionClass(direction: AgentWalletActivityDirection): string {
  if (direction === 'in') return 'border-[var(--status-live)]/40 bg-[color-mix(in_srgb,var(--status-live)_12%,transparent)] text-[var(--status-live)]';
  if (direction === 'out') return 'border-[var(--phosphor)]/35 bg-[var(--tech-accent-soft)] text-[var(--phosphor)]';
  if (direction === 'self') return 'border-[var(--accent)]/35 bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]';
  return 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)]';
}

function formatWalletActivityType(type: string): string {
  const normalized = type.replace(/_/g, ' ').trim().toLowerCase();
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Transaction';
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
        className="w-full max-w-xl border border-[var(--color-destructive-border)] bg-[var(--bg-elevated)] p-5 shadow-2xl shadow-black/60"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--color-destructive)]">
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
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center border border-[var(--border-subtle)] text-[var(--text-muted)] transition hover:border-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
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
            <div className="max-h-44 overflow-auto break-all border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-3 font-mono text-xs leading-relaxed text-[var(--color-destructive)]">
              {visible ? privateKey.privateKey : maskedKey}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] p-3 text-xs text-[var(--color-destructive)]">
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
                className="inline-flex items-center gap-2 border border-[var(--color-destructive-border)] px-3 py-1.5 text-xs uppercase tracking-wider text-[var(--color-destructive)] transition hover:bg-[var(--color-destructive-bg)] disabled:cursor-not-allowed disabled:opacity-50"
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
      {error && <div className="mt-2 text-[10px] text-[var(--color-warning)]">Balance lookup failed: {error}</div>}
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
          <div className={`mt-3 text-[10px] ${registerMsgIsError ? 'text-[var(--color-destructive)]' : 'text-[var(--phosphor)]'}`}>
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
