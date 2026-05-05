'use client';

import Image from 'next/image';
import {
  Copy,
  CreditCard,
  ExternalLink,
  Fingerprint,
  Link2,
  MessageSquare,
  Network,
  Server,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { PanelShell } from './PanelShell';
import type {
  AgentPassport,
  AgentPassportNetwork,
  AgentPassportNetworkId,
  AgentPassportPaymentRail,
  AgentPassportStatus,
} from '@/lib/api';
import {
  networkById,
  networkStatusLabel,
  networkStatusTone,
  shortAddress,
} from '@/lib/agent-passport';
import { getAgentAvatarUrl } from '@/lib/avatar-generator';

interface Props {
  framework: string;
  passport: AgentPassport;
  canChat: boolean;
  onOpenChat: () => void;
  onClose: () => void;
}

const NETWORK_ORDER: AgentPassportNetworkId[] = ['skale', 'base', 'solana'];

function statusDotClass(status: AgentPassportStatus): string {
  switch (status) {
    case 'registered':
      return 'bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.65)]';
    case 'wallet-ready':
      return 'bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.55)]';
    case 'planned':
      return 'bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.45)]';
    case 'server-unconfigured':
      return 'bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.5)]';
    case 'unavailable':
      return 'bg-neutral-500';
  }
}

function networkIcon(id: AgentPassportNetworkId) {
  if (id === 'solana') return <Network size={16} />;
  if (id === 'base') return <Link2 size={16} />;
  return <ShieldCheck size={16} />;
}

export function AgentPassportPanel({
  framework,
  passport,
  canChat,
  onOpenChat,
  onClose,
}: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const avatarUrl = useMemo(
    () => getAgentAvatarUrl(
      passport.agent.name,
      passport.agent.framework || framework,
      passport.avatar.imageUrl,
    ),
    [framework, passport.agent.framework, passport.agent.name, passport.avatar.imageUrl],
  );
  const skale = networkById(passport, 'skale');

  const copy = (value: string | null | undefined, label: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(`${label} copied`);
      window.setTimeout(() => setCopied(null), 1500);
    }).catch(() => {
      setCopied('Copy failed');
      window.setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <PanelShell title="Agent Passport" framework={framework} onClose={onClose}>
      <div className="grid gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-white/15 bg-neutral-950">
            <Image
              src={avatarUrl}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-white">{passport.agent.name}</h3>
              {skale && (
                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${networkStatusTone(skale.status)}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(skale.status)}`} />
                  {networkStatusLabel(skale.status)}
                </span>
              )}
            </div>
            <div className="mt-1 truncate font-mono text-xs text-neutral-400">{passport.identity.handle}</div>
            {passport.agent.description && (
              <p className="mt-2 line-clamp-2 text-sm text-neutral-300">{passport.agent.description}</p>
            )}
          </div>
          {canChat && (
            <button
              type="button"
              onClick={onOpenChat}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
            >
              <MessageSquare size={15} />
              Chat
            </button>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {NETWORK_ORDER.map((id) => {
            const network = passport.identity.networks.find((item) => item.id === id);
            return network ? <NetworkCard key={network.id} network={network} onCopy={copy} /> : null;
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Section title="Wallets" icon={<Wallet size={15} />}>
            <div className="space-y-2">
              {passport.wallets.map((wallet) => (
                <button
                  key={wallet.id}
                  type="button"
                  onClick={() => copy(wallet.address, wallet.chainType.toUpperCase())}
                  disabled={!wallet.address}
                  className="flex w-full items-center justify-between gap-3 rounded-lg bg-neutral-950 px-3 py-2 text-left disabled:cursor-default"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-medium uppercase text-neutral-300">{wallet.chainType}</span>
                    <span className="block truncate font-mono text-[11px] text-neutral-500">
                      {shortAddress(wallet.address)}
                    </span>
                  </span>
                  {wallet.address && <Copy size={14} className="flex-shrink-0 text-neutral-500" />}
                </button>
              ))}
            </div>
          </Section>

          <Section title="x402 Payments" icon={<CreditCard size={15} />}>
            <div className="space-y-2">
              {passport.payments.map((rail) => (
                <PaymentRail key={rail.id} rail={rail} onCopy={copy} />
              ))}
            </div>
          </Section>
        </div>

        <Section title="MCP and Links" icon={<Server size={15} />}>
          <div className="grid gap-2 sm:grid-cols-2">
            <LinkButton href={passport.links.passport} label="Passport JSON" />
            <LinkButton href={passport.links.skaleMetadata} label="SKALE metadata" />
            <LinkButton href={passport.agent.profileUrl} label="Public profile" />
            <LinkButton href={passport.agent.roomUrl} label="3D room" />
          </div>
          <div className="mt-3 rounded-lg border border-violet-400/25 bg-violet-500/10 p-3 text-xs text-violet-100">
            <div className="flex items-center gap-2 font-medium">
              <Server size={14} />
              MCP manifest
              <span className={`ml-auto rounded-md border px-1.5 py-0.5 ${networkStatusTone(passport.mcp.status)}`}>
                {networkStatusLabel(passport.mcp.status)}
              </span>
            </div>
            <div className="mt-2 truncate font-mono text-[11px] text-violet-200/80">
              {passport.mcp.manifestUrl}
            </div>
          </div>
        </Section>

        {copied && (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {copied}
          </div>
        )}
      </div>
    </PanelShell>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-neutral-900/80 p-3">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}

function NetworkCard({
  network,
  onCopy,
}: {
  network: AgentPassportNetwork;
  onCopy: (value: string | null | undefined, label: string) => void;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-neutral-950 p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-white/10 text-white">
          {networkIcon(network.id)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{network.label}</div>
          <div className="truncate font-mono text-[10px] text-neutral-500">{network.caip2}</div>
        </div>
      </div>
      <div className={`mt-3 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${networkStatusTone(network.status)}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(network.status)}`} />
        {networkStatusLabel(network.status)}
      </div>
      <button
        type="button"
        onClick={() => onCopy(network.walletAddress, `${network.label} wallet`)}
        disabled={!network.walletAddress}
        className="mt-3 flex w-full items-center justify-between gap-2 rounded-md bg-neutral-900 px-2 py-1.5 text-left disabled:cursor-default"
      >
        <span className="truncate font-mono text-[11px] text-neutral-300">
          {shortAddress(network.walletAddress)}
        </span>
        {network.walletAddress && <Copy size={12} className="flex-shrink-0 text-neutral-500" />}
      </button>
      <div className="mt-2 flex items-center gap-1 truncate text-[11px] text-neutral-500">
        <Fingerprint size={12} />
        <span className="truncate">{network.agentId ? `agentId ${network.agentId}` : network.registry ?? 'registry pending'}</span>
      </div>
      {network.explorerUrl && (
        <a
          href={network.explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-sky-200 hover:text-white"
        >
          Explorer <ExternalLink size={11} />
        </a>
      )}
    </div>
  );
}

function PaymentRail({
  rail,
  onCopy,
}: {
  rail: AgentPassportPaymentRail;
  onCopy: (value: string | null | undefined, label: string) => void;
}) {
  return (
    <div className="rounded-lg bg-neutral-950 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase text-neutral-300">{rail.network}</span>
        <span className={`ml-auto rounded-md border px-1.5 py-0.5 text-[10px] ${networkStatusTone(rail.status)}`}>
          {networkStatusLabel(rail.status)}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onCopy(rail.receivingAddress, `${rail.network} payTo`)}
        disabled={!rail.receivingAddress}
        className="mt-1 flex w-full items-center justify-between gap-2 disabled:cursor-default"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[11px] text-neutral-500">
            asset {rail.asset ? shortAddress(rail.asset) : rail.caip2}
          </span>
          <span className="block truncate font-mono text-[11px] text-neutral-400">
            payTo {shortAddress(rail.receivingAddress)}
          </span>
        </span>
        {rail.receivingAddress && <Copy size={12} className="flex-shrink-0 text-neutral-500" />}
      </button>
    </div>
  );
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-between gap-3 rounded-lg bg-neutral-950 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 hover:text-white"
    >
      <span className="truncate">{label}</span>
      <ExternalLink size={13} className="flex-shrink-0 text-neutral-500" />
    </a>
  );
}
