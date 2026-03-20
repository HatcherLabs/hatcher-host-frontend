'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useWallet } from '@solana/wallet-adapter-react';
import { getInitials, stringToColor, shortenAddress, timeAgo } from '@/lib/utils';
import { FRAMEWORKS } from '@hatcher/shared';
import type { AgentFramework } from '@hatcher/shared';
import { motion } from 'framer-motion';
import { RobotMascot } from '@/components/ui/RobotMascot';
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Settings,
  Share2,
  Layers,
  Calendar,
  Cpu,
} from 'lucide-react';

const DEFAULT_PROMPTS = ["Hello! Who are you?", "What can you help me with?", "Tell me about yourself"];

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot: string; pulse: boolean; label: string }> = {
  active:   { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20',  dot: 'bg-green-400',  pulse: true,  label: 'Active' },
  sleeping: { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20',   dot: 'bg-blue-400',   pulse: false, label: 'Sleeping' },
  paused:   { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20',  dot: 'bg-amber-400',  pulse: false, label: 'Paused' },
  error:    { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20',    dot: 'bg-red-400',    pulse: false, label: 'Error' },
  killed:      { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20',    dot: 'bg-red-400',    pulse: false, label: 'Killed' },
  restarting:  { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20',  dot: 'bg-amber-400',  pulse: true,  label: 'Restarting' },
};

const cardClass = 'card glass-noise';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function PublicAgentPage() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { isAuthenticated: authed } = useAuth();
  const wallet = useWallet();

  useEffect(() => {
    api.getAgent(id).then((res) => {
      setLoading(false);
      if (res.success) setAgent(res.data);
      else setError(res.error ?? 'Agent not found');
    }).catch(() => {
      setLoading(false);
      setError('Network error — is the API running?');
    });
  }, [id]);

  const handleShare = useCallback(() => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className={`${cardClass} p-8 animate-pulse`}>
          <div className="flex gap-5 mb-6">
            <div className="w-20 h-20 rounded-2xl shimmer flex-shrink-0" />
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-6 shimmer rounded-lg w-1/2" />
              <div className="h-4 shimmer rounded-lg w-1/3" />
              <div className="h-4 shimmer rounded-lg w-1/4" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 shimmer rounded-lg" />
            <div className="h-4 shimmer rounded-lg w-5/6" />
            <div className="h-4 shimmer rounded-lg w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    const isNetworkError = error?.toLowerCase().includes('network');
    const title = isNetworkError
      ? 'Connection Error'
      : error?.toLowerCase().includes('not found') || !error
        ? 'Agent Not Found'
        : 'Something Went Wrong';

    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <RobotMascot size="lg" mood="confused" className="mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">{title}</h1>
          <p className="mb-6 text-[var(--text-secondary)]">
            {error || "This agent doesn't exist or has been removed."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.history.back()}
              className="btn-secondary inline-flex items-center gap-2 justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <Link href="/explore" className="btn-secondary inline-flex items-center gap-2 justify-center">
              Browse Agents
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const gradient = stringToColor(agent.id);
  const initials = getInitials(agent.name);
  const ownerAddress = agent.ownerAddress ?? agent.owner?.walletAddress ?? '';
  const frameworkMeta = FRAMEWORKS[agent.framework as AgentFramework];
  const isOwner = !!(authed && wallet.publicKey && ownerAddress && wallet.publicKey.toBase58() === ownerAddress);
  const statusStyle = STATUS_STYLES[agent.status] ?? STATUS_STYLES['paused']!;
  const featureCount = agent.features?.length ?? 0;

  return (
    <motion.div
      className="mx-auto max-w-2xl px-4 py-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Back navigation */}
      <motion.div variants={itemVariants} className="mb-6">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[#f97316] transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </Link>
      </motion.div>

      {/* Agent Profile Card */}
      <motion.div className={`${cardClass} p-8 mb-6`} variants={itemVariants}>
        {/* Avatar + Name */}
        <div className="flex items-start gap-5 mb-6">
          {agent.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agent.avatarUrl}
              alt={agent.name}
              className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 border border-[var(--border-default)]"
            />
          ) : (
            <div
              className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 border border-white/10`}
            >
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{agent.name}</h1>
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} ${statusStyle.pulse ? 'animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.5)]' : ''}`} />
                {statusStyle.label}
              </span>
            </div>

            {/* Framework badge */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {frameworkMeta && (
                <span className="fw-tag">
                  {frameworkMeta.name}
                </span>
              )}
              {featureCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20">
                  <Layers className="w-3 h-3" />
                  {featureCount} feature{featureCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {ownerAddress && (
              <div className="text-xs font-mono text-[var(--text-muted)]">
                by {shortenAddress(ownerAddress)}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {agent.description && (
          <p className="leading-relaxed mb-6 text-[var(--text-secondary)]">{agent.description}</p>
        )}

        {/* Framework features */}
        {frameworkMeta && (
          <div className="mb-6">
            <div className="section-label mb-2">Framework Features</div>
            <div className="flex flex-wrap gap-2">
              {frameworkMeta.features.map((feat) => (
                <span key={feat} className="fw-tag">
                  {feat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between text-xs pt-4 border-t border-[var(--border-default)] text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" />
              {frameworkMeta?.name ?? agent.framework}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {timeAgo(agent.createdAt)}
            </span>
          </div>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[#f97316] transition-colors duration-200 border border-[var(--border-default)] rounded-lg px-3 py-1.5 hover:border-[#f97316]/30 hover:bg-[#f97316]/5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                Share
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Chat CTA */}
      <motion.div className={`${cardClass} p-6`} variants={itemVariants}>
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
            {isOwner ? `Manage ${agent.name}` : `Chat with ${agent.name}`}
          </h2>
          <p className="text-sm mb-5 text-[var(--text-muted)]">
            {isOwner
              ? 'You own this agent. Head to your dashboard to chat or configure it.'
              : `${agent.name} is live and ready to chat.`}
          </p>

          {isOwner ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/dashboard/agent/${id}`} className="btn-primary inline-flex items-center gap-2 justify-center">
                <Settings className="w-4 h-4" />
                Manage Agent
              </Link>
              <Link href={`/dashboard/agent/${id}?tab=chat`} className="btn-secondary inline-flex items-center gap-2 justify-center">
                <MessageSquare className="w-4 h-4" />
                Open Chat
              </Link>
            </div>
          ) : authed ? (
            <div className="space-y-4">
              {/* Suggested prompts */}
              <div className="flex flex-wrap gap-2 justify-center">
                {DEFAULT_PROMPTS.map((prompt) => (
                  <Link
                    key={prompt}
                    href={`/dashboard/agent/${id}?tab=chat`}
                    className="text-xs px-3 py-1.5 rounded-full border border-[#f97316]/15 bg-[#f97316]/5 hover:bg-[#f97316]/10 hover:border-[#f97316]/30 text-[var(--text-secondary)] hover:text-[#fed7aa] transition-all duration-200"
                  >
                    {prompt}
                  </Link>
                ))}
              </div>
              <Link
                href={`/dashboard/agent/${id}?tab=chat`}
                className="btn-primary inline-flex items-center gap-2 justify-center w-full"
              >
                <MessageSquare className="w-4 h-4" />
                Start Chatting
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass rounded-xl p-4 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-[#f97316]/50 flex items-center justify-center text-xs text-white font-bold">
                    {initials.slice(0, 1)}
                  </div>
                  <span className="text-xs font-medium text-[var(--text-muted)]">{agent.name}</span>
                  <span className="ml-auto text-[10px] text-[var(--text-muted)] px-2 py-0.5 rounded-full border border-[var(--border-default)]">
                    Powered by Hatcher
                  </span>
                </div>
                <p className="text-sm italic text-[var(--text-secondary)]">
                  Connect wallet to chat with {agent.name}.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {DEFAULT_PROMPTS.map((prompt) => (
                  <span
                    key={prompt}
                    className="text-xs px-3 py-1.5 rounded-full border border-[#f97316]/10 bg-[#f97316]/3 cursor-default text-[var(--text-muted)]"
                  >
                    {prompt}
                  </span>
                ))}
              </div>

              <Link href="/dashboard/agents" className="btn-primary inline-flex items-center gap-2 justify-center w-full">
                <ExternalLink className="w-4 h-4" />
                Connect Wallet to Chat
              </Link>
            </div>
          )}

          {!isOwner && !authed && (
            <p className="text-xs mt-3 text-[var(--text-muted)]">
              Sign in with your Solana wallet to continue
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
