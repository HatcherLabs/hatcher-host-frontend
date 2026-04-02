'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import { shortenAddress, timeAgo } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Shield,
  Users,
  Bot,
  Activity,
  DollarSign,
  Search,
  Pause,
  XCircle,
  Zap,
  Layers,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  UserPlus,
  Wallet,
  Ticket,
  Clock,
  CheckCircle2,
  ExternalLink,
  HeartPulse,
  Database,
  HardDrive,
  Server,
  Container,
  Download,
  Play,
  BarChart3,
  TrendingUp,
  PieChart,
} from 'lucide-react';


// ── Status filters ───────────────────────────────────────────
const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'sleeping', label: 'Sleeping' },
  { key: 'paused', label: 'Paused' },
  { key: 'error', label: 'Error' },
  { key: 'killed', label: 'Killed' },
  { key: 'restarting', label: 'Restarting' },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]['key'];

const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ── Stat Card ────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
}) {
  return (
    <motion.div className="card glass-noise p-5" variants={cardVariants}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <span className="text-[11px] uppercase tracking-[0.08em] font-semibold block mb-2 text-[var(--text-muted)]">
            {label}
          </span>
          <span className="text-[28px] leading-[1.1] font-bold block text-[var(--text-primary)]">
            {value}
          </span>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconColor + '18' }}
        >
          <Icon size={20} style={{ color: iconColor }} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Status badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    active: 'badge-active',
    sleeping: 'badge-sleeping',
    paused: 'badge-paused',
    error: 'badge-error',
    killed: 'badge-error',
    restarting: 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20',
  };
  return (
    <span className={classes[status] ?? 'badge-paused'}>
      {(status === 'active' || status === 'restarting') && (
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse inline-block ${status === 'restarting' ? 'bg-amber-400' : 'bg-green-400'}`} />
      )}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Framework tag ────────────────────────────────────────────
const FRAMEWORK_META: Record<string, { label: string; color: string; style: string }> = {
  openclaw: { label: 'OpenClaw', color: '#f59e0b', style: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  hermes: { label: 'Hermes', color: '#a855f7', style: 'bg-purple-500/10 text-purple-400 border-purple-500/25' },
  elizaos: { label: 'ElizaOS', color: '#06b6d4', style: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25' },
  milady: { label: 'Milady', color: '#f43f5e', style: 'bg-rose-500/10 text-rose-400 border-rose-500/25' },
};

function FrameworkTag({ framework = 'openclaw' }: { framework?: string }) {
  const meta = FRAMEWORK_META[framework] ?? FRAMEWORK_META.openclaw;
  return <span className={`fw-tag ${meta.style}`}>{meta.label}</span>;
}

// ── Admin agent type ─────────────────────────────────────────
type AdminAgent = Agent & { ownerUsername?: string; ownerWallet: string | null };

// ═════════════════════════════════════════════════════════════
// Admin Page
// ═════════════════════════════════════════════════════════════
export default function AdminPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [stats, setStats] = useState<{
    totalUsers: number;
    totalAgents: number;
    activeAgents: number;
    totalFeaturesUnlocked: number;
    totalPayments: number;
    totalRevenueUsd: number;
    totalMessages: number;
    newUsersLast7d: number;
  } | null>(null);
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [users, setUsers] = useState<Array<{
    id: string;
    email: string;
    username: string;
    walletAddress: string | null;
    tier: string;
    isAdmin: boolean;
    agentCount: number;
    paymentCount: number;
    hatchCredits: number;
    createdAt: string;
  }>>([]);
  const [tickets, setTickets] = useState<Array<{
    id: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    userUsername: string;
    userEmail: string;
    userWallet: string | null;
    agentName: string | null;
    messages: Array<{ role: string; content: string; timestamp: string }>;
    createdAt: string;
    updatedAt: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'agents' | 'users' | 'tickets' | 'health'>('agents');
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Action in-progress tracking
  const [actionInProgress, setActionInProgress] = useState<Record<string, string>>({});

  // Health monitoring state
  const [health, setHealth] = useState<{
    api: { status: string; uptime: number; memory: { used: number; total: number } };
    database: { status: string; connectionCount: number };
    redis: { status: string; usedMemory: string; connectedClients: number };
    docker: { status: string; containersRunning: number; containersTotal: number };
    services: Array<{ name: string; status: string; uptime: string; restarts: number }>;
    disk: { used: string; total: string; percent: number };
    ram: { total: string; used: string; available: string; percent: number };
    cpu: { cores: number; model: string; load1m: string; load5m: string; load15m: string; percent: number };
    backup: { lastBackup: string | null; lastSize: string | null };
  } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backups, setBackups] = useState<Array<{ filename: string; size: string; date: string }>>([]);

  const isAdmin = user?.isAdmin ?? false;

  // ── Fetch data ─────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    setLoading(true);
    setError(null);

    Promise.all([api.adminGetStats(), api.adminGetAgents(), api.adminGetUsers(), api.adminGetTickets()])
      .then(([statsRes, agentsRes, usersRes, ticketsRes]) => {
        setLoading(false);
        if (statsRes.success) setStats(statsRes.data);
        else setError(statsRes.error);

        if (agentsRes.success) setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : (agentsRes.data as any).agents ?? []);
        else setError((prev) => prev ?? agentsRes.error);

        if (usersRes.success) setUsers(Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data as any).users ?? []);
        else setError((prev) => prev ?? usersRes.error);

        if (ticketsRes.success) setTickets((ticketsRes.data as any).tickets ?? []);
      })
      .catch(() => {
        setLoading(false);
        setError('Failed to load admin data');
      });
  }, [isAuthenticated, isAdmin]);

  // ── Fetch health data when Health tab is active ────────────
  useEffect(() => {
    if (!isAuthenticated || !isAdmin || activeTab !== 'health') return;

    async function fetchHealth() {
      setHealthLoading(true);
      const [healthRes, backupsRes] = await Promise.all([api.adminGetHealth(), api.adminGetBackups()]);
      if (healthRes.success) setHealth(healthRes.data);
      if (backupsRes.success) setBackups(backupsRes.data.backups);
      setHealthLoading(false);
    }

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isAdmin, activeTab]);

  // ── Backup handler ──────────────────────────────────────────
  async function handleRunBackup() {
    if (!confirm('Run a database backup now?')) return;
    setBackupRunning(true);
    const res = await api.adminRunBackup();
    setBackupRunning(false);
    if (res.success) {
      alert('Backup completed successfully!');
      // Refresh health + backups
      const [healthRes, backupsRes] = await Promise.all([api.adminGetHealth(), api.adminGetBackups()]);
      if (healthRes.success) setHealth(healthRes.data);
      if (backupsRes.success) setBackups(backupsRes.data.backups);
    } else {
      alert(`Backup failed: ${(res as any).error ?? 'Unknown error'}`);
    }
  }

  // ── Filtered agents ────────────────────────────────────────
  const filteredAgents = useMemo(() => {
    let result = agents;

    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.status.toLowerCase().includes(q) ||
          a.framework.toLowerCase().includes(q) ||
          (a.ownerUsername ?? a.ownerWallet ?? '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [agents, statusFilter, searchQuery]);

  // ── Analytics computations ──────────────────────────────────
  const frameworkDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    agents.forEach((a) => {
      const fw = a.framework || 'openclaw';
      counts[fw] = (counts[fw] || 0) + 1;
    });
    const total = agents.length || 1;
    return Object.entries(FRAMEWORK_META).map(([key, meta]) => ({
      key,
      label: meta.label,
      color: meta.color,
      count: counts[key] || 0,
      percent: Math.round(((counts[key] || 0) / total) * 100),
    }));
  }, [agents]);

  const tierDistribution = useMemo(() => {
    const counts: Record<string, number> = { free: 0, starter: 0, pro: 0, business: 0 };
    users.forEach((u) => {
      const t = (u.tier || 'free').toLowerCase();
      counts[t] = (counts[t] || 0) + 1;
    });
    const total = users.length || 1;
    return [
      { key: 'free', label: 'Free', color: '#6B7280', count: counts.free, percent: Math.round((counts.free / total) * 100) },
      { key: 'starter', label: 'Starter', color: '#60A5FA', count: counts.starter, percent: Math.round((counts.starter / total) * 100) },
      { key: 'pro', label: 'Pro', color: '#FBBF24', count: counts.pro, percent: Math.round((counts.pro / total) * 100) },
      { key: 'business', label: 'Business', color: '#F472B6', count: counts.business, percent: Math.round((counts.business / total) * 100) },
    ];
  }, [users]);

  const recentAgents = useMemo(() => agents.slice(0, 10), [agents]);
  const recentUsers = useMemo(() => users.slice(0, 10), [users]);

  // ── Action handlers ────────────────────────────────────────
  async function handleKill(agentId: string) {
    if (!confirm('Force-kill this agent? This will remove its container and set status to killed.')) return;

    setActionInProgress((prev) => ({ ...prev, [agentId]: 'kill' }));
    const res = await api.adminKillAgent(agentId);
    setActionInProgress((prev) => {
      const next = { ...prev };
      delete next[agentId];
      return next;
    });

    if (res.success) {
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, status: 'killed', containerId: null } : a))
      );
      if (stats) setStats({ ...stats, activeAgents: Math.max(0, stats.activeAgents - 1) });
    } else {
      alert(`Kill failed: ${res.error}`);
    }
  }

  async function handlePause(agentId: string) {
    if (!confirm('Pause this agent? This will stop its container.')) return;

    setActionInProgress((prev) => ({ ...prev, [agentId]: 'pause' }));
    const res = await api.adminPauseAgent(agentId);
    setActionInProgress((prev) => {
      const next = { ...prev };
      delete next[agentId];
      return next;
    });

    if (res.success) {
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, status: 'paused' } : a))
      );
      if (stats) setStats({ ...stats, activeAgents: Math.max(0, stats.activeAgents - 1) });
    } else {
      alert(`Pause failed: ${res.error}`);
    }
  }

  async function handleRefresh() {
    setLoading(true);
    setError(null);
    const [statsRes, agentsRes, usersRes, ticketsRes] = await Promise.all([api.adminGetStats(), api.adminGetAgents(), api.adminGetUsers(), api.adminGetTickets()]);
    setLoading(false);
    if (statsRes.success) setStats(statsRes.data);
    if (agentsRes.success) setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : (agentsRes.data as any).agents ?? []);
    if (usersRes.success) setUsers(Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data as any).users ?? []);
    if (ticketsRes.success) setTickets((ticketsRes.data as any).tickets ?? []);
  }

  async function handleUpdateTicketStatus(ticketId: string, status: string) {
    try {
      const res = await api.adminUpdateTicketStatus(ticketId, status);
      if (res.success) {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
      } else {
        alert(`Failed to update status: ${(res as any).error ?? 'Unknown error'}`);
      }
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#06b6d4] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="text-center max-w-md px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-20 h-20 rounded-2xl bg-[#06b6d4]/15 flex items-center justify-center mx-auto mb-6">
            <Zap size={40} className="text-[#06b6d4]" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
            Sign In Required
          </h1>
          <p className="mb-8 text-sm text-[var(--text-secondary)]">
            Sign in to your account to access admin controls.
          </p>
          <a href="/login" className="btn-primary px-8 py-3 inline-block">
            Sign In
          </a>
        </motion.div>
      </div>
    );
  }

  // ── Not admin ──────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="text-center max-w-md px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-20 h-20 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={40} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
            Access Denied
          </h1>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            Your account does not have admin privileges.
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────
  if (loading && !stats) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-10">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card glass-noise p-5 animate-pulse">
                <div className="h-4 rounded w-24 mb-4 shimmer" />
                <div className="h-8 rounded w-16 shimmer" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card glass-noise p-5 animate-pulse">
                <div className="h-4 rounded w-24 mb-4 shimmer" />
                <div className="h-8 rounded w-16 shimmer" />
              </div>
            ))}
          </div>
          <div className="card glass-noise p-5 animate-pulse">
            <div className="h-6 rounded w-40 mb-6 shimmer" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 rounded mb-2 shimmer" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Main admin dashboard ───────────────────────────────────
  return (
    <motion.div
      className="min-h-screen p-4 sm:p-6 lg:p-10"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Header ────────────────────────────────────────── */}
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          variants={cardVariants}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#06b6d4]/15 flex items-center justify-center flex-shrink-0">
              <Shield size={20} className="text-[#06b6d4]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Admin Panel
              </h1>
              <p className="text-sm mt-0.5 text-[var(--text-secondary)]">
                Platform management and controls
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="btn-secondary text-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </motion.div>

        {/* ── Stat Cards ────────────────────────────────────── */}
        {stats && (
          <div className="space-y-4">
            {/* Top row — 3 cols */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Total Users"
                value={stats.totalUsers}
                icon={Users}
                iconColor="#06b6d4"
              />
              <StatCard
                label="Total Agents"
                value={stats.totalAgents}
                icon={Bot}
                iconColor="#60A5FA"
              />
              <StatCard
                label="Active Agents"
                value={stats.activeAgents}
                icon={Activity}
                iconColor="#4ADE80"
              />
            </div>
            {/* Bottom row — 4 cols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Payments"
                value={stats.totalPayments}
                icon={DollarSign}
                iconColor="#FBBF24"
              />
              <StatCard
                label="Revenue"
                value={`$${stats.totalRevenueUsd.toFixed(2)}`}
                icon={Wallet}
                iconColor="#4ADE80"
              />
              <StatCard
                label="Messages"
                value={stats.totalMessages}
                icon={MessageSquare}
                iconColor="#60A5FA"
              />
              <StatCard
                label="New Users 7d"
                value={stats.newUsersLast7d}
                icon={UserPlus}
                iconColor="#06b6d4"
              />
            </div>
          </div>
        )}

        {/* ── Analytics Dashboard ─────────────────────────────── */}
        {stats && agents.length + users.length > 0 && (
          <div className="space-y-4">
            {/* ROW 2 — Framework + Tier Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Framework Distribution */}
              <motion.div className="card glass-noise p-5" variants={cardVariants}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#06b6d4]/12 flex items-center justify-center flex-shrink-0">
                    <BarChart3 size={16} className="text-[#06b6d4]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Framework Distribution</h3>
                    <p className="text-[10px] text-[var(--text-muted)]">{agents.length} total agents</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {frameworkDistribution.map((fw) => (
                    <div key={fw.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: fw.color }}
                          />
                          <span className="text-xs font-medium text-[var(--text-primary)]">{fw.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[var(--text-secondary)]">{fw.count}</span>
                          <span className="text-[10px] text-[var(--text-muted)] w-8 text-right">{fw.percent}%</span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[rgba(46,43,74,0.4)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${fw.percent}%`, backgroundColor: fw.color, minWidth: fw.count > 0 ? '4px' : '0' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Tier Distribution */}
              <motion.div className="card glass-noise p-5" variants={cardVariants}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#FBBF24]/12 flex items-center justify-center flex-shrink-0">
                    <PieChart size={16} className="text-[#FBBF24]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tier Distribution</h3>
                    <p className="text-[10px] text-[var(--text-muted)]">{users.length} total users</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {tierDistribution.map((tier) => (
                    <div key={tier.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tier.color }}
                          />
                          <span className="text-xs font-medium text-[var(--text-primary)]">{tier.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[var(--text-secondary)]">{tier.count}</span>
                          <span className="text-[10px] text-[var(--text-muted)] w-8 text-right">{tier.percent}%</span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[rgba(46,43,74,0.4)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${tier.percent}%`, backgroundColor: tier.color, minWidth: tier.count > 0 ? '4px' : '0' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stacked overview bar */}
                <div className="mt-4 pt-3 border-t border-[var(--border-default)]">
                  <p className="text-[10px] text-[var(--text-muted)] mb-2 uppercase tracking-wider font-semibold">Overview</p>
                  <div className="w-full h-4 rounded-full bg-[rgba(46,43,74,0.4)] overflow-hidden flex">
                    {tierDistribution.map((tier) => (
                      tier.count > 0 && (
                        <div
                          key={tier.key}
                          className="h-full transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full"
                          style={{ width: `${tier.percent}%`, backgroundColor: tier.color, minWidth: '4px' }}
                          title={`${tier.label}: ${tier.count} (${tier.percent}%)`}
                        />
                      )
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ROW 3 — Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent Agent Creates */}
              <motion.div className="card glass-noise p-5" variants={cardVariants}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#4ADE80]/12 flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={16} className="text-[#4ADE80]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Agents</h3>
                    <p className="text-[10px] text-[var(--text-muted)]">Last 10 created</p>
                  </div>
                </div>
                {recentAgents.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-4 text-center">No agents yet.</p>
                ) : (
                  <div className="space-y-0">
                    {recentAgents.map((agent, i) => (
                      <div
                        key={agent.id}
                        className={`flex items-center justify-between py-2.5 ${i < recentAgents.length - 1 ? 'border-b border-[var(--border-default)]' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-lg bg-[#06b6d4]/10 flex items-center justify-center flex-shrink-0">
                            <Bot size={12} className="text-[#06b6d4]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{agent.name}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">
                              by {agent.ownerUsername || 'unknown'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <FrameworkTag framework={agent.framework} />
                          <span className="text-[10px] text-[var(--text-muted)] w-16 text-right">{timeAgo(agent.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Recent User Signups */}
              <motion.div className="card glass-noise p-5" variants={cardVariants}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#A855F7]/12 flex items-center justify-center flex-shrink-0">
                    <UserPlus size={16} className="text-[#A855F7]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Signups</h3>
                    <p className="text-[10px] text-[var(--text-muted)]">Last 10 users</p>
                  </div>
                </div>
                {recentUsers.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-4 text-center">No users yet.</p>
                ) : (
                  <div className="space-y-0">
                    {recentUsers.map((u, i) => (
                      <div
                        key={u.id}
                        className={`flex items-center justify-between py-2.5 ${i < recentUsers.length - 1 ? 'border-b border-[var(--border-default)]' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-lg bg-[#A855F7]/10 flex items-center justify-center flex-shrink-0">
                            <Users size={12} className="text-[#A855F7]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{u.username}</p>
                            <p className="text-[10px] text-[var(--text-muted)] truncate">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase ${
                            u.tier === 'pro'
                              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                              : u.tier === 'business'
                              ? 'text-pink-400 bg-pink-500/10 border-pink-500/20'
                              : u.tier === 'starter'
                              ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                              : 'text-[var(--text-muted)] bg-[rgba(46,43,74,0.3)] border-[var(--border-default)]'
                          }`}>
                            {u.tier || 'free'}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] w-16 text-right">{timeAgo(u.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}

        {/* ── Tab Switcher + Table Area ─────────────────────── */}
        <motion.div className="card glass-noise p-5" variants={cardVariants}>
          {/* Tab switcher */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[rgba(46,43,74,0.3)]">
              {(['agents', 'users', 'tickets', 'health'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2 ${
                    activeTab === tab
                      ? 'text-[var(--text-primary)] bg-[#06b6d4]/20'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab === 'agents' ? <Bot size={14} /> : tab === 'users' ? <Users size={14} /> : tab === 'tickets' ? <Ticket size={14} /> : <HeartPulse size={14} />}
                  {tab === 'agents' ? 'Agents' : tab === 'users' ? 'Users' : tab === 'tickets' ? `Tickets${tickets.length ? ` (${tickets.length})` : ''}` : 'Health'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Agents Tab ──────────────────────────────────── */}
          {activeTab === 'agents' && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  All Agents
                  <span className="text-sm font-normal ml-2 text-[var(--text-muted)]">
                    ({filteredAgents.length})
                  </span>
                </h2>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                  {/* Status filters */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[rgba(46,43,74,0.3)]">
                    {STATUS_FILTERS.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setStatusFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                          statusFilter === f.key
                            ? 'text-[var(--text-primary)] bg-[#06b6d4]/20'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="flex items-center gap-2 flex-1 sm:flex-initial rounded-xl px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] transition-all duration-200 focus-within:border-[rgba(6,182,212,0.4)]">
                    <Search size={16} className="text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search agents, wallets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent outline-none text-sm w-full sm:w-56 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                </div>
              </div>

              {/* Agents Table */}
              {filteredAgents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Bot size={40} className="text-[var(--text-muted)] mb-3 opacity-40" />
                  <p className="text-sm text-[var(--text-muted)]">
                    {agents.length === 0 ? 'No agents on the platform yet.' : 'No agents match your filters.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--border-default)]">
                        {['Agent', 'Owner', 'Framework', 'Status', 'Created', 'Actions'].map(
                          (header) => (
                            <th
                              key={header}
                              className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                            >
                              {header}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAgents.map((agent) => {
                        const inProgress = actionInProgress[agent.id];
                        return (
                          <tr
                            key={agent.id}
                            className="transition-colors hover:bg-[var(--bg-card)] border-b border-[var(--border-default)]"
                          >
                            {/* Agent name */}
                            <td className="py-3.5 pr-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#06b6d4]/12 flex items-center justify-center flex-shrink-0">
                                  <Bot size={14} className="text-[#06b6d4]" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate max-w-[180px] text-[var(--text-primary)]">
                                    {agent.name}
                                  </p>
                                  <p className="text-xs font-mono truncate max-w-[180px] text-[var(--text-muted)]">
                                    {agent.id.slice(0, 8)}...
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Owner wallet */}
                            <td className="py-3.5 pr-4">
                              <span className="text-xs font-mono px-2 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                                {agent.ownerUsername ?? shortenAddress(agent.ownerWallet ?? '', 4)}
                              </span>
                            </td>

                            {/* Framework */}
                            <td className="py-3.5 pr-4">
                              <FrameworkTag framework={agent.framework} />
                            </td>

                            {/* Status */}
                            <td className="py-3.5 pr-4">
                              <StatusBadge status={agent.status} />
                            </td>

                            {/* Created */}
                            <td className="py-3.5 pr-4">
                              <span className="text-xs text-[var(--text-muted)]">
                                {timeAgo(agent.createdAt)}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5">
                              <div className="flex items-center gap-2">
                                {/* Pause button */}
                                <button
                                  onClick={() => handlePause(agent.id)}
                                  disabled={
                                    agent.status === 'paused' ||
                                    agent.status === 'killed' ||
                                    agent.status === 'sleeping' ||
                                    agent.status === 'restarting' ||
                                    !!inProgress
                                  }
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20"
                                  title="Pause agent"
                                >
                                  {inProgress === 'pause' ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                  ) : (
                                    <Pause size={12} />
                                  )}
                                  Pause
                                </button>

                                {/* Kill button */}
                                <button
                                  onClick={() => handleKill(agent.id)}
                                  disabled={agent.status === 'killed' || !!inProgress}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20"
                                  title="Kill agent"
                                >
                                  {inProgress === 'kill' ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                  ) : (
                                    <XCircle size={12} />
                                  )}
                                  Kill
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Users Tab ───────────────────────────────────── */}
          {activeTab === 'users' && (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  All Users
                  <span className="text-sm font-normal ml-2 text-[var(--text-muted)]">
                    ({users.length})
                  </span>
                </h2>
              </div>

              {users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Users size={40} className="text-[var(--text-muted)] mb-3 opacity-40" />
                  <p className="text-sm text-[var(--text-muted)]">No users on the platform yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--border-default)]">
                        {['Wallet', 'Agents', 'Payments', 'Credits', 'Joined'].map(
                          (header) => (
                            <th
                              key={header}
                              className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                            >
                              {header}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="transition-colors hover:bg-[var(--bg-card)] border-b border-[var(--border-default)]"
                        >
                          {/* User */}
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#06b6d4]/12 flex items-center justify-center flex-shrink-0">
                                <Users size={14} className="text-[#06b6d4]" />
                              </div>
                              <div>
                                <span className="text-xs font-medium text-[var(--text-primary)] block">{user.username}</span>
                                <span className="text-[10px] text-[var(--text-muted)]">{user.email}</span>
                              </div>
                              {user.isAdmin && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 uppercase">Admin</span>
                              )}
                            </div>
                          </td>

                          {/* Agent count */}
                          <td className="py-3.5 pr-4">
                            <span className="text-sm text-[var(--text-primary)]">
                              {user.agentCount}
                            </span>
                          </td>

                          {/* Payment count */}
                          <td className="py-3.5 pr-4">
                            <span className="text-sm text-[var(--text-primary)]">
                              {user.paymentCount}
                            </span>
                          </td>

                          {/* Credits */}
                          <td className="py-3.5 pr-4">
                            <span className="text-sm font-mono text-[var(--text-primary)]">
                              {user.hatchCredits.toFixed(2)}
                            </span>
                          </td>

                          {/* Joined */}
                          <td className="py-3.5 pr-4">
                            <span className="text-xs text-[var(--text-muted)]">
                              {timeAgo(user.createdAt)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Tickets Tab ──────────────────────────────────── */}
          {activeTab === 'tickets' && (() => {
            const TICKET_FILTERS = ['all', 'open', 'in_progress', 'resolved'] as const;
            const filteredTickets = ticketFilter === 'all' ? tickets : tickets.filter(t => t.status === ticketFilter);
            const statusColors: Record<string, string> = {
              open: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
              in_progress: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
              resolved: 'text-green-400 bg-green-500/10 border-green-500/20',
            };
            const priorityColors: Record<string, string> = {
              urgent: 'text-red-400',
              high: 'text-amber-400',
              normal: 'text-[var(--text-secondary)]',
              low: 'text-[var(--text-muted)]',
            };
            return (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    Support Tickets
                    <span className="text-sm font-normal ml-2 text-[var(--text-muted)]">({filteredTickets.length})</span>
                  </h2>
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[rgba(46,43,74,0.3)]">
                    {TICKET_FILTERS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setTicketFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 capitalize ${
                          ticketFilter === f
                            ? 'text-[var(--text-primary)] bg-[#06b6d4]/20'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {f === 'all' ? 'All' : f.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Ticket size={40} className="text-[var(--text-muted)] mb-3 opacity-40" />
                    <p className="text-sm text-[var(--text-muted)]">
                      {tickets.length === 0 ? 'No support tickets yet.' : 'No tickets match this filter.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[var(--border-default)]">
                          {['Subject', 'User', 'Category', 'Priority', 'Status', 'Updated', ''].map((h) => (
                            <th key={h} className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTickets.map((ticket) => (
                          <tr key={ticket.id} className="transition-colors hover:bg-[var(--bg-card)] border-b border-[var(--border-default)]">
                            <td className="py-3.5 pr-4">
                              <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[250px]">{ticket.subject}</p>
                              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{ticket.messages.length} message{ticket.messages.length !== 1 ? 's' : ''}</p>
                            </td>
                            <td className="py-3.5 pr-4">
                              <span className="text-xs font-medium px-2 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                                {ticket.userUsername}
                              </span>
                            </td>
                            <td className="py-3.5 pr-4">
                              <span className="text-xs text-[var(--text-muted)] capitalize">{ticket.category.replace('_', ' ')}</span>
                            </td>
                            <td className="py-3.5 pr-4">
                              <span className={`text-xs font-medium capitalize ${priorityColors[ticket.priority] ?? ''}`}>{ticket.priority}</span>
                            </td>
                            <td className="py-3.5 pr-4">
                              <select
                                value={ticket.status}
                                onChange={(e) => handleUpdateTicketStatus(ticket.id, e.target.value)}
                                className={`text-[10px] font-semibold px-2 py-1 rounded-full border capitalize cursor-pointer appearance-none bg-transparent ${statusColors[ticket.status] ?? statusColors.open}`}
                              >
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                              </select>
                            </td>
                            <td className="py-3.5 pr-4">
                              <span className="text-xs text-[var(--text-muted)]">{timeAgo(ticket.updatedAt)}</span>
                            </td>
                            <td className="py-3.5">
                              <a
                                href={`/admin/tickets/${ticket.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/20 hover:bg-[#06b6d4]/20 transition-colors"
                              >
                                Open
                                <ExternalLink size={10} />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            );
          })()}

          {/* ── Health Tab ──────────────────────────────────── */}
          {activeTab === 'health' && (() => {
            const statusDot = (status: string) => (
              <span className={`w-2.5 h-2.5 rounded-full inline-block ${status === 'healthy' || status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
            );

            if (healthLoading && !health) {
              return (
                <div className="flex flex-col items-center justify-center py-16">
                  <RefreshCw size={24} className="text-[var(--text-muted)] animate-spin mb-3" />
                  <p className="text-sm text-[var(--text-muted)]">Loading health data...</p>
                </div>
              );
            }

            if (!health) {
              return (
                <div className="flex flex-col items-center justify-center py-16">
                  <HeartPulse size={40} className="text-[var(--text-muted)] mb-3 opacity-40" />
                  <p className="text-sm text-[var(--text-muted)]">No health data available.</p>
                </div>
              );
            }

            return (
              <div className="space-y-6">
                {/* Auto-refresh indicator */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">System Health</h2>
                  <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Auto-refreshing every 30s
                  </span>
                </div>

                {/* Service status cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* API */}
                  <div className="rounded-xl border border-[var(--border-default)] p-4 bg-[var(--bg-elevated)]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Server size={16} className="text-[#06b6d4]" />
                        <span className="text-sm font-semibold text-[var(--text-primary)]">API</span>
                      </div>
                      {statusDot(health.api.status)}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)]">Uptime</span>
                        <span className="text-[var(--text-secondary)]">{Math.floor(health.api.uptime / 3600)}h {Math.floor((health.api.uptime % 3600) / 60)}m</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)]">Memory</span>
                        <span className="text-[var(--text-secondary)]">{health.api.memory.used}MB / {health.api.memory.total}MB</span>
                      </div>
                    </div>
                  </div>

                  {/* Database */}
                  <div className="rounded-xl border border-[var(--border-default)] p-4 bg-[var(--bg-elevated)]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Database size={16} className="text-[#60A5FA]" />
                        <span className="text-sm font-semibold text-[var(--text-primary)]">Database</span>
                      </div>
                      {statusDot(health.database.status)}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)]">Connections</span>
                        <span className="text-[var(--text-secondary)]">{health.database.connectionCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Redis */}
                  <div className="rounded-xl border border-[var(--border-default)] p-4 bg-[var(--bg-elevated)]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Zap size={16} className="text-[#FBBF24]" />
                        <span className="text-sm font-semibold text-[var(--text-primary)]">Redis</span>
                      </div>
                      {statusDot(health.redis.status)}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)]">Memory</span>
                        <span className="text-[var(--text-secondary)]">{health.redis.usedMemory}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)]">Clients</span>
                        <span className="text-[var(--text-secondary)]">{health.redis.connectedClients}</span>
                      </div>
                    </div>
                  </div>

                  {/* Docker */}
                  <div className="rounded-xl border border-[var(--border-default)] p-4 bg-[var(--bg-elevated)]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Layers size={16} className="text-[#4ADE80]" />
                        <span className="text-sm font-semibold text-[var(--text-primary)]">Docker</span>
                      </div>
                      {statusDot(health.docker.status)}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)]">Running</span>
                        <span className="text-[var(--text-secondary)]">{health.docker.containersRunning}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)]">Total</span>
                        <span className="text-[var(--text-secondary)]">{health.docker.containersTotal}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Disk usage bar */}
                <div className="rounded-xl border border-[var(--border-default)] p-4 bg-[var(--bg-elevated)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <HardDrive size={16} className="text-[var(--text-muted)]" />
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Disk Usage</span>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">{health.disk.used} / {health.disk.total}</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[rgba(46,43,74,0.4)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        health.disk.percent > 90 ? 'bg-red-500' : health.disk.percent > 70 ? 'bg-amber-500' : 'bg-[#06b6d4]'
                      }`}
                      style={{ width: `${health.disk.percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] mt-1.5 block">{health.disk.percent}% used</span>
                </div>

                {/* Memory bar */}
                <div className="rounded-xl border border-[var(--border-default)] p-4 bg-[var(--bg-elevated)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity size={16} className="text-[var(--text-muted)]" />
                      <span className="text-sm font-semibold text-[var(--text-primary)]">API Memory</span>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">{health.api.memory.used}MB / {health.api.memory.total}MB</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[rgba(46,43,74,0.4)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#60A5FA] transition-all duration-500"
                      style={{ width: `${health.api.memory.total ? Math.round((health.api.memory.used / health.api.memory.total) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] mt-1.5 block">
                    {health.api.memory.total ? Math.round((health.api.memory.used / health.api.memory.total) * 100) : 0}% used
                  </span>
                </div>

                {/* CPU Load */}
                {health.cpu && (
                <div className="rounded-xl border border-[var(--border-default)] p-4 bg-[var(--bg-elevated)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity size={16} className="text-[var(--text-muted)]" />
                      <span className="text-sm font-semibold text-[var(--text-primary)]">CPU Load</span>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">{health.cpu.load1m} / {health.cpu.cores} cores</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[rgba(46,43,74,0.4)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        health.cpu.percent > 90 ? 'bg-red-500' : health.cpu.percent > 70 ? 'bg-amber-500' : 'bg-[#F59E0B]'
                      }`}
                      style={{ width: `${Math.min(health.cpu.percent, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] mt-1.5 block">{health.cpu.percent}% — load avg: {health.cpu.load1m} / {health.cpu.load5m} / {health.cpu.load15m}</span>
                </div>
                )}

                {/* System RAM */}
                {health.ram && (
                <div className="rounded-xl border border-[var(--border-default)] p-4 bg-[var(--bg-elevated)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity size={16} className="text-[var(--text-muted)]" />
                      <span className="text-sm font-semibold text-[var(--text-primary)]">System RAM</span>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">{health.ram.used} / {health.ram.total}</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[rgba(46,43,74,0.4)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        health.ram.percent > 90 ? 'bg-red-500' : health.ram.percent > 70 ? 'bg-amber-500' : 'bg-[#A78BFA]'
                      }`}
                      style={{ width: `${health.ram.percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] mt-1.5 block">{health.ram.percent}% used — {health.ram.available} available</span>
                </div>
                )}

                {/* PM2 Process List */}
                <div className="rounded-xl border border-[var(--border-default)] p-4 bg-[var(--bg-elevated)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <Server size={16} className="text-[var(--text-muted)]" />
                    PM2 Processes
                  </h3>
                  {health.services.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">No PM2 processes found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-[var(--border-default)]">
                            {['Process', 'Status', 'Uptime', 'Restarts'].map(h => (
                              <th key={h} className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {health.services.map((svc) => (
                            <tr key={svc.name} className="border-b border-[var(--border-default)] last:border-b-0">
                              <td className="py-2.5 pr-4">
                                <span className="text-xs font-medium text-[var(--text-primary)]">{svc.name}</span>
                              </td>
                              <td className="py-2.5 pr-4">
                                <span className="flex items-center gap-1.5">
                                  {statusDot(svc.status)}
                                  <span className={`text-xs font-medium capitalize ${svc.status === 'online' ? 'text-green-400' : 'text-red-400'}`}>{svc.status}</span>
                                </span>
                              </td>
                              <td className="py-2.5 pr-4">
                                <span className="text-xs text-[var(--text-secondary)]">{svc.uptime}</span>
                              </td>
                              <td className="py-2.5 pr-4">
                                <span className={`text-xs font-mono ${svc.restarts > 0 ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>{svc.restarts}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Backup Section */}
                <div className="rounded-xl border border-[var(--border-default)] p-4 bg-[var(--bg-elevated)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <Database size={16} className="text-[var(--text-muted)]" />
                      Database Backups
                    </h3>
                    <button
                      onClick={handleRunBackup}
                      disabled={backupRunning}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/20 hover:bg-[#06b6d4]/20 transition-colors disabled:opacity-40"
                    >
                      {backupRunning ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                      {backupRunning ? 'Running...' : 'Run Backup Now'}
                    </button>
                  </div>

                  {health.backup.lastBackup && (
                    <div className="flex items-center gap-4 mb-3 text-xs text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1.5">
                        <Clock size={12} className="text-[var(--text-muted)]" />
                        Last: {health.backup.lastBackup}
                      </span>
                      {health.backup.lastSize && (
                        <span className="flex items-center gap-1.5">
                          <HardDrive size={12} className="text-[var(--text-muted)]" />
                          Size: {health.backup.lastSize}
                        </span>
                      )}
                    </div>
                  )}

                  {backups.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">No backups found. Run your first backup above.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-[var(--border-default)]">
                            {['Filename', 'Size', 'Date'].map(h => (
                              <th key={h} className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {backups.map((b) => (
                            <tr key={b.filename} className="border-b border-[var(--border-default)] last:border-b-0">
                              <td className="py-2 pr-4">
                                <span className="text-xs font-mono text-[var(--text-primary)]">{b.filename}</span>
                              </td>
                              <td className="py-2 pr-4">
                                <span className="text-xs text-[var(--text-secondary)]">{b.size}</span>
                              </td>
                              <td className="py-2 pr-4">
                                <span className="text-xs text-[var(--text-muted)]">{b.date}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </motion.div>

        {/* ── Error display ─────────────────────────────────── */}
        {error && (
          <motion.div
            className="card glass-noise p-5 border-l-4 border-red-500"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-red-400" />
              <p className="text-sm text-red-400">
                {error}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
