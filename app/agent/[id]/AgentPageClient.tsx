'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useWallet } from '@solana/wallet-adapter-react';
import { shortenAddress, timeAgo } from '@/lib/utils';
import { generateAgentAvatar } from '@/lib/avatar-generator';
import { FRAMEWORKS } from '@hatcher/shared';
import type { AgentFramework } from '@hatcher/shared';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  Brain,
  Check,
  MessageSquare,
  Settings,
  Share2,
  Layers,
  Calendar,
  Cpu,
  Activity,
  Clock,
  BarChart3,
  Rocket,
  Sparkles,
} from 'lucide-react';

const FRAMEWORK_AVATAR: Record<string, { gradient: string; icon: React.ComponentType<{ className?: string }> }> = {
  openclaw: { gradient: 'from-amber-600 to-amber-400', icon: Cpu },
  hermes:   { gradient: 'from-purple-600 to-purple-400', icon: Brain },
  elizaos:  { gradient: 'from-cyan-600 to-cyan-400', icon: Bot },
  milady:   { gradient: 'from-rose-600 to-rose-400', icon: Sparkles },
};


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

export function AgentPageClient() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [publicStats, setPublicStats] = useState<{
    messagesProcessed: number;
    daysActive: number;
    uptimePercent: number;
    template: string | null;
    createdAt: string;
    lastActiveAt: string;
  } | null>(null);
  const { isAuthenticated: authed, user: authUser } = useAuth();
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

    // Fetch public stats (no auth needed)
    api.getAgentPublicStats(id).then((res) => {
      if (res.success) setPublicStats(res.data);
    }).catch(() => {/* ignore */});
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
          <div className="w-16 h-16 rounded-2xl bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center mx-auto mb-6">
            <Bot size={32} className="text-[#06b6d4]" />
          </div>
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

  const fwAvatar = FRAMEWORK_AVATAR[agent.framework] ?? { gradient: 'from-slate-600 to-slate-400', icon: Bot };
  const FwIcon = fwAvatar.icon;
  const ownerUsername = agent.ownerUsername ?? agent.owner?.username;
  const ownerAddress = agent.ownerAddress ?? agent.owner?.walletAddress ?? '';
  const ownerDisplay = ownerUsername ?? (ownerAddress ? shortenAddress(ownerAddress) : 'Unknown');
  const frameworkMeta = FRAMEWORKS[agent.framework as AgentFramework];
  const isOwner = !!(authed && authUser && agent.ownerId === authUser.id);
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
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[#06b6d4] transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </Link>
      </motion.div>

      {/* Agent Profile Card */}
      <motion.div className={`${cardClass} p-8 mb-6`} variants={itemVariants}>
        {/* Avatar + Name */}
        <div className="flex items-start gap-5 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={agent.avatarUrl || generateAgentAvatar(agent.name, agent.framework)}
            alt={agent.name}
            className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 border border-[var(--border-default)]"
          />

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
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/20">
                  <Layers className="w-3 h-3" />
                  {featureCount} feature{featureCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="text-xs text-[var(--text-muted)]">
              by <span className="font-medium text-[var(--text-secondary)]">{ownerDisplay}</span>
            </div>
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
            className="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[#06b6d4] transition-colors duration-200 border border-[var(--border-default)] rounded-lg px-3 py-1.5 hover:border-[#06b6d4]/30 hover:bg-[#06b6d4]/5"
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

      {/* Owner: manage buttons / Non-owner: stats only */}
      {isOwner ? (
        <motion.div className={`${cardClass} p-6`} variants={itemVariants}>
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
              Manage {agent.name}
            </h2>
            <p className="text-sm mb-5 text-[var(--text-muted)]">
              You own this agent. Head to your dashboard to chat or configure it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/dashboard/agent/${id}?tab=config`} className="btn-primary inline-flex items-center gap-2 justify-center">
                <Settings className="w-4 h-4" />
                Manage Agent
              </Link>
              <Link href={`/dashboard/agent/${id}?tab=chat`} className="btn-secondary inline-flex items-center gap-2 justify-center">
                <MessageSquare className="w-4 h-4" />
                Open Chat
              </Link>
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Analytics Section */}
          <motion.div className={`${cardClass} p-6 mb-6`} variants={itemVariants}>
            <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#06b6d4]" />
              Agent Analytics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Messages Processed — big stat */}
              <div className="rounded-xl bg-[var(--bg-elevated)] p-5 text-center col-span-2 sm:col-span-1">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Messages
                </div>
                <div className="text-3xl font-bold text-[#06b6d4]">
                  {publicStats ? publicStats.messagesProcessed.toLocaleString() : ((agent as any).messageCount ?? 0).toLocaleString()}
                </div>
              </div>

              {/* Days Active */}
              <div className="rounded-xl bg-[var(--bg-elevated)] p-5 text-center">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  Days Active
                </div>
                <div className="text-3xl font-bold text-[var(--text-primary)]">
                  {publicStats?.daysActive ?? Math.max(1, Math.floor((Date.now() - new Date(agent.createdAt).getTime()) / (1000 * 60 * 60 * 24)))}
                </div>
              </div>

              {/* Uptime */}
              <div className="rounded-xl bg-[var(--bg-elevated)] p-5 text-center">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                  <Activity className="w-3 h-3" />
                  Uptime
                </div>
                <div className="text-3xl font-bold text-emerald-400">
                  {publicStats ? `${publicStats.uptimePercent}%` : '--'}
                </div>
              </div>

              {/* Status */}
              <div className="rounded-xl bg-[var(--bg-elevated)] p-4 text-center">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Status</div>
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${statusStyle.text}`}>
                  <span className={`w-2 h-2 rounded-full ${statusStyle.dot} ${statusStyle.pulse ? 'animate-pulse' : ''}`} />
                  {statusStyle.label}
                </span>
              </div>

              {/* Framework */}
              <div className="rounded-xl bg-[var(--bg-elevated)] p-4 text-center">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Framework</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{frameworkMeta?.name ?? agent.framework}</div>
              </div>

              {/* Created */}
              <div className="rounded-xl bg-[var(--bg-elevated)] p-4 text-center">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Created</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{timeAgo(agent.createdAt)}</div>
              </div>
            </div>
          </motion.div>

          {/* Deploy CTA */}
          <motion.div className={`${cardClass} p-6`} variants={itemVariants}>
            <div className="text-center">
              <Rocket className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h2 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
                Deploy a similar agent
              </h2>
              <p className="text-sm mb-5 text-[var(--text-muted)]">
                Create your own {frameworkMeta?.name ?? agent.framework} agent on Hatcher. Free to start, deploy in 60 seconds.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href={`/create${publicStats?.template ? `?template=${publicStats.template}&framework=${agent.framework}` : `?framework=${agent.framework}`}`}
                  className="btn-primary inline-flex items-center gap-2 justify-center"
                >
                  <Rocket className="w-4 h-4" />
                  Deploy Similar Agent
                </Link>
                <Link href="/explore" className="btn-secondary inline-flex items-center gap-2 justify-center">
                  Browse More Agents
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
