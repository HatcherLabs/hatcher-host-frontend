'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { RobotMascot } from '@/components/ui/RobotMascot';
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Sparkles,
  X,
} from 'lucide-react';
import { FRAMEWORKS } from '@hatcher/shared';
import type { AgentFramework } from '@hatcher/shared';

type SortOption = 'newest' | 'most_messages' | 'name_az';
type StatusFilter = 'all' | 'active' | 'sleeping' | 'paused' | 'error';

const PAGE_SIZE = 12;

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest',
  most_messages: 'Most Active',
  name_az: 'A-Z',
};

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'All Status',
  active: 'Active',
  sleeping: 'Sleeping',
  paused: 'Paused',
  error: 'Error',
};

const STATUS_ICONS: Record<StatusFilter, string> = {
  all: '',
  active: 'bg-green-400',
  sleeping: 'bg-blue-400',
  paused: 'bg-amber-400',
  error: 'bg-red-400',
};

const cardClass = 'card glass-noise';

import { AGENT_STATUS_CONFIG, type AgentStatus } from '@hatcher/shared';

const STATUS_CONFIG: Record<string, { label: string; color: string; pulse: boolean }> = AGENT_STATUS_CONFIG;

// ── Framework visual config ──────────────────────────────────
const FRAMEWORK_COLORS: Record<string, { border: string; glow: string; badge: string; icon: string }> = {
  openclaw: {
    border: 'rgba(6,182,212,0.35)',
    glow: 'rgba(6,182,212,0.12)',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
    icon: '#06b6d4',
  },
  hermes: {
    border: 'rgba(168,85,247,0.35)',
    glow: 'rgba(168,85,247,0.12)',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
    icon: '#a855f7',
  },
  elizaos: {
    border: 'rgba(249,115,22,0.35)',
    glow: 'rgba(249,115,22,0.12)',
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
    icon: '#f97316',
  },
  milady: {
    border: 'rgba(236,72,153,0.35)',
    glow: 'rgba(236,72,153,0.12)',
    badge: 'bg-pink-500/10 text-pink-400 border-pink-500/25',
    icon: '#ec4899',
  },
};

// ── Framework SVG avatars ────────────────────────────────────
function FrameworkAvatar({ framework, size = 48 }: { framework: string; size?: number }) {
  const color = FRAMEWORK_COLORS[framework]?.icon ?? '#06b6d4';
  const s = size;

  if (framework === 'hermes') {
    return (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="50%" fill={color} fillOpacity="0.12" />
        {/* Hermes wing */}
        <ellipse cx="24" cy="28" rx="7" ry="10" stroke={color} strokeWidth="2" fill="none" />
        <path d="M17 22 Q10 14 16 10 Q18 16 24 18" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.3" strokeLinejoin="round" />
        <path d="M31 22 Q38 14 32 10 Q30 16 24 18" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.3" strokeLinejoin="round" />
        <circle cx="24" cy="28" r="3" fill={color} />
        <line x1="24" y1="31" x2="24" y2="38" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="21" y1="36" x2="24" y2="38" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="27" y1="36" x2="24" y2="38" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (framework === 'elizaos') {
    return (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="50%" fill={color} fillOpacity="0.12" />
        {/* Neural brain */}
        <path d="M16 26 Q12 22 14 17 Q16 11 22 12 Q23 9 26 9 Q32 9 33 14 Q37 14 37 19 Q38 24 34 27 Q33 32 28 33 Q26 37 24 37 Q22 37 20 33 Q15 32 16 26Z" stroke={color} strokeWidth="1.8" fill={color} fillOpacity="0.15" />
        <circle cx="20" cy="20" r="1.5" fill={color} />
        <circle cx="28" cy="18" r="1.5" fill={color} />
        <circle cx="24" cy="26" r="1.5" fill={color} />
        <circle cx="31" cy="25" r="1.5" fill={color} />
        <circle cx="18" cy="28" r="1.5" fill={color} />
        <line x1="20" y1="20" x2="28" y2="18" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
        <line x1="28" y1="18" x2="31" y2="25" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
        <line x1="20" y1="20" x2="24" y2="26" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
        <line x1="24" y1="26" x2="31" y2="25" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
        <line x1="24" y1="26" x2="18" y2="28" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
      </svg>
    );
  }

  if (framework === 'milady') {
    return (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="50%" fill={color} fillOpacity="0.12" />
        {/* Gem / diamond */}
        <polygon points="24,10 36,20 24,38 12,20" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.2" strokeLinejoin="round" />
        <polygon points="24,10 36,20 24,22 12,20" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.35" strokeLinejoin="round" />
        <line x1="24" y1="10" x2="24" y2="22" stroke={color} strokeWidth="1.5" strokeOpacity="0.7" />
        <line x1="12" y1="20" x2="36" y2="20" stroke={color} strokeWidth="1.5" strokeOpacity="0.5" />
      </svg>
    );
  }

  // openclaw (default) — robot claw
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="50%" fill={color} fillOpacity="0.12" />
      {/* Robot head */}
      <rect x="13" y="14" width="22" height="16" rx="4" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.15" />
      <circle cx="19" cy="22" r="3" fill={color} fillOpacity="0.8" />
      <circle cx="29" cy="22" r="3" fill={color} fillOpacity="0.8" />
      <rect x="21" y="26" width="6" height="2" rx="1" fill={color} />
      {/* Antenna */}
      <line x1="24" y1="14" x2="24" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="9" r="2" fill={color} />
      {/* Claw arms */}
      <line x1="13" y1="26" x2="8" y2="32" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="32" x2="6" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="32" x2="10" y2="37" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="35" y1="26" x2="40" y2="32" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="32" x2="38" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="32" x2="42" y2="37" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ── Debounce hook ────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

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
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  // Debounce search input by 300ms
  const search = useDebounce(searchInput, 300);
  const isSearching = searchInput !== search;

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

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sort]);

  const filtered = useMemo(() => {
    let result = [...agents];

    // Hide obvious test/debug agents that have no real description
    result = result.filter((a) => {
      const isTestName = /^(test|debug|demo)\s*(agent)?$/i.test(a.name.trim());
      const hasNoDesc = !a.description || a.description.trim() === '' || a.description === 'No description provided';
      return !(isTestName && hasNoDesc);
    });

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
      if (sort === 'most_messages') return ((b as Agent & { messageCount?: number }).messageCount ?? 0) - ((a as Agent & { messageCount?: number }).messageCount ?? 0);
      if (sort === 'name_az') return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [agents, sort, search, statusFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedAgents = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goToPage = useCallback((p: number) => {
    setPage(p);
    // Scroll grid into view smoothly
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const activeCount = agents.filter((a) => a.status === 'active').length;
  const hasActiveFilters = statusFilter !== 'all' || search.trim() !== '';

  const clearAllFilters = useCallback(() => {
    setSearchInput('');
    setStatusFilter('all');
    setSort('newest');
  }, []);

  return (
    <div className="min-h-screen">
      {/* ── Hero Banner ──────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.12),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_70%_20%,rgba(6,182,212,0.06),transparent)]" />
        <motion.div
          className="mx-auto max-w-7xl px-4 pt-16 pb-12 relative"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-2">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/20 text-[#06b6d4] text-xs font-medium mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Community Agents
            </motion.div>
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3">
              <RobotMascot size="md" mood="happy" />
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-[var(--text-primary)]">
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
            className="flex flex-col gap-4 mb-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Search */}
              <div className="relative w-full sm:w-80 group/search">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none group-focus-within/search:text-[#06b6d4] transition-colors duration-200" />
                <input
                  type="text"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.4)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[#06b6d4]/50 focus:shadow-[0_0_16px_rgba(6,182,212,0.12)] transition-all duration-200 backdrop-blur-xl"
                  placeholder="Search agents by name or description..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(6,182,212,0.1)] transition-all duration-150"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {/* Debounce indicator */}
                {isSearching && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-3.5 h-3.5 text-[#06b6d4] animate-spin" />
                  </div>
                )}
              </div>

              {/* Status filter */}
              <div className="flex gap-1 w-full sm:w-auto bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.4)] backdrop-blur-xl rounded-xl p-1 overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {(Object.entries(STATUS_FILTER_LABELS) as [StatusFilter, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setStatusFilter(val)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-lg transition-all duration-200 font-medium whitespace-nowrap flex items-center gap-1.5',
                      statusFilter === val
                        ? 'bg-[#06b6d4] text-white shadow-[0_0_12px_rgba(6,182,212,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[rgba(6,182,212,0.05)]'
                    )}
                  >
                    {val !== 'all' && (
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        statusFilter === val ? 'bg-white' : STATUS_ICONS[val]
                      )} />
                    )}
                    {label}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="flex gap-1 w-full sm:w-auto bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.4)] backdrop-blur-xl rounded-xl p-1 overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setSort(val)}
                    className={cn(
                      'px-4 py-1.5 text-sm rounded-lg transition-all duration-200 font-medium whitespace-nowrap',
                      sort === val
                        ? 'bg-[#06b6d4] text-white shadow-[0_0_12px_rgba(6,182,212,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[rgba(6,182,212,0.05)]'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results summary bar */}
            <div className="flex items-center justify-between">
              <AnimatePresence mode="wait">
                <motion.p
                  key={`${filtered.length}-${search}-${statusFilter}`}
                  className="text-sm text-[var(--text-muted)]"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  {hasActiveFilters ? (
                    <>
                      Showing <span className="text-[var(--text-secondary)] font-medium">{filtered.length}</span> of{' '}
                      <span className="text-[var(--text-secondary)] font-medium">{agents.length}</span> agents
                      {isSearching && <span className="text-[#06b6d4] ml-2">searching...</span>}
                    </>
                  ) : (
                    <>
                      <span className="text-[var(--text-secondary)] font-medium">{agents.length}</span> agent{agents.length !== 1 ? 's' : ''}
                      {totalPages > 1 && (
                        <span className="ml-2">
                          — page {safePage} of {totalPages}
                        </span>
                      )}
                    </>
                  )}
                </motion.p>
              </AnimatePresence>

              {hasActiveFilters && (
                <motion.button
                  className="flex items-center gap-1.5 text-xs font-medium text-[#06b6d4] hover:text-[#22d3ee] transition-colors duration-150 px-2.5 py-1 rounded-lg hover:bg-[rgba(6,182,212,0.08)]"
                  onClick={clearAllFilters}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <X className="w-3 h-3" />
                  Clear all filters
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {/* Content */}
        <div ref={gridRef} className="scroll-mt-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: PAGE_SIZE }, (_, i) => (
                <AgentSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className={cn(cardClass, 'p-8 text-center')}>
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-400 text-sm">{error}</p>
              <p className="text-[var(--text-muted)] text-xs mt-2">Check your connection and try again</p>
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
              <h3 className="text-xl font-medium text-[var(--text-primary)] mb-2">No agents yet</h3>
              <p className="text-[var(--text-muted)] mb-6">Be the first to hatch an agent!</p>
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
              className={cn(cardClass, 'p-16 text-center max-w-lg mx-auto')}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-[rgba(6,182,212,0.08)] border border-[rgba(6,182,212,0.15)] flex items-center justify-center mx-auto mb-5">
                <SearchX className="w-8 h-8 text-[#06b6d4]/60" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No agents found</h3>
              <p className="text-[var(--text-muted)] text-sm mb-1.5">
                {search
                  ? `No results for "${search.length > 30 ? search.slice(0, 30) + '...' : search}"`
                  : 'No agents match the selected filters.'}
              </p>
              <p className="text-[var(--text-muted)] text-xs mb-6">
                Try adjusting your search or filter criteria.
              </p>
              <button
                className="btn-secondary inline-flex items-center gap-2"
                onClick={clearAllFilters}
              >
                <Filter className="w-3.5 h-3.5" />
                Clear all filters
              </button>
            </motion.div>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`page-${safePage}-${search}-${statusFilter}-${sort}`}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={pageVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                >
                  {paginatedAgents.map((agent) => (
                    <ExploreAgentCard key={agent.id} agent={agent} />
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* ── Pagination ──────────────────────────── */}
              {totalPages > 1 && (
                <motion.div
                  className="flex items-center justify-center gap-2 mt-10"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {/* Previous */}
                  <button
                    onClick={() => goToPage(safePage - 1)}
                    disabled={safePage <= 1}
                    className={cn(
                      'p-2 rounded-xl transition-all duration-200',
                      safePage <= 1
                        ? 'text-[var(--text-muted)]/30 cursor-not-allowed'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(6,182,212,0.08)]'
                    )}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {generatePageNumbers(safePage, totalPages).map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-1.5 text-[var(--text-muted)] text-sm select-none">
                          ...
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => goToPage(p as number)}
                          className={cn(
                            'min-w-[36px] h-9 rounded-xl text-sm font-medium transition-all duration-200',
                            safePage === p
                              ? 'bg-[#06b6d4] text-white shadow-[0_0_16px_rgba(6,182,212,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(6,182,212,0.08)]'
                          )}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>

                  {/* Next */}
                  <button
                    onClick={() => goToPage(safePage + 1)}
                    disabled={safePage >= totalPages}
                    className={cn(
                      'p-2 rounded-xl transition-all duration-200',
                      safePage >= totalPages
                        ? 'text-[var(--text-muted)]/30 cursor-not-allowed'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(6,182,212,0.08)]'
                    )}
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pagination helper ───────────────────────────────────────
function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [];

  // Always show first page
  pages.push(1);

  if (current > 3) pages.push('...');

  // Show pages around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push('...');

  // Always show last page
  pages.push(total);

  return pages;
}

// ── Explore Agent Card ──────────────────────────────────────

const ExploreAgentCard = memo(function ExploreAgentCard({ agent }: { agent: Agent }) {
  const status = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG['paused']!;
  const fw = agent.framework as AgentFramework;
  const fwConfig = FRAMEWORK_COLORS[fw] ?? FRAMEWORK_COLORS['openclaw']!;
  const fwMeta = FRAMEWORKS[fw];
  const messageCount = (agent as Agent & { messageCount?: number }).messageCount ?? 0;

  const description = (() => {
    const desc = agent.description ?? '';
    if (!desc || /you are (a|an) (fully )?autonomous|system prompt|IMPORTANT.*SECURITY|NEVER (reveal|override)|stay in character/i.test(desc)) {
      return fwMeta?.description ?? 'An AI agent on Hatcher.';
    }
    return desc;
  })();

  const isNewAgent = messageCount === 0;

  return (
    <motion.div variants={cardVariants}>
      <Link href={`/agent/${agent.id}`} className="block group">
        <div className="relative">
          {/* Framework-colored border glow on hover */}
          <div
            className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none"
            style={{ background: `linear-gradient(135deg, ${fwConfig.border}, transparent 70%)`, borderRadius: '16px' }}
          />
          <motion.div
            className={cn(cardClass, 'p-5 h-full flex flex-col relative')}
            whileHover={{
              y: -4,
              boxShadow: `0 12px 40px ${fwConfig.glow}`,
            }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Top accent line — framework color */}
            <div
              className="absolute top-0 left-4 right-4 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: `linear-gradient(90deg, transparent, ${fwConfig.border}, transparent)` }}
            />

            {/* Header: avatar + name + status */}
            <div className="flex items-start gap-3 mb-3">
              {/* Avatar — real image or framework SVG icon */}
              {agent.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={agent.avatarUrl}
                  alt={agent.name}
                  className="w-12 h-12 rounded-full border border-[rgba(46,43,74,0.3)] object-cover flex-shrink-0 transition-all duration-300"
                  style={{ ['--tw-ring-color' as string]: fwConfig.border }}
                />
              ) : (
                <div className="flex-shrink-0 transition-all duration-300 group-hover:scale-105">
                  <FrameworkAvatar framework={fw} size={48} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#FFFFFF] truncate group-hover:transition-colors duration-200" style={{}}>
                  <span className="group-hover:text-[var(--fw-color,#06b6d4)] transition-colors duration-200" style={{ ['--fw-color' as string]: fwConfig.icon }}>
                    {agent.name}
                  </span>
                </h3>

                {/* Status + framework badge */}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      status.color,
                      status.pulse && 'animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.5)]'
                    )} />
                    <span className="text-xs text-[#71717a]">{status.label}</span>
                  </span>

                  <span className={cn('fw-tag', fwConfig.badge)}>
                    {fwMeta?.name ?? fw}
                  </span>

                  {isNewAgent && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      New
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Description (2 lines) — fall back to framework description */}
            <p className="text-sm text-[#A5A1C2] leading-relaxed mb-4 flex-1 line-clamp-2">
              {description}
            </p>

            {/* Footer */}
            <div
              className="flex items-center justify-between text-xs text-[#71717a] pt-3 border-t border-[rgba(46,43,74,0.3)] transition-colors duration-300"
              style={{ ['--hover-border' as string]: fwConfig.border }}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  {agent.features?.length ?? 0}
                </span>
                {messageCount > 0 && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {messageCount}
                  </span>
                )}
              </div>
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
});
