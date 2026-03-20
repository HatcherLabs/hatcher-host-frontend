'use client';

import { useEffect, useState, useMemo, memo, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@/components/wallet/WalletButton';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import Link from 'next/link';
import { NotificationPanel } from '@/components/ui/NotificationPanel';
import { motion } from 'framer-motion';
import { RobotMascot } from '@/components/ui/RobotMascot';
import {
  Search,
  Settings,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Bot,
  ArrowUpRight,
  Filter,
  Sparkles,
  Cpu,
  Share2,
  Wallet,
  Globe,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import dynamic from 'next/dynamic';

// Dynamically import recharts-based chart components (SSR disabled — recharts needs DOM)
const MiniDonut = dynamic(
  () => import('@/components/dashboard/DashboardCharts').then(mod => ({ default: mod.MiniDonut })),
  { ssr: false, loading: () => <div className="shimmer rounded-full" style={{ width: 44, height: 44 }} /> }
);

const FeatureDonut = dynamic(
  () => import('@/components/dashboard/DashboardCharts').then(mod => ({ default: mod.FeatureDonut })),
  { ssr: false, loading: () => <div className="shimmer rounded-full" style={{ width: 160, height: 160 }} /> }
);

const AgentStatusChart = dynamic(
  () => import('@/components/dashboard/DashboardCharts').then(mod => ({ default: mod.AgentStatusChart })),
  { ssr: false, loading: () => <div className="shimmer rounded-xl" style={{ width: '100%', height: 220 }} /> }
);

// ── Color constants ─────────────────────────────────────────
const COLORS = {
  bg: '#0D0B1A',
  accent: '#f97316',
  accentLight: '#f97316',
  orange: '#f97316',
  amber: '#FBBF24',
  green: '#4ADE80',
  red: '#F87171',
  blue: '#60A5FA',
  pink: '#F472B6',
  textPrimary: '#FFFFFF',
  textSecondary: '#A5A1C2',
  textMuted: '#71717a',
  cardBg: '#0D0B1A',
  cardBorder: 'rgba(46,43,74,0.4)',
} as const;

// ── Card wrapper ────────────────────────────────────────────
function Card({
  children,
  className = '',
  accent = false,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`card glass-noise p-5 ${accent ? 'card-glow-border' : ''} ${className}`}
      style={accent ? { borderColor: 'rgba(249, 115, 22, 0.25)' } : undefined}
    >
      {children}
    </div>
  );
}

// ── Animated Counter for Dashboard ──────────────────────────
const AnimatedValue = memo(function AnimatedValue({ value, suffix = '' }: { value: string; suffix?: string }) {
  const numericMatch = value.match(/^(\d+)/);
  if (!numericMatch) return <>{value}</>;

  const target = parseInt(numericMatch[1], 10);
  const rest = value.slice(numericMatch[0].length);
  const [display, setDisplay] = useState(0);
  const hasAnimatedRef = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;
    const duration = 1200;
    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return <>{display}{rest}{suffix}</>;
});

// MiniDonut is dynamically imported from DashboardCharts (see top of file)

// ── Stat Card component ─────────────────────────────────────
function StatCard({
  label,
  value,
  change,
  donutValue,
  donutColor,
  subtitle,
}: {
  label: string;
  value: string;
  change: number;
  donutValue: number;
  donutColor: string;
  subtitle?: string;
}) {
  const isPositive = change >= 0;
  return (
    <div className="group relative">
      {/* Gradient border wrapper */}
      <div
        className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${donutColor}40, rgba(6,182,212,0.15))`,
          borderRadius: '16px',
        }}
      />
      <Card className="relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <span
              className="uppercase tracking-wider font-semibold block mb-2"
              style={{ color: COLORS.textMuted, fontSize: '11px', letterSpacing: '0.08em' }}
            >
              {label}
            </span>
            <span
              className="font-bold block tabular-nums"
              style={{ fontSize: '28px', lineHeight: '1.1', color: COLORS.textPrimary }}
            >
              <AnimatedValue value={value} />
            </span>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md"
                style={{
                  color: isPositive ? COLORS.green : COLORS.red,
                  background: isPositive ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                }}
              >
                {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {isPositive ? '+' : ''}
                {change}%
              </span>
              <span style={{ color: COLORS.textMuted, fontSize: '11px' }}>
                {subtitle ?? 'Last Month'}
              </span>
            </div>
          </div>
          <MiniDonut value={donutValue} color={donutColor} />
        </div>
      </Card>
    </div>
  );
}

// ── Derive feature usage from real agent data ───────────────
function deriveFeatureCategories(agents: Agent[]) {
  let social = 0, defi = 0, ai = 0, infra = 0;

  for (const agent of agents) {
    const features = (agent as Agent & { features?: Array<{ featureKey: string }> }).features ?? [];
    for (const f of features) {
      const key = f.featureKey;
      if (key.includes('platform.')) social++;
      else if (key.includes('skills.') || key.includes('feature.voice') || key.includes('feature.multiagent')) ai++;
      else if (key.includes('resources.') || key.includes('logs')) infra++;
      else defi++;
    }
  }

  const total = social + defi + ai + infra;
  if (total === 0) {
    return [
      { name: 'Social', value: 0, color: COLORS.blue, icon: Share2 },
      { name: 'DeFi', value: 0, color: COLORS.green, icon: Wallet },
      { name: 'AI', value: 0, color: COLORS.accentLight, icon: Cpu },
      { name: 'Infrastructure', value: 0, color: COLORS.amber, icon: Globe },
    ];
  }

  return [
    { name: 'Social', value: social, color: COLORS.blue, icon: Share2 },
    { name: 'DeFi', value: defi, color: COLORS.green, icon: Wallet },
    { name: 'AI', value: ai, color: COLORS.accentLight, icon: Cpu },
    { name: 'Infrastructure', value: infra, color: COLORS.amber, icon: Globe },
  ];
}

// ── Recent activity derived from agents ─────────────────────
function deriveRecentActivity(agents: Agent[]) {
  if (agents.length === 0) {
    return [
      {
        time: 'No activity yet',
        items: [
          { tag: 'Get Started', tagColor: COLORS.accent, desc: 'Create your first agent to see activity here', ago: 'now' },
        ],
      },
    ];
  }

  const items: Array<{ tag: string; tagColor: string; desc: string; ago: string }> = [];

  // Show real agent status information
  const active = agents.filter(a => a.status === 'active');
  const sleeping = agents.filter(a => a.status === 'sleeping');
  const errored = agents.filter(a => a.status === 'error');

  if (active.length > 0) {
    for (const a of active.slice(0, 3)) {
      items.push({
        tag: 'Running',
        tagColor: COLORS.green,
        desc: `${a.name} is active and processing requests`,
        ago: 'now',
      });
    }
  }
  if (errored.length > 0) {
    items.push({
      tag: 'Error',
      tagColor: COLORS.red,
      desc: `${errored.length} agent${errored.length > 1 ? 's need' : ' needs'} attention — check logs`,
      ago: '',
    });
  }
  if (sleeping.length > 0) {
    items.push({
      tag: 'Sleeping',
      tagColor: COLORS.blue,
      desc: `${sleeping.length} agent${sleeping.length > 1 ? 's' : ''} idle — will wake on next message`,
      ago: '',
    });
  }
  // Show recently created agents
  const sorted = [...agents].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const newest = sorted[0];
  if (newest) {
    const created = new Date(newest.createdAt);
    const diff = Date.now() - created.getTime();
    const ago = diff < 3600000 ? `${Math.floor(diff / 60000)}m ago`
      : diff < 86400000 ? `${Math.floor(diff / 3600000)}h ago`
      : `${Math.floor(diff / 86400000)}d ago`;
    items.push({
      tag: 'Created',
      tagColor: COLORS.orange,
      desc: `${newest.name} was created`,
      ago,
    });
  }

  return [{ time: 'Agent Status', items }];
}

// ── Animation variants (hoisted outside component to avoid re-allocation) ──
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ── AI Insights — derived from real agent state ──────────────
function deriveInsights(agents: Agent[]): Array<{ text: string; accentColor: string }> {
  if (agents.length === 0) return [];

  const insights: Array<{ text: string; accentColor: string }> = [];

  // Check for agents in error state
  const errored = agents.filter((a) => a.status === 'error');
  if (errored.length > 0) {
    insights.push({
      text: `${errored.length} agent${errored.length > 1 ? 's are' : ' is'} in error state. Check logs and restart manually.`,
      accentColor: COLORS.red,
    });
  }

  // Check for sleeping agents
  const sleeping = agents.filter((a) => a.status === 'sleeping');
  if (sleeping.length > 0) {
    insights.push({
      text: `${sleeping.length} agent${sleeping.length > 1 ? 's are' : ' is'} sleeping due to inactivity. They'll wake automatically on the next incoming message.`,
      accentColor: COLORS.blue,
    });
  }

  // Check for agents without features (minimal config)
  const agentsWithFeatures = agents.filter((a) => {
    const feats = (a as Agent & { features?: Array<{ featureKey: string }> }).features;
    return feats && feats.length > 0;
  });
  const noFeatureCount = agents.length - agentsWithFeatures.length;
  if (noFeatureCount > 0) {
    insights.push({
      text: `${noFeatureCount} agent${noFeatureCount > 1 ? 's have' : ' has'} no unlocked features. Upgrade with platform integrations or skills to unlock full potential.`,
      accentColor: COLORS.accent,
    });
  }

  // Check for active agents — positive feedback
  const active = agents.filter((a) => a.status === 'active');
  if (active.length > 0) {
    insights.push({
      text: `${active.length} agent${active.length > 1 ? 's are' : ' is'} running and processing requests. Keep monitoring for errors in the logs.`,
      accentColor: COLORS.green,
    });
  }

  // Check for recently created agents (< 24h)
  const recent = agents.filter((a) => Date.now() - new Date(a.createdAt).getTime() < 86400000);
  if (recent.length > 0) {
    insights.push({
      text: `${recent.length} agent${recent.length > 1 ? 's were' : ' was'} created in the last 24 hours. Make sure to configure integrations before deploying.`,
      accentColor: COLORS.orange,
    });
  }

  // If only 1 agent, suggest creating more
  if (agents.length === 1) {
    insights.push({
      text: 'You have 1 agent. Create more to build a network of specialized agents for different tasks.',
      accentColor: COLORS.accent,
    });
  }

  return insights.slice(0, 3); // Max 3 insights
}

// ═════════════════════════════════════════════════════════════
// Main Dashboard Page
// ═════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { connected, publicKey } = useWallet();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'sleeping' | 'error'>('all');
  const [showSuggestion, setShowSuggestion] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getMyAgents().then((res) => {
      setLoading(false);
      if (res.success) setAgents(res.data);
      else setError(res.error ?? 'Failed to load agents');
    }).catch(() => {
      setLoading(false);
      setError('Failed to load agents. Please try again.');
    });
  }, [isAuthenticated]);

  const featureCategories = useMemo(() => deriveFeatureCategories(agents), [agents]);
  const recentActivity = useMemo(() => deriveRecentActivity(agents), [agents]);
  const insights = useMemo(() => deriveInsights(agents), [agents]);
  const featureTotal = featureCategories.reduce((sum, c) => sum + c.value, 0);

  // Agent status distribution for bar chart
  const agentStatusData = useMemo(() => {
    const counts: Record<string, number> = { active: 0, sleeping: 0, paused: 0, error: 0, killed: 0 };
    for (const a of agents) {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    }
    return [
      { name: 'Active', count: counts.active ?? 0, color: COLORS.green },
      { name: 'Sleeping', count: counts.sleeping ?? 0, color: COLORS.blue },
      { name: 'Paused', count: counts.paused ?? 0, color: COLORS.amber },
      { name: 'Error', count: counts.error ?? 0, color: COLORS.red },
      { name: 'Stopped', count: counts.killed ?? 0, color: COLORS.red },
    ].filter((d) => d.count > 0);
  }, [agents]);

  // Filtered recent activity
  const filteredActivity = useMemo(() => {
    if (activityFilter === 'all') return recentActivity;
    return recentActivity.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (activityFilter === 'active') return item.tag === 'Running' || item.tag === 'Created';
        if (activityFilter === 'sleeping') return item.tag === 'Sleeping';
        if (activityFilter === 'error') return item.tag === 'Error';
        return true;
      }),
    })).filter((group) => group.items.length > 0);
  }, [recentActivity, activityFilter]);

  const activeCount = agents.filter((a) => a.status === 'active').length;
  const totalMessages = agents.reduce((sum, a) => sum + ((a as Agent & { messageCount?: number }).messageCount ?? 0), 0);
  const addr = publicKey?.toString() ?? '';
  const shortAddr = addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  // ── Unauthenticated states ──────────────────────────────
  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <div className="text-center max-w-md px-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: COLORS.accent + '20' }}
          >
            <Bot size={40} style={{ color: COLORS.accent }} />
          </div>
          <h1 className="text-2xl font-bold mb-3" style={{ color: COLORS.textPrimary }}>
            Connect Your Wallet
          </h1>
          <p className="mb-8 text-sm" style={{ color: COLORS.textSecondary }}>
            Connect a Solana wallet to access your agent dashboard.
          </p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: COLORS.accent, borderTopColor: 'transparent' }}
          />
          <p style={{ color: COLORS.textSecondary }}>Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <div className="text-center max-w-md px-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: COLORS.accent + '20' }}
          >
            <Zap size={40} style={{ color: COLORS.accent }} />
          </div>
          <h1 className="text-2xl font-bold mb-3" style={{ color: COLORS.textPrimary }}>
            Sign In Required
          </h1>
          <p className="mb-8 text-sm" style={{ color: COLORS.textSecondary }}>
            Sign a message with your wallet to access your dashboard.
          </p>
          <button
            className="px-8 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
            style={{ background: COLORS.accent }}
            onClick={login}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Loading state ───────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen p-6 lg:p-10" style={{ background: COLORS.bg }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-4 rounded w-24 mb-4" style={{ background: COLORS.textMuted + '20' }} />
                <div className="h-8 rounded w-16" style={{ background: COLORS.textMuted + '20' }} />
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 lg:p-10 flex items-center justify-center" style={{ background: COLORS.bg }}>
        <Card className="p-8 text-center max-w-md">
          <p className="text-red-400 mb-3">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); api.getMyAgents().then((res) => { setLoading(false); if (res.success) setAgents(res.data); }).catch(() => { setLoading(false); setError('Failed to load agents. Please try again.'); }); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: COLORS.accent, color: '#fff' }}
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  // ── Main dashboard ──────────────────────────────────────
  return (
    <motion.div
      className="min-h-screen p-4 sm:p-6 lg:p-10 relative overflow-hidden bg-mesh-glow"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Subtle top gradient glow */}
        <div className="absolute inset-0 pointer-events-none bg-grid-dots opacity-40" />
        <div className="absolute top-0 left-0 right-0 h-96 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 30% 0%, rgba(249,115,22,0.07), transparent), radial-gradient(ellipse 60% 40% at 70% 10%, rgba(6,182,212,0.04), transparent)' }} />

        {/* ── 1. Top Bar with Robot Greeting ───────────────── */}
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative"
          variants={itemVariants}
        >
          <div className="flex items-center gap-4">
            <RobotMascot size="sm" mood="waving" />
            <div>
              <h1 className="text-2xl font-bold" style={{ color: COLORS.textPrimary, fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
                Welcome back!
              </h1>
              <p className="text-sm mt-0.5 font-mono" style={{ color: COLORS.textSecondary }}>
                {shortAddr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="glass flex items-center gap-2 flex-1 sm:flex-initial rounded-xl px-4 py-2.5">
              <Search size={16} style={{ color: COLORS.textMuted }} />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none text-sm w-full sm:w-48 placeholder:opacity-50"
                style={{ color: COLORS.textPrimary }}
              />
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded" style={{ color: COLORS.textMuted, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                ⌘K
              </kbd>
            </div>
            <Link
              href="/settings"
              className="glass w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
              aria-label="Settings"
            >
              <Settings size={18} style={{ color: COLORS.textSecondary }} />
            </Link>
            <NotificationPanel />
          </div>
        </motion.div>

        {/* ── 2. Stat Cards Row (4 cards with mini donuts) ── */}
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" variants={itemVariants}>
          <StatCard
            label="Total Agents"
            value={`${agents.length}`}
            change={agents.length > 0 ? 100 : 0}
            donutValue={Math.min(agents.length * 20, 100)}
            donutColor={COLORS.accent}
            subtitle="All time"
          />
          <StatCard
            label="Active Agents"
            value={`${activeCount}`}
            change={agents.length > 0 ? Math.round((activeCount / agents.length) * 100) : 0}
            donutValue={agents.length > 0 ? Math.round((activeCount / agents.length) * 100) : 0}
            donutColor={COLORS.green}
            subtitle={`of ${agents.length} total`}
          />
          <StatCard
            label="Features"
            value={`${featureTotal}`}
            change={featureTotal > 0 ? 100 : 0}
            donutValue={Math.min(featureTotal * 10, 100)}
            donutColor={COLORS.orange}
            subtitle="Unlocked"
          />
          <StatCard
            label="Messages"
            value={`${totalMessages}`}
            change={totalMessages > 0 ? 100 : 0}
            donutValue={Math.min(totalMessages * 5, 100)}
            donutColor={COLORS.amber}
            subtitle="All time"
          />
        </motion.div>

        {/* ── Quick Actions Bar ──────────────────────────── */}
        <motion.div className="flex flex-wrap items-center gap-3" variants={itemVariants}>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-lg"
            style={{ background: COLORS.accent, boxShadow: `0 4px 16px ${COLORS.accent}30` }}
          >
            <Zap size={15} />
            Create Agent
          </Link>
          <Link
            href="/dashboard/agents"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 border"
            style={{ color: COLORS.textSecondary, borderColor: COLORS.cardBorder, background: 'rgba(255,255,255,0.02)' }}
          >
            <Bot size={15} />
            My Agents ({agents.length})
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 border"
            style={{ color: COLORS.textSecondary, borderColor: COLORS.cardBorder, background: 'rgba(255,255,255,0.02)' }}
          >
            <Globe size={15} />
            Explore
          </Link>
        </motion.div>

        <div className="divider-glow" />

        {/* ── 3. Two-column: Agent Activity + Feature Usage ── */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-5 gap-4" variants={itemVariants}>
          {/* LEFT: Agent Activity - status distribution chart (wider) */}
          <Card className="lg:col-span-3">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: COLORS.textPrimary, fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
                  Agent Overview
                </h2>
                <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
                  Status distribution
                </p>
              </div>
              <span
                className="text-xs px-3 py-1 rounded-lg"
                style={{ color: COLORS.textMuted, background: COLORS.textMuted + '15' }}
              >
                {agents.length} total
              </span>
            </div>

            {agents.length === 0 ? (
              <EmptyState
                icon={Cpu}
                title="No agents yet"
                description="Create your first AI agent and deploy it in 60 seconds."
                actionLabel="Create Agent"
                actionHref="/create"
                secondaryLabel="Explore"
                secondaryHref="/explore"
              />
            ) : (
              <AgentStatusChart data={agentStatusData} />
            )}
          </Card>

          {/* RIGHT: Feature Usage - donut chart */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: COLORS.textPrimary, fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
                Feature Usage
              </h2>
              <button
                className="text-xs px-3 py-1 rounded-lg"
                style={{ color: COLORS.textMuted, background: COLORS.textMuted + '15' }}
              >
                This Month
              </button>
            </div>

            {/* Donut chart with center label */}
            <div className="flex justify-center mb-4">
              <FeatureDonut data={featureCategories} total={featureTotal} />
            </div>

            {/* Legend */}
            <div className="space-y-3">
              {featureCategories.map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: cat.color }}
                      />
                      <CatIcon size={14} style={{ color: cat.color }} />
                      <span className="text-sm" style={{ color: COLORS.textSecondary }}>
                        {cat.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>
                      {cat.value}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* AI Suggestion link */}
            <button
              onClick={() => setShowSuggestion(!showSuggestion)}
              className="flex items-center gap-1.5 mt-5 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: COLORS.accent }}
            >
              <Sparkles size={13} />
              {showSuggestion ? 'Hide Suggestion' : 'Show AI Suggestion'}
            </button>
            {showSuggestion && (
              <div
                className="mt-3 p-3 rounded-xl text-xs leading-relaxed"
                style={{
                  background: 'rgba(249,115,22,0.06)',
                  borderLeft: `3px solid ${COLORS.accent}`,
                  color: COLORS.textSecondary,
                }}
              >
                {featureTotal === 0
                  ? 'Unlock platform integrations like Telegram or Discord to start connecting your agents to the world.'
                  : featureCategories.find((c) => c.name === 'Social')?.value === 0
                    ? 'Consider adding social platform integrations to increase your agent reach.'
                    : featureCategories.find((c) => c.name === 'AI')?.value === 0
                      ? 'Unlock skills and voice features to make your agents more capable.'
                      : 'Your feature usage is balanced. Consider upgrading to dedicated resources for better performance.'}
              </div>
            )}
          </Card>
        </motion.div>

        {/* ── 4. Bottom Row: Recent Activity + AI Insights ── */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-5 gap-4" variants={itemVariants}>
          {/* LEFT: Recent Activity - timeline */}
          <Card className="lg:col-span-3">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold" style={{ color: COLORS.textPrimary, fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
                Recent Activity
              </h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value as typeof activityFilter)}
                    className="appearance-none flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-80 cursor-pointer pr-7 outline-none"
                    style={{ color: COLORS.textMuted, background: COLORS.textMuted + '15', border: 'none' }}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="sleeping">Sleeping</option>
                    <option value="error">Error</option>
                  </select>
                  <Filter size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: COLORS.textMuted }} />
                </div>
                <Link
                  href="/dashboard/agents"
                  className="text-xs flex items-center gap-1 transition-colors hover:opacity-80"
                  style={{ color: COLORS.accent }}
                >
                  View all <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>

            <div className="space-y-5">
              {filteredActivity.map((group, gi) => (
                <div key={gi}>
                  {/* Timestamp header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-md"
                      style={{ color: COLORS.textSecondary, background: COLORS.textMuted + '15' }}
                    >
                      {group.time}
                    </span>
                    <div className="flex-1 h-px" style={{ background: COLORS.cardBorder }} />
                  </div>
                  {/* Action cards */}
                  <div className="space-y-2.5 pl-2">
                    {group.items.map((item, ii) => (
                      <div
                        key={`${item.tag}-${item.ago}-${ii}`}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.02)' }}
                      >
                        <div
                          className="w-1 h-8 rounded-full flex-shrink-0"
                          style={{ background: item.tagColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded"
                              style={{
                                color: item.tagColor,
                                background: item.tagColor + '15',
                              }}
                            >
                              {item.tag}
                            </span>
                          </div>
                          <p className="text-sm truncate" style={{ color: COLORS.textSecondary }}>
                            {item.desc}
                          </p>
                        </div>
                        <span
                          className="text-xs flex-shrink-0"
                          style={{ color: COLORS.textMuted }}
                        >
                          {item.ago}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* RIGHT: AI Insights */}
          <Card className="lg:col-span-2 card-featured" accent>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: COLORS.accent + '25', boxShadow: '0 0 16px rgba(249,115,22,0.2)' }}
                >
                  <Zap size={18} style={{ color: COLORS.accent }} />
                </div>
                <h2 className="text-lg font-semibold" style={{ color: COLORS.textPrimary, fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
                  AI Insights
                </h2>
              </div>
              <Link
                href="/dashboard/agents"
                className="text-xs flex items-center gap-1 transition-colors hover:opacity-80"
                style={{ color: COLORS.accent }}
              >
                See all <ArrowUpRight size={12} />
              </Link>
            </div>

            <div className="space-y-3">
              {insights.length > 0 ? (
                insights.map((insight, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderLeft: `3px solid ${insight.accentColor}`,
                    }}
                  >
                    <p className="text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>
                      {insight.text}
                    </p>
                  </div>
                ))
              ) : (
                <div
                  className="p-3.5 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderLeft: `3px solid ${COLORS.accent}`,
                  }}
                >
                  <p className="text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>
                    No insights yet. Create and activate an agent to receive AI-powered recommendations.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
