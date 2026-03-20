'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import { cn, timeAgo, getInitials, stringToColor } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { RobotMascot } from '@/components/ui/RobotMascot';
import {
  AlertTriangle,
  Calendar,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';

type SortOption = 'newest' | 'most_features' | 'name_az';
type StatusFilter = 'all' | 'active' | 'sleeping' | 'paused' | 'error' | 'restarting';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest',
  most_features: 'Most Features',
  name_az: 'A-Z',
};

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'All Status',
  active: 'Active',
  sleeping: 'Sleeping',
  paused: 'Paused',
  error: 'Error',
  restarting: 'Restarting',
};

const cardClass = 'card glass-noise';

import { AGENT_STATUS_CONFIG, type AgentStatus } from '@hatcher/shared';

const STATUS_CONFIG: Record<string, { label: string; color: string; pulse: boolean }> = AGENT_STATUS_CONFIG;

// ── Animation variants ───────────────────────────────────────
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

function AgentSkeleton() {
  return (
    <div className={cn(cardClass, 'p-5 animate-pulse')}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-full shimmer flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 shimmer rounded-lg w-3/4" />
          <div className="h-3 shimmer rounded-lg w-1/2" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 shimmer rounded-lg" />
        <div className="h-3 shimmer rounded-lg w-5/6" />
      </div>
      <div className="flex gap-2 mb-4">
        <div className="h-5 shimmer rounded-full w-16" />
        <div className="h-5 shimmer rounded-full w-20" />
      </div>
      <div className="flex justify-between pt-3 border-t border-[var(--border-default)]">
        <div className="h-3 shimmer rounded-lg w-16" />
        <div className="h-3 shimmer rounded-lg w-12" />
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('newest');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchAgents = useCallback(() => {
    setLoading(true);
    setError(null);
    api.exploreAgents().then((res) => {
      setLoading(false);
      if (res.success && res.data) {
        setAgents(res.data.agents ?? []);
      } else {
        setError('error' in res ? res.error : 'Failed to load agents');
      }
    }).catch(() => {
      setLoading(false);
      setError('Network error — is the API running?');
    });
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const filtered = useMemo(() => {
    let result = [...agents];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.description ?? '').toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === 'most_features') return (b.features?.length ?? 0) - (a.features?.length ?? 0);
      if (sort === 'name_az') return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [agents, sort, search, statusFilter]);

  const activeCount = agents.filter((a) => a.status === 'active').length;

  return (
    <div className="min-h-screen">
      {/* ── Hero Banner ──────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.12),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_70%_20%,rgba(6,182,212,0.06),transparent)]" />
        <motion.div
          className="mx-auto max-w-7xl px-4 pt-16 pb-12 relative"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-2">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] text-xs font-medium mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Community Agents
            </motion.div>
            <div className="flex items-center justify-center gap-4 mb-3">
              <RobotMascot size="md" mood="happy" />
              <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--text-primary)]">
                Discover AI Agents
              </h1>
            </div>
            <p className="text-[var(--text-muted)] text-lg max-w-xl mx-auto">
              {loading
                ? 'Loading agents...'
                : `${agents.length} agent${agents.length !== 1 ? 's' : ''} on Hatcher${activeCount > 0 ? ` — ${activeCount} live` : ''}`}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12">
        {/* ── Search + Filter Bar ────────────────────────── */}
        {!loading && !error && agents.length > 0 && (
          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {/* Search */}
            <div className="relative w-full sm:w-80 group/search">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none group-focus-within/search:text-[var(--accent-400)] transition-colors duration-200" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.4)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[#f97316]/50 focus:shadow-[0_0_16px_rgba(249,115,22,0.12)] transition-all duration-200 backdrop-blur-xl"
                placeholder="Search agents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Status filter */}
            <div className="flex gap-1 bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.4)] backdrop-blur-xl rounded-xl p-1">
              {(Object.entries(STATUS_FILTER_LABELS) as [StatusFilter, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setStatusFilter(val)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg transition-all duration-200 font-medium',
                    statusFilter === val
                      ? 'bg-[var(--accent-600)] text-white shadow-[0_0_12px_rgba(249,115,22,0.25)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[rgba(249,115,22,0.05)]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex gap-1 bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.4)] backdrop-blur-xl rounded-xl p-1">
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSort(val)}
                  className={cn(
                    'px-4 py-1.5 text-sm rounded-lg transition-all duration-200 font-medium',
                    sort === val
                      ? 'bg-[var(--accent-600)] text-white shadow-[0_0_12px_rgba(249,115,22,0.25)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[rgba(249,115,22,0.05)]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <AgentSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className={cn(cardClass, 'p-8 text-center')}>
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 text-sm">{error}</p>
            <p className="text-[#71717a] text-xs mt-2">Check your connection and try again</p>
            <button
              onClick={fetchAgents}
              className="btn-secondary inline-flex items-center gap-2 mt-4"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        ) : agents.length === 0 ? (
          <motion.div
            className={cn(cardClass, 'p-16 text-center')}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <RobotMascot size="lg" mood="confused" className="mx-auto mb-6" />
            <h3 className="text-xl font-medium text-[#FFFFFF] mb-2">No agents yet</h3>
            <p className="text-[#71717a] mb-6">Be the first to hatch an agent!</p>
            <Link
              href="/create"
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              Create Agent
            </Link>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            className={cn(cardClass, 'p-16 text-center')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Search className="w-10 h-10 text-[#71717a] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#FFFFFF] mb-2">No agents found</h3>
            <p className="text-[#71717a] text-sm mb-4">Try a different search or filter.</p>
            <button
              className="text-[#f97316] hover:text-[#f97316] text-sm font-medium transition-colors"
              onClick={() => { setSearch(''); setStatusFilter('all'); }}
            >
              Clear filters
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={pageVariants}
            initial="hidden"
            animate="visible"
          >
            {filtered.map((agent) => (
              <ExploreAgentCard key={agent.id} agent={agent} />
            ))}
          </motion.div>
        )}

        {/* Results count when filtering */}
        {!loading && !error && agents.length > 0 && filtered.length > 0 && search && (
          <p className="text-center text-sm text-[#71717a] mt-8">
            Showing {filtered.length} of {agents.length} agents
          </p>
        )}
      </div>
    </div>
  );
}

// ── Explore Agent Card ──────────────────────────────────────

function ExploreAgentCard({ agent }: { agent: Agent }) {
  const gradient = stringToColor(agent.id);
  const initials = getInitials(agent.name);
  const status = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG['paused']!

  return (
    <motion.div variants={cardVariants}>
      <Link href={`/agent/${agent.id}`} className="block group">
        <div className="relative">
          {/* Gradient border glow on hover */}
          <div className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.3), rgba(6,182,212,0.15))', borderRadius: '16px' }} />
          <motion.div
            className={cn(cardClass, 'p-5 h-full flex flex-col relative')}
            whileHover={{
              y: -4,
              boxShadow: '0 12px 40px rgba(249, 115, 22, 0.12)',
            }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-4 right-4 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.4), transparent)' }} />

            {/* Header: avatar + name + status */}
            <div className="flex items-start gap-3 mb-3">
              {/* Avatar circle */}
              {agent.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={agent.avatarUrl}
                  alt={agent.name}
                  className="w-12 h-12 rounded-full border border-[rgba(46,43,74,0.3)] object-cover flex-shrink-0 group-hover:border-[rgba(249,115,22,0.3)] transition-colors duration-300"
                />
              ) : (
                <div
                  className={`w-12 h-12 rounded-full border border-[rgba(46,43,74,0.3)] bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 group-hover:border-[rgba(249,115,22,0.3)] group-hover:shadow-[0_0_16px_rgba(249,115,22,0.15)] transition-all duration-300`}
                >
                  {initials}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#FFFFFF] truncate group-hover:text-[#f97316] transition-colors duration-200">
                  {agent.name}
                </h3>

                {/* Status badge */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1.5">
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      status.color,
                      status.pulse && 'animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.5)]'
                    )} />
                    <span className="text-xs text-[#71717a]">{status.label}</span>
                  </span>

                  <span className="fw-tag">OpenClaw</span>
                </div>
              </div>
            </div>

            {/* Description (2 lines) */}
            <p className="text-sm text-[#A5A1C2] leading-relaxed mb-4 flex-1 line-clamp-2">
              {agent.description ?? 'No description'}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-[#71717a] pt-3 border-t border-[rgba(46,43,74,0.3)] group-hover:border-[rgba(249,115,22,0.15)] transition-colors duration-300">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {agent.features?.length ?? 0} features
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {timeAgo(agent.createdAt)}
              </span>
            </div>
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
}
