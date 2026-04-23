'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { timeAgo } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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
import { GuidedTour } from '@/components/ui/GuidedTour';
import type { TourStep } from '@/components/ui/GuidedTour';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { OnboardingDemo } from '@/components/onboarding/OnboardingDemo';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ShortcutHelpModal } from '@/components/ui/ShortcutHelpModal';
import { AgentCardSkeleton, SkeletonStat } from '@/components/ui/Skeleton';
import Image from 'next/image';
import { generateAgentAvatar } from '@/lib/avatar-generator';

import { AGENT_STATUSES, AGENT_STATUS_CONFIG } from '@hatcher/shared';
import type { AgentFramework } from '@hatcher/shared';

// ── Framework avatar colors ──────────────────────────────────
const FRAMEWORK_ICON_COLORS: Record<string, string> = {
  openclaw: '#f59e0b',
  hermes: '#a855f7',
  elizaos: 'var(--color-accent)',
  milady: '#f43f5e',
};

// ── Framework SVG avatars (matches Explore page) ─────────────
function FrameworkAvatar({ framework, size = 48 }: { framework: string; size?: number }) {
  const color = FRAMEWORK_ICON_COLORS[framework] ?? 'var(--color-accent)';
  const s = size;

  if (framework === 'hermes') {
    return (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="12" fill={color} fillOpacity="0.12" />
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
        <rect width="48" height="48" rx="12" fill={color} fillOpacity="0.12" />
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
        <rect width="48" height="48" rx="12" fill={color} fillOpacity="0.12" />
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
      <rect width="48" height="48" rx="12" fill={color} fillOpacity="0.12" />
      <rect x="13" y="14" width="22" height="16" rx="4" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.15" />
      <circle cx="19" cy="22" r="3" fill={color} fillOpacity="0.8" />
      <circle cx="29" cy="22" r="3" fill={color} fillOpacity="0.8" />
      <rect x="21" y="26" width="6" height="2" rx="1" fill={color} />
      <line x1="24" y1="14" x2="24" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="9" r="2" fill={color} />
      <line x1="13" y1="26" x2="8" y2="32" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="32" x2="6" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="32" x2="10" y2="37" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="35" y1="26" x2="40" y2="32" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="32" x2="38" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="32" x2="42" y2="37" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="create-agent"]',
    title: 'Create Your First Agent',
    description: 'Click here to hatch your first AI agent. Choose from 4 frameworks.',
    position: 'bottom',
  },
  {
    target: '[data-tour="framework-filter"]',
    title: 'Filter by Framework',
    description: 'OpenClaw, Hermes, ElizaOS, or Milady \u2014 each has unique strengths.',
    position: 'bottom',
  },
  {
    target: '[data-tour="search-input"]',
    title: 'Search & Explore',
    description: 'Search agents or browse 200+ templates to get started quickly.',
    position: 'bottom',
  },
  {
    target: '[data-tour="empty-state"]',
    title: 'Your Plan',
    description: 'Start free with 1 agent and 20 messages/day. Upgrade anytime.',
    position: 'top',
  },
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
  elizaos: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
  milady: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
};

const FRAMEWORK_LABELS: Record<string, string> = {
  openclaw: 'OpenClaw',
  hermes: 'Hermes',
  elizaos: 'ElizaOS',
  milady: 'Milady',
};

function FrameworkTag({ framework = 'openclaw' }: { framework?: string }) {
  const style = FRAMEWORK_BADGE_STYLES[framework] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/25';
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
          <div className="w-12 h-12 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Authenticating...</p>
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
          <div className="w-20 h-20 rounded-2xl bg-[var(--color-accent)]/15 flex items-center justify-center mx-auto mb-6">
            <Zap size={40} className="text-[var(--color-accent)]" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">Sign In Required</h1>
          <p className="mb-8 text-sm text-[var(--text-secondary)]">
            Sign in to your account to access your agents.
          </p>
          <Link href="/login" className="btn-primary px-8 py-3 inline-block">
            Sign In
          </Link>
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
              <SkeletonStat key={i} />
            ))}
          </div>
          {/* Agent cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <AgentCardSkeleton key={i} />
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
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Dashboard</p>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>My agents</h1>
            <p className="text-sm mt-2 text-[var(--text-secondary)]">
              {agents.length === 0
                ? 'Create your first agent to get started.'
                : `${agents.length} agent${agents.length !== 1 ? 's' : ''} total · ${activeCount} active`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/create" className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[var(--text-primary)] text-[var(--bg-base)] text-sm font-semibold hover:opacity-90 transition-opacity" data-tour="create-agent">
              <PlusCircle size={16} />
              Create agent
            </Link>
          </div>
        </motion.div>

        {/* ── Stat Cards ──────────────────────────────────── */}
        {agents.length > 0 && (
          <QuickStats agentCount={agents.length} activeCount={activeCount} />
        )}

        {/* ── Filter / Search / Sort bar ──────────────────── */}
        <motion.div
          className="flex flex-col gap-2"
          variants={cardVariants}
        >
          {/* Row 1: Status filters */}
          <div className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key as StatusFilter)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  statusFilter === f.key
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border-default)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Row 2: Framework, Search, Sort, Clear */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Framework filter */}
            <select
              value={frameworkFilter}
              onChange={(e) => setFrameworkFilter(e.target.value as FrameworkFilter)}
              className="h-9 px-3 rounded-xl text-xs font-medium bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] outline-none cursor-pointer appearance-none pr-7"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
              data-tour="framework-filter"
            >
              {FRAMEWORK_FILTERS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>

            {/* Search */}
            <div className="flex items-center gap-2 flex-1 min-w-[160px] h-9 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3" data-tour="search-input">
              <Search size={14} className="text-[var(--text-muted)] shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search agents... ( / )"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none text-xs w-full text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            {/* Sort */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="h-9 px-3 rounded-xl text-xs font-medium bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] outline-none cursor-pointer appearance-none pr-7"
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
                className="h-9 flex items-center gap-1 px-2.5 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <X size={12} />
                Clear
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Agent Grid ──────────────────────────────────── */}
        {filteredAgents.length === 0 ? (
          agents.length === 0 ? (
            /* True empty state — no agents created yet */
            <>
            <OnboardingDemo />
            <div className="card glass-noise" data-tour="empty-state">
              <EmptyState
                icon={Cpu}
                title="No agents yet"
                description="Create your first AI agent and deploy it in 60 seconds."
                actionLabel="Create Agent"
                actionHref="/create"
                secondaryLabel="See Frameworks"
                secondaryHref="/frameworks"
              />
            </div>
            </>
          ) : (
            /* Filter/search returned no results */
            <motion.div
              className="card glass-noise flex flex-col items-center justify-center py-20 px-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center mx-auto mb-6">
                <Bot size={32} className="text-[var(--color-accent)]" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                No matching agents
              </h2>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6">
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
                    <Image
                      src={agent.avatarUrl || generateAgentAvatar(agent.name, agent.framework)}
                      alt={agent.name}
                      width={48}
                      height={48}
                      unoptimized
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0 ring-1 ring-white/10"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[var(--text-primary)] font-semibold text-sm truncate group-hover:text-[var(--color-accent)] transition-colors">
                          {agent.name}
                        </h3>
                        <StatusBadge status={agent.status} />
                      </div>
                      {agent.description ? (
                        <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                          {agent.description}
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--text-muted)] mt-1 italic">No description</p>
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
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-default)]">
                    <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <Calendar size={12} />
                      {timeAgo(agent.createdAt)}
                    </span>

                    {/* Quick action buttons -- visible on hover */}
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                      {agent.status === 'active' ? (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); api.restartAgent(agent.id).then((res) => { if (res.success) { setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, status: 'active' } : a)); setSuccessMsg(`${agent.name} restarted`); setTimeout(() => setSuccessMsg(null), 3000); } else setError(res.error ?? 'Restart failed'); }).catch(() => setError('Failed to restart agent')); }}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-accent)]/10 transition-colors"
                            title="Restart"
                            aria-label={`Restart ${agent.name}`}
                          >
                            <RotateCcw size={13} className="text-[var(--color-accent)]" />
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
                      <span className="text-xs text-[var(--color-accent)] ml-0.5">
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
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 card glass-noise px-5 py-3 border-l-4 border-green-500 shadow-lg max-w-[calc(100vw-2rem)]"
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

      {/* Guided tour for first-time users with 0 agents */}
      {!loading && agents.length === 0 && <GuidedTour steps={TOUR_STEPS} />}
    </motion.div>
  );
}
