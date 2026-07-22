'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Landmark,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { api, type RobinhoodHub } from '@/lib/api';
import { GlassCard, Skeleton, tabContentVariants, useAgentContext } from '../AgentContext';

type Section = 'overview' | 'wallet' | 'tokenize' | 'trading' | 'activity';

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'wallet', label: 'Chain wallet' },
  { id: 'tokenize', label: 'Tokenize' },
  { id: 'trading', label: 'Trading' },
  { id: 'activity', label: 'Activity' },
];

function shortAddress(value: string | null): string {
  return value ? `${value.slice(0, 7)}…${value.slice(-5)}` : 'Not provisioned';
}

function formatBalance(value: string | null): string {
  if (value === null) return 'Unavailable';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return parsed.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function statusTone(status: string): string {
  if (status === 'ready' || status === 'wallet-ready' || status === 'launched') {
    return 'border-[var(--status-live-border)] bg-[var(--status-live-bg)] text-[var(--status-live)]';
  }
  if (status === 'authorization_required' || status === 'prepared') {
    return 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]';
  }
  return 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)]';
}

function StatusPill({ label, status }: { label: string; status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(status)}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}

export function RobinhoodTab() {
  const { agent } = useAgentContext();
  const searchParams = useSearchParams();
  const confirmationStarted = useRef(false);
  const [section, setSection] = useState<Section>('overview');
  const [hub, setHub] = useState<RobinhoodHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'refresh' | 'tokenize' | 'trading' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tokenName, setTokenName] = useState(`${agent.name} Agent`);
  const [tokenSymbol, setTokenSymbol] = useState(() =>
    agent.name.replace(/[^a-z0-9]/giu, '').slice(0, 10).toUpperCase() || 'AGENT',
  );
  const [tokenDescription, setTokenDescription] = useState(
    agent.description || `Tokenized Hatcher agent ${agent.name}.`,
  );

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const response = await api.getRobinhoodHub(agent.id);
      if (!response.success) throw new Error(response.error || 'Failed to load Robinhood hub');
      setHub(response.data);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
      setBusy(null);
    }
  }, [agent.id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const projectId = searchParams.get('equifoldProjectId');
    const tokenAddress = searchParams.get('tokenAddress');
    const transactionHash = searchParams.get('txHash');
    if (!projectId || !tokenAddress || !transactionHash || confirmationStarted.current) return;
    confirmationStarted.current = true;
    setSection('tokenize');
    setBusy('tokenize');
    void api.confirmEquifoldTokenization(agent.id, { projectId, tokenAddress, transactionHash })
      .then((response) => {
        if (!response.success) throw new Error(response.error || 'Could not verify the Equifold launch');
        setNotice(`${projectId} is now linked to this agent.`);
        return load(false);
      })
      .catch((confirmError) => setError((confirmError as Error).message))
      .finally(() => setBusy(null));
  }, [agent.id, load, searchParams]);

  const returnPath = useMemo(() => {
    if (typeof window === 'undefined') return `/dashboard/agent/${agent.id}?tab=robinhood`;
    return `${window.location.pathname}?tab=robinhood`;
  }, [agent.id]);

  const copyWallet = async () => {
    if (!hub?.chain.walletAddress) return;
    await navigator.clipboard.writeText(hub.chain.walletAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  const prepareTokenization = async () => {
    setBusy('tokenize');
    setError(null);
    setNotice(null);
    try {
      const response = await api.prepareEquifoldTokenization(agent.id, {
        name: tokenName,
        symbol: tokenSymbol,
        description: tokenDescription,
        returnPath,
      });
      if (!response.success) throw new Error(response.error || 'Could not prepare the Equifold launch');
      window.location.assign(response.data.launchUrl);
    } catch (prepareError) {
      setError((prepareError as Error).message);
      setBusy(null);
    }
  };

  const connectTrading = async () => {
    setBusy('trading');
    setError(null);
    try {
      const response = await api.connectRobinhoodTrading(agent.id, returnPath);
      if (!response.success) throw new Error(response.error || 'Could not start Robinhood authentication');
      window.location.assign(response.data.authorizationUrl);
    } catch (connectError) {
      setError((connectError as Error).message);
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>;
  }

  return (
    <motion.div
      key="robinhood"
      variants={tabContentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-5"
    >
      <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="relative px-5 py-5 sm:px-6">
          <div className="absolute inset-y-0 right-0 w-72 bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.08),transparent_68%)]" aria-hidden />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--status-live-border)] bg-[var(--status-live-bg)] text-[var(--status-live)]">
                <Landmark size={19} aria-hidden />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Robinhood</h2>
                <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
                  Robinhood Chain wallet, Equifold agent tokenization and an optional Agentic Trading connection.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setBusy('refresh'); void load(false); }}
              disabled={busy === 'refresh'}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <RefreshCw size={13} className={busy === 'refresh' ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
          <div className="relative mt-4 flex flex-wrap gap-2">
            <StatusPill label={`Chain ${hub?.chain.status === 'wallet-ready' ? 'connected' : hub?.chain.status ?? 'unavailable'}`} status={hub?.chain.status ?? 'planned'} />
            <StatusPill label={`Trading ${hub?.trading.status === 'ready' ? 'connected' : 'not connected'}`} status={hub?.trading.status ?? 'disconnected'} />
            <StatusPill label={`Token ${hub?.tokenization.status === 'launched' ? 'live' : 'not launched'}`} status={hub?.tokenization.status ?? 'not_started'} />
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto border-t border-[var(--border-default)] px-3 py-2">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${section === item.id ? 'bg-[var(--control-active)] text-[var(--control-active-text)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="rounded-xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] px-4 py-3 text-sm text-[var(--color-destructive)]">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-[var(--status-live-border)] bg-[var(--status-live-bg)] px-4 py-3 text-sm text-[var(--status-live)]">{notice}</div> : null}

      {section === 'overview' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <MetricCard label="Chain wallet" value={shortAddress(hub?.chain.walletAddress ?? null)} detail={`Robinhood Chain · ${hub?.chain.caip2 ?? 'eip155:4663'}`} />
          <MetricCard label="Agent token" value={hub?.tokenization.projectId ?? 'Not launched'} detail={hub?.tokenization.status === 'launched' ? 'Verified through Equifold indexer' : 'Prepare a launch in the Tokenize section'} />
          <MetricCard label="Trading MCP" value={hub?.trading.status === 'ready' ? 'Connected' : 'Disconnected'} detail={hub?.trading.status === 'ready' ? `${hub.trading.toolCount} tools discovered` : 'Dedicated Robinhood Agentic account'} />
          <GlassCard className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <Wallet size={17} className="text-[var(--accent)]" />
              <div><h3 className="text-sm font-semibold text-[var(--text-primary)]">Chain balances</h3><p className="text-xs text-[var(--text-muted)]">Read from Robinhood Chain</p></div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MetricCard label="ETH" value={formatBalance(hub?.chain.balances.eth ?? null)} detail="Native gas" />
              <MetricCard label="WETH" value={formatBalance(hub?.chain.balances.weth ?? null)} detail="Wrapped ETH" />
              <MetricCard label="USDG" value={formatBalance(hub?.chain.balances.usdg ?? null)} detail="Canonical stable asset" />
            </div>
          </GlassCard>
          <GlassCard>
            <ShieldCheck size={18} className="text-[var(--status-live)]" />
            <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Separate trust boundaries</h3>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Chain funds and brokerage permissions remain separate. Trading actions use Hatcher approvals and can be revoked independently.</p>
          </GlassCard>
        </div>
      ) : null}

      {section === 'wallet' ? (
        <GlassCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Robinhood Chain wallet</p><p className="mt-2 break-all font-mono text-sm text-[var(--text-primary)]">{hub?.chain.walletAddress ?? 'Wallet not provisioned'}</p></div>
            <div className="flex gap-2">
              <button type="button" onClick={copyWallet} disabled={!hub?.chain.walletAddress} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-50">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button>
              {hub?.chain.walletAddress ? <a href={`${hub.chain.explorerUrl}/address/${hub.chain.walletAddress}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 text-xs font-semibold text-[var(--text-secondary)]">Explorer <ExternalLink size={13} /></a> : null}
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MetricCard label="ETH" value={formatBalance(hub?.chain.balances.eth ?? null)} detail="Gas and native transfers" />
            <MetricCard label="WETH" value={formatBalance(hub?.chain.balances.weth ?? null)} detail={shortAddress(hub?.chain.assets.weth ?? null)} />
            <MetricCard label="USDG" value={formatBalance(hub?.chain.balances.usdg ?? null)} detail={shortAddress(hub?.chain.assets.usdg ?? null)} />
          </div>
        </GlassCard>
      ) : null}

      {section === 'tokenize' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <GlassCard>
            <div className="flex items-center gap-3"><CircleDollarSign size={18} className="text-[var(--accent)]" /><div><h3 className="text-sm font-semibold text-[var(--text-primary)]">Tokenize this agent with Equifold</h3><p className="text-xs text-[var(--text-muted)]">Prepare here, then sign the launch from your wallet on Equifold.</p></div></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Token name<input value={tokenName} maxLength={128} onChange={(event) => setTokenName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" /></label>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Symbol<input value={tokenSymbol} maxLength={32} onChange={(event) => setTokenSymbol(event.target.value.toUpperCase())} className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2.5 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" /></label>
              <label className="text-xs font-medium text-[var(--text-secondary)] sm:col-span-2">Description<textarea value={tokenDescription} maxLength={2000} rows={4} onChange={(event) => setTokenDescription(event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" /></label>
            </div>
            <button type="button" onClick={prepareTokenization} disabled={busy === 'tokenize' || !tokenName.trim() || !tokenSymbol.trim()} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-50">{busy === 'tokenize' ? <Loader2 size={15} className="animate-spin" /> : <ArrowUpRight size={15} />} Continue to Equifold</button>
          </GlassCard>
          <GlassCard>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Current binding</p>
            <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{hub?.tokenization.projectId ?? 'Not tokenized'}</p>
            <p className="mt-2 break-all font-mono text-[11px] text-[var(--text-muted)]">{hub?.tokenization.tokenAddress ?? 'The verified token address will appear after launch.'}</p>
            {hub?.tokenization.launchUrl && hub.tokenization.status === 'launched' ? <a href={hub.tokenization.launchUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">Open on Equifold <ExternalLink size={13} /></a> : null}
          </GlassCard>
        </div>
      ) : null}

      {section === 'trading' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <GlassCard>
            <div className="flex items-center gap-3"><Landmark size={18} className="text-[var(--accent)]" /><div><h3 className="text-sm font-semibold text-[var(--text-primary)]">Robinhood Agentic Trading</h3><p className="text-xs text-[var(--text-muted)]">Connect a dedicated Agentic account through Robinhood&apos;s official MCP.</p></div></div>
            <div className="mt-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-[var(--text-primary)]">Connection status</p><p className="mt-1 text-xs text-[var(--text-muted)]">{hub?.trading.status === 'ready' ? `${hub.trading.toolCount} tools available` : 'Authentication is completed on Robinhood desktop.'}</p></div><StatusPill label={hub?.trading.status === 'ready' ? 'Connected' : 'Disconnected'} status={hub?.trading.status ?? 'disconnected'} /></div>
            </div>
            {hub?.trading.status !== 'ready' ? <button type="button" onClick={connectTrading} disabled={busy === 'trading'} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-50">{busy === 'trading' ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />} Connect Robinhood</button> : null}
          </GlassCard>
          <GlassCard>
            <ShieldCheck size={18} className="text-[var(--color-warning)]" />
            <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Approval-first controls</h3>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-[var(--text-secondary)]"><li>• Brokerage and onchain funds remain separate.</li><li>• Effectful MCP tools require owner approval.</li><li>• Options should remain disabled until explicitly enabled.</li><li>• You remain responsible for account activity.</li></ul>
          </GlassCard>
        </div>
      ) : null}

      {section === 'activity' ? (
        <GlassCard>
          <div className="flex items-center gap-3"><Activity size={18} className="text-[var(--accent)]" /><div><h3 className="text-sm font-semibold text-[var(--text-primary)]">Robinhood activity</h3><p className="text-xs text-[var(--text-muted)]">Connection and tokenization events for this agent.</p></div></div>
          <div className="mt-5 divide-y divide-[var(--border-default)] rounded-xl border border-[var(--border-default)]">
            <div className="flex items-center justify-between gap-3 p-4"><div><p className="text-sm font-medium text-[var(--text-primary)]">Robinhood Chain wallet</p><p className="mt-1 text-xs text-[var(--text-muted)]">{shortAddress(hub?.chain.walletAddress ?? null)}</p></div><StatusPill label={hub?.chain.status ?? 'planned'} status={hub?.chain.status ?? 'planned'} /></div>
            <div className="flex items-center justify-between gap-3 p-4"><div><p className="text-sm font-medium text-[var(--text-primary)]">Equifold tokenization</p><p className="mt-1 text-xs text-[var(--text-muted)]">{hub?.tokenization.projectId ?? 'No project linked'}</p></div><StatusPill label={hub?.tokenization.status ?? 'not started'} status={hub?.tokenization.status ?? 'not_started'} /></div>
            <div className="flex items-center justify-between gap-3 p-4"><div><p className="text-sm font-medium text-[var(--text-primary)]">Robinhood Trading MCP</p><p className="mt-1 text-xs text-[var(--text-muted)]">{hub?.trading.lastCheckedAt ? `Last checked ${new Date(hub.trading.lastCheckedAt).toLocaleString()}` : 'Never connected'}</p></div><StatusPill label={hub?.trading.status ?? 'disconnected'} status={hub?.trading.status ?? 'disconnected'} /></div>
          </div>
        </GlassCard>
      ) : null}
    </motion.div>
  );
}
