'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getInitials, stringToColor, timeAgo } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { RobotMascot } from '@/components/ui/RobotMascot';
import {
  Search,
  PlusCircle,
  Bot,
  Cpu,
  Zap,
  Layers,
  Calendar,
  Play,
  Square,
  RotateCcw,
  X,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ShortcutHelpModal } from '@/components/ui/ShortcutHelpModal';

import { AGENT_STATUSES, AGENT_STATUS_CONFIG } from '@hatcher/shared';

// ── Status filter options ────────────────────────────────────
const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  ...AGENT_STATUSES.filter(s => s !== 'killed').map(s => ({
    key: s,
    label: AGENT_STATUS_CONFIG[s].label,
  })),
];

type StatusFilter = 'all' | 'active' | 'sleeping' | 'paused' | 'error' | 'restarting';
type FrameworkFilter = 'all' | 'openclaw' | 'hermes' | 'elizaos' | 'milady';
type SortOption = 'newest' | 'az' | 'messages' | 'active';

const FRAMEWORK_FILTERS = [
  { key: 'all', label: 'All Frameworks' },
  { key: 'openclaw', label: 'OpenClaw' },
  { key: 'hermes', label: 'Hermes' },
  { key: 'elizaos', label: 'ElizaOS' },
  { key: 'milady', label: 'Milady' },
];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'az', label: 'A-Z' },
  { key: 'messages', label: 'Most Messages' },
  { key: 'active', label: 'Last Active' },
];

// ── Animation variants ───────────────────────────────────────
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ── Status badge component ───────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    active: 'badge-active',
    sleeping: 'badge-sleeping',
    paused: 'badge-paused',
    error: 'badge-error',
    killed: 'badge-error',
    restarting: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center',
    stopping: 'bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center',
  };
  return (
    <span className={classes[status] ?? 'badge-paused'}>
      {(status === 'active' || status === 'restarting' || status === 'stopping') && (
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse inline-block ${status === 'stopping' ? 'bg-orange-400' : status === 'restarting' ? 'bg-amber-400' : 'bg-green-400'}`} />
      )}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Framework label ──────────────────────────────────────────
const FRAMEWORK_BADGE_STYLES: Record<string, string> = {
  openclaw: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  hermes: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
};

const FRAMEWORK_LABELS: Record<string, string> = {
  openclaw: 'OpenClaw',
  hermes: 'Hermes',
};

function FrameworkTag({ framework = 'openclaw' }: { framework?: string }) {
  const style = FRAMEWORK_BADGE_STYLES[framework] ?? 'bg-[var(--accent-glow)] text-[var(--accent-400)] border-[rgba(6,182,212,0.25)]';
  const label = FRAMEWORK_LABELS[framework] ?? framework;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style}`}>
      {label}
    </span>
  );
}

// ── Status glow class helper ────────────────────────────────
function getStatusGlowClass(status: string): string {
  switch (status) {
    case 'active': return 'agent-card-active';
    case 'paused': return 'agent-card-paused';
    case 'error': return 'agent-card-paused';
    default: return '';
  }
}

// ── Skeleton card for loading state ──────────────────────────
function SkeletonCard() {
  return (
    <div className="card glass-noise p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl shimmer flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-32 rounded shimmer" />
          <div className="h-3 w-full rounded shimmer" />
          <div className="h-3 w-2/3 rounded shimmer" />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <div className="h-5 w-16 rounded-full shimmer" />
        <div className="h-5 w-14 rounded-full shimmer" />
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[rgba(46,43,74,0.3)]">
        <div className="h-3 w-20 rounded shimmer" />
        <div className="h-3 w-16 rounded shimmer" />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// My Agents Page
// ═════════════════════════════════════════════════════════════
export default function MyAgentsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [frameworkFilter, setFrameworkFilter] = useState<FrameworkFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcuts({
    onHelp: () => setShowShortcuts((v) => !v),
    onSearch: () => searchInputRef.current?.focus(),
    onAgentSelect: (index) => {
      const sorted = filteredAgents;
      if (sorted[index]) router.push(`/dashboard/agent/${sorted[index].id}`);
    },
  });

  // ── Fetch agents ─────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    api.getMyAgents().then((res) => {
      setLoading(false);
      if (res.success) {
        setAgents(res.data);
      } else {
        setError(res.error);
      }
    });
  }, [isAuthenticated]);

  // ── Onboarding check ───────────────────────────────────
  useEffect(() => {
    if (
      !loading &&
      isAuthenticated &&
      agents.length === 0 &&
      !localStorage.getItem('onboarding_dismissed') &&
      !localStorage.getItem('onboarding_completed')
    ) {
      setShowOnboarding(true);
    }
  }, [loading, isAuthenticated, agents]);

  // ── Filtered + sorted agents ─────────────────────────────
  const filteredAgents = useMemo(() => {
    let result = agents;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter);
    }

    // Framework filter
    if (frameworkFilter !== 'all') {
      result = result.filter((a) => a.framework === frameworkFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.description ?? '').toLowerCase().includes(q) ||
          a.framework.toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortOption) {
        case 'az':
          return a.name.localeCompare(b.name);
        case 'messages':
          return (b.messageCount ?? 0) - (a.messageCount ?? 0);
        case 'active':
          return new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime();
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [agents, statusFilter, frameworkFilter, searchQuery, sortOption]);

  // ── Stats ──────────────────────────────────────────────────
  const activeCount = agents.filter((a) => a.status === 'active').length;

  // ── Unauthenticated states ───────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#06b6d4] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[#A5A1C2]">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 rounded-2xl bg-[#06b6d4]/15 flex items-center justify-center mx-auto mb-6">
            <Zap size={40} className="text-[#06b6d4]" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-[#FFFFFF]">Sign In Required</h1>
          <p className="mb-8 text-sm text-[#A5A1C2]">
            Sign in to your account to access your agents.
          </p>
          <a href="/login" className="btn-primary px-8 py-3 inline-block">
            Sign In
          </a>
        </div>
      </motion.div>
    );
  }

  // ── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-10">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="h-8 w-40 rounded shimmer mb-2" />
              <div className="h-4 w-64 rounded shimmer" />
            </div>
            <div className="h-10 w-36 rounded-xl shimmer" />
          </div>
          {/* Stat cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card glass-noise p-5">
                <div className="h-4 w-24 rounded shimmer mb-3" />
                <div className="h-8 w-16 rounded shimmer" />
              </div>
            ))}
          </div>
          {/* Cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Main content ─────────────────────────────────────────
  return (
    <motion.div
      className="min-h-screen p-4 sm:p-6 lg:p-10"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Header ──────────────────────────────────────── */}
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          variants={cardVariants}
        >
          <div>
            <h1 className="text-2xl font-bold text-[#FFFFFF]">My Agents</h1>
            <p className="text-sm mt-0.5 text-[#A5A1C2]">
              {agents.length === 0
                ? 'Create your first agent to get started'
                : `${agents.length} agent${agents.length !== 1 ? 's' : ''} total, ${activeCount} active`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/templates" className="btn-ghost text-sm">
              <Layers size={15} />
              Templates
            </Link>
            <Link href="/create" className="btn-primary text-sm">
              <PlusCircle size={16} />
              Create Agent
            </Link>
          </div>
        </motion.div>

        {/* ── Stat Cards ──────────────────────────────────── */}
        {agents.length > 0 && (
          <QuickStats agentCount={agents.length} activeCount={activeCount} />
        )}

        {/* ── Filter / Search / Sort bar ──────────────────── */}
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
          variants={cardVariants}
        >
          {/* Status filters */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.3)] overflow-x-auto flex-nowrap w-full sm:w-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key as StatusFilter)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                  statusFilter === f.key
                    ? 'bg-purple-500/15 text-white shadow-[0_0_8px_rgba(139,92,246,0.15)]'
                    : 'text-[#71717a] hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Framework filter */}
          <select
            value={frameworkFilter}
            onChange={(e) => setFrameworkFilter(e.target.value as FrameworkFilter)}
            className="px-3 py-2.5 rounded-xl text-xs font-medium bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.3)] text-[#A5A1C2] outline-none cursor-pointer appearance-none pr-7"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            {FRAMEWORK_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>

          {/* Search */}
          <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-initial bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.3)] backdrop-blur-xl rounded-xl">
            <Search size={16} className="text-[#71717a] ml-3" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search agents... ( / )"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none text-sm w-full sm:w-48 text-[#FFFFFF] placeholder:text-[#71717a] px-2 py-2.5"
            />
          </div>

          {/* Sort */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="px-3 py-2.5 rounded-xl text-xs font-medium bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.3)] text-[#A5A1C2] outline-none cursor-pointer appearance-none pr-7"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>

          {/* Clear filters */}
          {(statusFilter !== 'all' || frameworkFilter !== 'all' || searchQuery.trim()) && (
            <button
              onClick={() => { setStatusFilter('all'); setFrameworkFilter('all'); setSearchQuery(''); }}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <X size={12} />
              Clear
            </button>
          )}
        </motion.div>

        {/* ── Agent Grid ──────────────────────────────────── */}
        {filteredAgents.length === 0 ? (
          agents.length === 0 ? (
            /* True empty state — no agents created yet */
            <div className="card glass-noise">
              <EmptyState
                icon={Cpu}
                title="No agents yet"
                description="Create your first AI agent and deploy it in 60 seconds."
                actionLabel="Create Agent"
                actionHref="/create"
                secondaryLabel="Explore"
                secondaryHref="/explore"
              />
            </div>
          ) : (
            /* Filter/search returned no results */
            <motion.div
              className="card glass-noise flex flex-col items-center justify-center py-20 px-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <RobotMascot
                size="lg"
                mood="thinking"
                className="mb-6"
              />
              <h2 className="text-xl font-semibold text-[#FFFFFF] mb-2">
                No matching agents
              </h2>
              <p className="text-sm text-[#A5A1C2] max-w-sm mb-6">
                Try adjusting your search or filter criteria.
              </p>
            </motion.div>
          )
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={pageVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {filteredAgents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  variants={cardVariants}
                  className={`card glass-noise p-5 text-left transition-all duration-200 cursor-pointer group relative ${getStatusGlowClass(agent.status)}`}
                  onClick={() => router.push(`/dashboard/agent/${agent.id}`)}
                >
                  {/* Top: Avatar + Name + Status */}
                  <div className="flex items-start gap-3.5">
                    {/* Avatar */}
                    {agent.avatarUrl ? (
                      <img
                        src={agent.avatarUrl}
                        alt={agent.name}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0 ring-1 ring-white/10"
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${stringToColor(agent.name)} ring-1 ring-white/10`}
                      >
                        <span className="text-sm font-bold text-white">
                          {getInitials(agent.name)}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[#FFFFFF] font-semibold text-sm truncate group-hover:text-[#06b6d4] transition-colors">
                          {agent.name}
                        </h3>
                        <StatusBadge status={agent.status} />
                      </div>
                      {agent.description ? (
                        <p className="text-xs text-[#A5A1C2] mt-1 line-clamp-2 leading-relaxed">
                          {agent.description}
                        </p>
                      ) : (
                        <p className="text-xs text-[#71717a] mt-1 italic">No description</p>
                      )}
                    </div>
                  </div>

                  {/* Tags row */}
                  <div className="flex items-center gap-2 mt-3.5 flex-wrap">
                    <FrameworkTag framework={agent.framework} />
                    {agent.features && agent.features.length > 0 && (
                      <span className="badge-feature text-[10px]">
                        <Layers size={10} className="mr-1" />
                        {agent.features.length} feature{agent.features.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Footer: Created date + Quick actions */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[rgba(46,43,74,0.3)]">
                    <span className="flex items-center gap-1.5 text-xs text-[#71717a]">
                      <Calendar size={12} />
                      {timeAgo(agent.createdAt)}
                    </span>

                    {/* Quick action buttons -- visible on hover */}
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                      {agent.status === 'active' ? (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); api.restartAgent(agent.id).then((res) => { if (res.success) { setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, status: 'active' } : a)); setSuccessMsg(`${agent.name} restarted`); setTimeout(() => setSuccessMsg(null), 3000); } else setError(res.error ?? 'Restart failed'); }).catch(() => setError('Failed to restart agent')); }}
                            className="p-1.5 rounded-lg hover:bg-[#06b6d4]/10 transition-colors"
                            title="Restart"
                            aria-label={`Restart ${agent.name}`}
                          >
                            <RotateCcw size={13} className="text-[#06b6d4]" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); api.stopAgent(agent.id).then((res) => { if (res.success) { setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, status: 'paused' } : a)); setSuccessMsg(`${agent.name} stopped`); setTimeout(() => setSuccessMsg(null), 3000); } else setError(res.error ?? 'Stop failed'); }).catch(() => setError('Failed to stop agent')); }}
                            className="p-1.5 rounded-lg hover:bg-amber-500/10 transition-colors"
                            title="Stop"
                            aria-label={`Stop ${agent.name}`}
                          >
                            <Square size={13} className="text-amber-400" />
                          </button>
                        </>
                      ) : (agent.status === 'paused' || agent.status === 'sleeping' || agent.status === 'error') ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); api.startAgent(agent.id).then((res) => { if (res.success) { setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, status: 'active' } : a)); setSuccessMsg(`${agent.name} started`); setTimeout(() => setSuccessMsg(null), 3000); } else setError(res.error ?? 'Start failed'); }).catch(() => setError('Failed to start agent')); }}
                          className="p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
                          title="Start"
                          aria-label={`Start ${agent.name}`}
                        >
                          <Play size={13} className="text-emerald-400" />
                        </button>
                      ) : null}
                      <span className="text-xs text-[#06b6d4] ml-0.5">
                        Details
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Error display ───────────────────────────────── */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="card glass-noise p-4 border-l-4 border-red-500"
          >
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}

        {/* ── Success toast ─────────────────────────────── */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed bottom-6 right-6 z-50 card glass-noise px-5 py-3 border-l-4 border-green-500 shadow-lg"
            >
              <p className="text-sm text-green-400">{successMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Onboarding wizard for first-time users */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingWizard onClose={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>

      <ShortcutHelpModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </motion.div>
  );
}
