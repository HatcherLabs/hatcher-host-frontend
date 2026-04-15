'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
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
  Download,
  Play,
  BarChart3,
  TrendingUp,
  PieChart,
  Calendar,
  Sunrise,
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
    <motion.div className="card glass-noise p-3 sm:p-5" variants={cardVariants}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.08em] font-semibold block mb-1 sm:mb-2 text-[var(--text-muted)] truncate">
            {label}
          </span>
          <span className="text-lg sm:text-[28px] leading-[1.1] font-bold block text-[var(--text-primary)] truncate">
            {value}
          </span>
        </div>
        <div
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconColor + '18' }}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: iconColor }} />
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
  elizaos: { label: 'ElizaOS', color: 'var(--color-accent)', style: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25' },
  milady: { label: 'Milady', color: '#f43f5e', style: 'bg-rose-500/10 text-rose-400 border-rose-500/25' },
};

function FrameworkTag({ framework = 'openclaw' }: { framework?: string }) {
  const meta = FRAMEWORK_META[framework] ?? FRAMEWORK_META.openclaw;
  return <span className={`fw-tag ${meta.style}`}>{meta.label}</span>;
}

// ── Tier badge ──────────────────────────────────────────────
const TIER_STYLES: Record<string, string> = {
  free: 'text-[var(--text-muted)] bg-[rgba(46,43,74,0.3)] border-[var(--border-default)]',
  starter: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  pro: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  business: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  founding_member: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  banned: 'text-red-400 bg-red-500/10 border-red-500/20',
};
function TierBadge({ tier }: { tier: string }) {
  const style = TIER_STYLES[tier] ?? TIER_STYLES.free;
  const label = tier === 'founding_member' ? 'Founding' : (tier || 'free');
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase ${style}`}>
      {label}
    </span>
  );
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
    newUsersToday?: number;
    newAgentsToday?: number;
    revenueToday?: number;
    revenueWeek?: number;
    frameworkDistribution?: Record<string, number>;
    tierBreakdown?: Record<string, number>;
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
    emailVerified: boolean;
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
  const [loadingMoreAgents, setLoadingMoreAgents] = useState(false);
  const [agentsPagination, setAgentsPagination] = useState<{ total: number; hasMore: boolean }>({ total: 0, hasMore: false });
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'users' | 'tickets' | 'purchases' | 'health'>('overview');
  const [payments, setPayments] = useState<Array<{
    id: string;
    userId: string;
    userEmail: string | null;
    userUsername: string | null;
    agentId: string | null;
    agentName: string | null;
    agentFramework: string | null;
    featureKey: string;
    usdAmount: number;
    hatchAmount: number;
    txSignature: string;
    status: string;
    createdAt: string;
  }>>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userTierFilter, setUserTierFilter] = useState<string>('all');
  const [userSortBy, setUserSortBy] = useState<'createdAt' | 'agentCount' | 'paymentCount' | 'hatchCredits'>('createdAt');
  const [userSortDir, setUserSortDir] = useState<'asc' | 'desc'>('desc');
  const [frameworkFilter, setFrameworkFilter] = useState<string>('all');

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

  // ── User detail slide-over ─────────────────────────────────
  type UserDetail = {
    id: string; email: string; username: string; walletAddress: string | null;
    tier: string; isAdmin: boolean; hatchCredits: number; emailVerified: boolean;
    createdAt: string;
    features: Array<{ id: string; featureKey: string; type: string; expiresAt: string | null; createdAt: string; txSignature: string; usdPrice: number }>;
    payments: Array<{ id: string; featureKey: string; usdAmount: number; txSignature: string; status: string; createdAt: string; agentId: string | null }>;
    agents: Array<{ id: string; name: string; framework: string; status: string; createdAt: string }>;
  };

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);

  const isAdmin = user?.isAdmin ?? false;

  // ── Fetch data ─────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    setLoading(true);
    setError(null);

    Promise.all([api.adminGetStats(), api.adminGetAgents(50), api.adminGetUsers(), api.adminGetTickets()])
      .then(([statsRes, agentsRes, usersRes, ticketsRes]) => {
        setLoading(false);
        if (statsRes.success) setStats(statsRes.data);
        else setError(statsRes.error);

        if (agentsRes.success) {
          const agentsData = (agentsRes.data);
          setAgents(Array.isArray(agentsData) ? agentsData : agentsData.agents ?? []);
          if (agentsData.pagination) {
            setAgentsPagination({ total: agentsData.pagination.total, hasMore: agentsData.pagination.hasMore });
          }
        } else setError((prev) => prev ?? agentsRes.error);

        if (usersRes.success) setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.users ?? []);
        else setError((prev) => prev ?? usersRes.error);

        if (ticketsRes.success) setTickets(ticketsRes.data.tickets ?? []);
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

  // ── Lazy-load payments when the Purchases tab is opened ──────
  useEffect(() => {
    if (!isAuthenticated || !isAdmin || activeTab !== 'purchases') return;
    if (payments.length > 0) return;
    setPaymentsLoading(true);
    api.adminGetPayments().then((res) => {
      if (res.success) setPayments(res.data.payments ?? []);
      setPaymentsLoading(false);
    });
  }, [isAuthenticated, isAdmin, activeTab, payments.length]);

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
      alert(`Backup failed: ${res.error ?? 'Unknown error'}`);
    }
  }

  // ── Load more agents ───────────────────────────────────────
  async function handleLoadMoreAgents() {
    setLoadingMoreAgents(true);
    const res = await api.adminGetAgents(50, agents.length);
    setLoadingMoreAgents(false);
    if (res.success) {
      const data = res.data;
      setAgents((prev) => [...prev, ...(data.agents ?? [])]);
      if (data.pagination) {
        setAgentsPagination({ total: data.pagination.total, hasMore: data.pagination.hasMore });
      }
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
    // Prefer server-side stats (covers ALL agents) over client-side (paginated)
    const counts: Record<string, number> = stats?.frameworkDistribution ?? {};
    if (!stats?.frameworkDistribution) {
      agents.forEach((a) => {
        const fw = a.framework || 'openclaw';
        counts[fw] = (counts[fw] || 0) + 1;
      });
    }
    const total = Object.values(counts).reduce((s, c) => s + c, 0) || 1;
    return Object.entries(FRAMEWORK_META).map(([key, meta]) => ({
      key,
      label: meta.label,
      color: meta.color,
      count: counts[key] || 0,
      percent: Math.round(((counts[key] || 0) / total) * 100),
    }));
  }, [agents, stats]);

  const tierDistribution = useMemo(() => {
    // Prefer server-side tierBreakdown (covers ALL users) over client-side (paginated)
    const counts: Record<string, number> = stats?.tierBreakdown
      ? { ...stats.tierBreakdown }
      : { free: 0, starter: 0, pro: 0, business: 0, founding_member: 0 };
    if (!stats?.tierBreakdown) {
      users.forEach((u) => {
        const t = (u.tier || 'free').toLowerCase();
        counts[t] = (counts[t] || 0) + 1;
      });
    }
    const total = Object.values(counts).reduce((s, c) => s + c, 0) || 1;
    return [
      { key: 'free', label: 'Free', color: '#6B7280', count: counts.free ?? 0, percent: Math.round(((counts.free ?? 0) / total) * 100) },
      { key: 'starter', label: 'Starter', color: '#60A5FA', count: counts.starter ?? 0, percent: Math.round(((counts.starter ?? 0) / total) * 100) },
      { key: 'founding_member', label: 'Founding', color: '#A78BFA', count: counts.founding_member ?? 0, percent: Math.round(((counts.founding_member ?? 0) / total) * 100) },
      { key: 'pro', label: 'Pro', color: '#FBBF24', count: counts.pro ?? 0, percent: Math.round(((counts.pro ?? 0) / total) * 100) },
      { key: 'business', label: 'Business', color: '#F472B6', count: counts.business ?? 0, percent: Math.round(((counts.business ?? 0) / total) * 100) },
    ];
  }, [users, stats]);

  const recentAgents = useMemo(() => agents.slice(0, 10), [agents]);
  const recentUsers = useMemo(() => users.slice(0, 10), [users]);

  // ── Filtered + sorted users ────────────────────────────────
  const filteredUsers = useMemo(() => {
    let result = users;

    if (userTierFilter !== 'all') {
      result = result.filter((u) => u.tier === userTierFilter);
    }

    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.walletAddress ?? '').toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      const dir = userSortDir === 'asc' ? 1 : -1;
      if (userSortBy === 'createdAt') return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      if (userSortBy === 'agentCount') return dir * (a.agentCount - b.agentCount);
      if (userSortBy === 'paymentCount') return dir * (a.paymentCount - b.paymentCount);
      if (userSortBy === 'hatchCredits') return dir * (a.hatchCredits - b.hatchCredits);
      return 0;
    });

    return result;
  }, [users, userTierFilter, userSearchQuery, userSortBy, userSortDir]);

  // ── Filtered agents with framework filter ──────────────────
  const frameworkFilteredAgents = useMemo(() => {
    if (frameworkFilter === 'all') return filteredAgents;
    return filteredAgents.filter((a) => a.framework === frameworkFilter);
  }, [filteredAgents, frameworkFilter]);

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
    if (agentsRes.success) setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : agentsRes.data.agents ?? []);
    if (usersRes.success) setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.users ?? []);
    if (ticketsRes.success) setTickets(ticketsRes.data.tickets ?? []);
  }

  async function handleBanUser(userId: string) {
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    const isBanned = u.tier === 'banned';
    if (!confirm(isBanned ? `Unban user "${u.username}"?` : `Ban user "${u.username}"? This will set their tier to banned.`)) return;

    const res = isBanned ? await api.adminUnbanUser(userId) : await api.adminBanUser(userId);
    if (res.success) {
      setUsers((prev) =>
        prev.map((x) => (x.id === userId ? { ...x, tier: isBanned ? 'free' : 'banned' } : x))
      );
      if (userDetail?.id === userId) {
        setUserDetail((prev) => prev ? { ...prev, tier: isBanned ? 'free' : 'banned' } : prev);
      }
    } else {
      alert(`Failed: ${res.error ?? 'Unknown error'}`);
    }
  }

  async function handleUpdateTicketStatus(ticketId: string, status: string) {
    try {
      const res = await api.adminUpdateTicketStatus(ticketId, status);
      if (res.success) {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
      } else {
        alert(`Failed to update status: ${res.error ?? 'Unknown error'}`);
      }
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    }
  }

  async function loadUserDetail(userId: string) {
    setSelectedUserId(userId);
    setUserDetailLoading(true);
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const token = typeof window !== 'undefined' ? localStorage.getItem('hatcher_token') : null;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success) setUserDetail(json.data);
    } finally {
      setUserDetailLoading(false);
    }
  }

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
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="text-center max-w-md px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-20 h-20 rounded-2xl bg-[var(--color-accent)]/15 flex items-center justify-center mx-auto mb-6">
            <Zap size={40} className="text-[var(--color-accent)]" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
            Sign In Required
          </h1>
          <p className="mb-8 text-sm text-[var(--text-secondary)]">
            Sign in to your account to access admin controls.
          </p>
          <Link href="/login" className="btn-primary px-8 py-3 inline-block">
            Sign In
          </Link>
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
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center flex-shrink-0">
              <Shield size={20} className="text-[var(--color-accent)]" />
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

        {/* ── Quick Stats Row (always visible) ────────────────── */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
            <StatCard label="Users" value={stats.totalUsers} icon={Users} iconColor="var(--color-accent)" />
            <StatCard label="Agents" value={stats.totalAgents} icon={Bot} iconColor="#60A5FA" />
            <StatCard label="Active" value={stats.activeAgents} icon={Activity} iconColor="#4ADE80" />
            <StatCard label="Revenue" value={`$${stats.totalRevenueUsd.toFixed(2)}`} icon={DollarSign} iconColor="#FBBF24" />
            <StatCard label="Messages" value={stats.totalMessages} icon={MessageSquare} iconColor="#60A5FA" />
            <StatCard label="Today" value={`+${stats.newUsersToday ?? 0}u / +${stats.newAgentsToday ?? 0}a`} icon={Sunrise} iconColor="#34D399" />
            <StatCard label="Rev 7d" value={`$${(stats.revenueWeek ?? 0).toFixed(2)}`} icon={TrendingUp} iconColor="#FBBF24" />
          </div>
        )}

        {/* ── Tab Switcher + Table Area ─────────────────────── */}
        <motion.div className="card glass-noise p-3 sm:p-5" variants={cardVariants}>
          {/* Tab switcher */}
          <div className="flex items-center gap-4 mb-5 overflow-x-auto -mx-1 px-1">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[rgba(46,43,74,0.3)] overflow-x-auto min-w-0">
              {(['overview', 'agents', 'users', 'tickets', 'purchases', 'health'] as const).map((tab) => {
                const tabIcons: Record<string, React.ElementType> = { overview: BarChart3, agents: Bot, users: Users, tickets: Ticket, purchases: DollarSign, health: HeartPulse };
                const TabIcon = tabIcons[tab] ?? BarChart3;
                const tabLabels: Record<string, string> = { overview: 'Overview', agents: `Agents (${agentsPagination.total || agents.length})`, users: `Users (${users.length})`, tickets: `Tickets${tickets.length ? ` (${tickets.length})` : ''}`, purchases: 'Purchases', health: 'Health' };
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                      activeTab === tab
                        ? 'text-[var(--text-primary)] bg-[var(--color-accent)]/20'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <TabIcon size={14} />
                    {tabLabels[tab]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Overview Tab ─────────────────────────────────── */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-5">
              {/* Daily stats row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Users Today" value={stats.newUsersToday ?? 0} icon={Sunrise} iconColor="#34D399" />
                <StatCard label="Agents Today" value={stats.newAgentsToday ?? 0} icon={Calendar} iconColor="#818CF8" />
                <StatCard label="Revenue Today" value={`$${(stats.revenueToday ?? 0).toFixed(2)}`} icon={DollarSign} iconColor="#34D399" />
                <StatCard label="New Users 7d" value={stats.newUsersLast7d} icon={UserPlus} iconColor="var(--color-accent)" />
              </div>

              {/* Framework + Tier Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Framework Distribution */}
                <div className="rounded-xl border border-[var(--border-default)] p-5 bg-[var(--bg-elevated)]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/12 flex items-center justify-center flex-shrink-0">
                      <BarChart3 size={16} className="text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Framework Distribution</h3>
                      <p className="text-[10px] text-[var(--text-muted)]">{stats.totalAgents} total agents</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {frameworkDistribution.map((fw) => (
                      <div key={fw.key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: fw.color }} />
                            <span className="text-xs font-medium text-[var(--text-primary)]">{fw.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-[var(--text-secondary)]">{fw.count}</span>
                            <span className="text-[10px] text-[var(--text-muted)] w-8 text-right">{fw.percent}%</span>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[rgba(46,43,74,0.4)] overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${fw.percent}%`, backgroundColor: fw.color, minWidth: fw.count > 0 ? '4px' : '0' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tier Distribution */}
                <div className="rounded-xl border border-[var(--border-default)] p-5 bg-[var(--bg-elevated)]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#FBBF24]/12 flex items-center justify-center flex-shrink-0">
                      <PieChart size={16} className="text-[#FBBF24]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tier Distribution</h3>
                      <p className="text-[10px] text-[var(--text-muted)]">{stats.totalUsers} total users</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {tierDistribution.map((tier) => (
                      <div key={tier.key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tier.color }} />
                            <span className="text-xs font-medium text-[var(--text-primary)]">{tier.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-[var(--text-secondary)]">{tier.count}</span>
                            <span className="text-[10px] text-[var(--text-muted)] w-8 text-right">{tier.percent}%</span>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[rgba(46,43,74,0.4)] overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${tier.percent}%`, backgroundColor: tier.color, minWidth: tier.count > 0 ? '4px' : '0' }} />
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
                          <div key={tier.key} className="h-full transition-all duration-700 ease-out first:rounded-l-full last:rounded-r-full" style={{ width: `${tier.percent}%`, backgroundColor: tier.color, minWidth: '4px' }} title={`${tier.label}: ${tier.count} (${tier.percent}%)`} />
                        )
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Recent Agent Creates */}
                <div className="rounded-xl border border-[var(--border-default)] p-5 bg-[var(--bg-elevated)]">
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
                        <Link
                          key={agent.id}
                          href={`/admin/agent/${agent.id}`}
                          className={`flex items-center justify-between py-2.5 hover:bg-[var(--bg-hover)] -mx-2 px-2 rounded-lg transition-colors ${i < recentAgents.length - 1 ? 'border-b border-[var(--border-default)]' : ''}`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center flex-shrink-0">
                              <Bot size={12} className="text-[var(--color-accent)]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-[var(--text-primary)] truncate">{agent.name}</p>
                              <p className="text-[10px] text-[var(--text-muted)]">by {agent.ownerUsername || 'unknown'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <StatusBadge status={agent.status} />
                            <FrameworkTag framework={agent.framework} />
                            <span className="text-[10px] text-[var(--text-muted)] w-16 text-right">{timeAgo(agent.createdAt)}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent User Signups */}
                <div className="rounded-xl border border-[var(--border-default)] p-5 bg-[var(--bg-elevated)]">
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
                        <button
                          key={u.id}
                          onClick={() => loadUserDetail(u.id)}
                          className={`flex items-center justify-between py-2.5 w-full text-left hover:bg-[var(--bg-hover)] -mx-2 px-2 rounded-lg transition-colors ${i < recentUsers.length - 1 ? 'border-b border-[var(--border-default)]' : ''}`}
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
                            <TierBadge tier={u.tier} />
                            <span className="text-[10px] text-[var(--text-muted)] w-16 text-right">{timeAgo(u.createdAt)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Agents Tab ──────────────────────────────────── */}
          {activeTab === 'agents' && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  All Agents
                  <span className="text-sm font-normal ml-2 text-[var(--text-muted)]">
                    ({frameworkFilteredAgents.length}{agentsPagination.total > agents.length ? ` of ${agentsPagination.total}` : ''})
                  </span>
                </h2>

                <div className="flex flex-col gap-3 w-full">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {/* Status filters */}
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-[rgba(46,43,74,0.3)] overflow-x-auto">
                      {STATUS_FILTERS.map((f) => (
                        <button
                          key={f.key}
                          onClick={() => setStatusFilter(f.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                            statusFilter === f.key
                              ? 'text-[var(--text-primary)] bg-[var(--color-accent)]/20'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Framework filter */}
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-[rgba(46,43,74,0.3)] overflow-x-auto">
                      {[{ key: 'all', label: 'All FW' }, ...Object.entries(FRAMEWORK_META).map(([k, v]) => ({ key: k, label: v.label }))].map((f) => (
                        <button
                          key={f.key}
                          onClick={() => setFrameworkFilter(f.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                            frameworkFilter === f.key
                              ? 'text-[var(--text-primary)] bg-[var(--color-accent)]/20'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search */}
                  <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] transition-all duration-200 focus-within:border-[rgba(6,182,212,0.4)] max-w-md">
                    <Search size={16} className="text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search agents, owners, IDs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent outline-none text-sm w-full text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                        <XCircle size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Agents Table */}
              {frameworkFilteredAgents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Bot size={40} className="text-[var(--text-muted)] mb-3 opacity-40" />
                  <p className="text-sm text-[var(--text-muted)]">
                    {agents.length === 0 ? 'No agents on the platform yet.' : 'No agents match your filters.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-3 sm:-mx-0 px-3 sm:px-0">
                  <table className="w-full text-left text-xs sm:text-sm" style={{ tableLayout: 'auto', minWidth: '700px' }}>
                    <thead>
                      <tr className="border-b border-[var(--border-default)]">
                        {['Agent', 'Owner', 'Framework', 'Status', 'Messages', 'Created', 'Actions'].map(
                          (header) => (
                            <th
                              key={header}
                              className="pb-3 pr-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                            >
                              {header}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {frameworkFilteredAgents.map((agent) => {
                        const inProgress = actionInProgress[agent.id];
                        return (
                          <tr
                            key={agent.id}
                            className="transition-colors hover:bg-[var(--bg-card)] border-b border-[var(--border-default)]"
                          >
                            {/* Agent name — clickable */}
                            <td className="py-3.5 pr-4">
                              <Link href={`/admin/agent/${agent.id}`} className="flex items-center gap-3 group">
                                <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/12 flex items-center justify-center flex-shrink-0">
                                  <Bot size={14} className="text-[var(--color-accent)]" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate max-w-[180px] text-[var(--text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                                    {agent.name}
                                    <ExternalLink size={10} className="inline ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </p>
                                  <p className="text-xs font-mono truncate max-w-[180px] text-[var(--text-muted)]">
                                    {agent.id.slice(0, 8)}...
                                  </p>
                                </div>
                              </Link>
                            </td>

                            {/* Owner — clickable to open user detail */}
                            <td className="py-3.5 pr-4">
                              <button
                                onClick={() => {
                                  const ownerUser = users.find((u) => u.username === agent.ownerUsername);
                                  if (ownerUser) loadUserDetail(ownerUser.id);
                                }}
                                className="text-xs font-mono px-2 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors cursor-pointer"
                              >
                                {agent.ownerUsername ?? shortenAddress(agent.ownerWallet ?? '', 4)}
                              </button>
                            </td>

                            {/* Framework */}
                            <td className="py-3.5 pr-4">
                              <FrameworkTag framework={agent.framework} />
                            </td>

                            {/* Status */}
                            <td className="py-3.5 pr-4">
                              <StatusBadge status={agent.status} />
                            </td>

                            {/* Messages */}
                            <td className="py-3.5 pr-4">
                              <span className="text-xs font-mono text-[var(--text-secondary)]">
                                {agent.messageCount?.toLocaleString() ?? 0}
                              </span>
                            </td>

                            {/* Created */}
                            <td className="py-3.5 pr-4">
                              <span className="text-xs text-[var(--text-muted)]">
                                {timeAgo(agent.createdAt)}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5">
                              <div className="flex items-center gap-1.5">
                                {/* View button */}
                                <Link
                                  href={`/admin/agent/${agent.id}`}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/20"
                                  title="View agent dashboard"
                                >
                                  <ExternalLink size={11} />
                                </Link>

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
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20"
                                  title="Pause agent"
                                >
                                  {inProgress === 'pause' ? (
                                    <RefreshCw size={11} className="animate-spin" />
                                  ) : (
                                    <Pause size={11} />
                                  )}
                                </button>

                                {/* Kill button */}
                                <button
                                  onClick={() => handleKill(agent.id)}
                                  disabled={agent.status === 'killed' || !!inProgress}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20"
                                  title="Kill agent"
                                >
                                  {inProgress === 'kill' ? (
                                    <RefreshCw size={11} className="animate-spin" />
                                  ) : (
                                    <XCircle size={11} />
                                  )}
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

              {/* Load More */}
              {agentsPagination.hasMore && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={handleLoadMoreAgents}
                    disabled={loadingMoreAgents}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMoreAgents ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    {loadingMoreAgents ? 'Loading…' : `Load more (${agentsPagination.total - agents.length} remaining)`}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Users Tab ───────────────────────────────────── */}
          {activeTab === 'users' && (
            <>
              <div className="flex flex-col gap-3 mb-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    All Users
                    <span className="text-sm font-normal ml-2 text-[var(--text-muted)]">
                      ({filteredUsers.length}{filteredUsers.length !== users.length ? ` of ${users.length}` : ''})
                    </span>
                  </h2>

                  {/* Tier filter */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[rgba(46,43,74,0.3)] overflow-x-auto">
                    {[{ key: 'all', label: 'All' }, { key: 'free', label: 'Free' }, { key: 'starter', label: 'Starter' }, { key: 'founding_member', label: 'Founding' }, { key: 'pro', label: 'Pro' }, { key: 'business', label: 'Business' }, { key: 'banned', label: 'Banned' }].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setUserTierFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                          userTierFilter === f.key
                            ? 'text-[var(--text-primary)] bg-[var(--color-accent)]/20'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] transition-all duration-200 focus-within:border-[rgba(6,182,212,0.4)] max-w-md">
                  <Search size={16} className="text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, wallet..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="bg-transparent outline-none text-sm w-full text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                  {userSearchQuery && (
                    <button onClick={() => setUserSearchQuery('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                      <XCircle size={14} />
                    </button>
                  )}
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Users size={40} className="text-[var(--text-muted)] mb-3 opacity-40" />
                  <p className="text-sm text-[var(--text-muted)]">
                    {users.length === 0 ? 'No users on the platform yet.' : 'No users match your filters.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-3 sm:-mx-0 px-3 sm:px-0">
                  <table className="w-full text-left text-xs sm:text-sm" style={{ minWidth: '650px' }}>
                    <thead>
                      <tr className="border-b border-[var(--border-default)]">
                        {[
                          { key: 'user', label: 'User', sortable: false },
                          { key: 'tier', label: 'Tier', sortable: false },
                          { key: 'agentCount', label: 'Agents', sortable: true },
                          { key: 'paymentCount', label: 'Payments', sortable: true },
                          { key: 'hatchCredits', label: 'Credits', sortable: true },
                          { key: 'createdAt', label: 'Joined', sortable: true },
                          { key: 'actions', label: '', sortable: false },
                        ].map((col) => (
                          <th
                            key={col.key}
                            className={`pb-3 pr-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] ${col.sortable ? 'cursor-pointer select-none hover:text-[var(--text-primary)]' : ''}`}
                            onClick={() => {
                              if (!col.sortable) return;
                              const sortKey = col.key as typeof userSortBy;
                              if (userSortBy === sortKey) setUserSortDir((d) => d === 'asc' ? 'desc' : 'asc');
                              else { setUserSortBy(sortKey); setUserSortDir('desc'); }
                            }}
                          >
                            <span className="flex items-center gap-1">
                              {col.label}
                              {col.sortable && userSortBy === col.key && (
                                <span className="text-[var(--color-accent)]">{userSortDir === 'asc' ? ' ↑' : ' ↓'}</span>
                              )}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr
                          key={u.id}
                          onClick={() => loadUserDetail(u.id)}
                          className="transition-colors hover:bg-[var(--bg-hover)] border-b border-[var(--border-default)] cursor-pointer"
                        >
                          {/* User */}
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/12 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-[var(--color-accent)]">{u.username[0]?.toUpperCase()}</span>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-[var(--text-primary)] block">{u.username}</span>
                                <span className="text-[10px] text-[var(--text-muted)]">{u.email}</span>
                              </div>
                              {u.isAdmin && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 uppercase">Admin</span>
                              )}
                              {u.emailVerified === false && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 uppercase">Unverified</span>
                              )}
                            </div>
                          </td>

                          {/* Tier */}
                          <td className="py-3.5 pr-4">
                            <TierBadge tier={u.tier} />
                          </td>

                          {/* Agent count */}
                          <td className="py-3.5 pr-4">
                            <span className="text-sm font-mono text-[var(--text-primary)]">
                              {u.agentCount}
                            </span>
                          </td>

                          {/* Payment count */}
                          <td className="py-3.5 pr-4">
                            <span className="text-sm font-mono text-[var(--text-primary)]">
                              {u.paymentCount}
                            </span>
                          </td>

                          {/* Credits */}
                          <td className="py-3.5 pr-4">
                            <span className="text-sm font-mono text-[var(--text-primary)]">
                              {u.hatchCredits.toFixed(2)}
                            </span>
                          </td>

                          {/* Joined */}
                          <td className="py-3.5 pr-4">
                            <span className="text-xs text-[var(--text-muted)]">
                              {timeAgo(u.createdAt)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5" onClick={(e) => e.stopPropagation()}>
                            {!u.isAdmin && (
                              <button
                                onClick={() => handleBanUser(u.id)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                  u.tier === 'banned'
                                    ? 'bg-green-400/10 text-green-400 border border-green-400/20 hover:bg-green-400/20'
                                    : 'bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20'
                                }`}
                                title={u.tier === 'banned' ? 'Unban user' : 'Ban user'}
                              >
                                {u.tier === 'banned' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                                <span className="hidden sm:inline">{u.tier === 'banned' ? 'Unban' : 'Ban'}</span>
                              </button>
                            )}
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
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[rgba(46,43,74,0.3)] overflow-x-auto">
                    {TICKET_FILTERS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setTicketFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 capitalize ${
                          ticketFilter === f
                            ? 'text-[var(--text-primary)] bg-[var(--color-accent)]/20'
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
                  <div className="overflow-x-auto -mx-3 sm:-mx-0 px-3 sm:px-0">
                    <table className="w-full text-left text-xs sm:text-sm" style={{ minWidth: '650px' }}>
                      <thead>
                        <tr className="border-b border-[var(--border-default)]">
                          {['Subject', 'User', 'Category', 'Priority', 'Status', 'Updated', ''].map((h) => (
                            <th key={h} className="pb-3 pr-4 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
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
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/20 transition-colors"
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

          {/* ── Purchases Tab ────────────────────────────────── */}
          {activeTab === 'purchases' && (
            <div className="space-y-4">
              {paymentsLoading && payments.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-14 rounded-xl shimmer" />
                  ))}
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-14">
                  <DollarSign size={28} className="mx-auto text-[var(--text-muted)] mb-3" />
                  <p className="text-sm text-[var(--text-muted)]">No payments yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-default)]">
                        <th className="py-2 pr-3">When</th>
                        <th className="py-2 pr-3">User · Agent</th>
                        <th className="py-2 pr-3">Feature</th>
                        <th className="py-2 pr-3 text-right">USD</th>
                        <th className="py-2 pr-3 text-right">HATCH</th>
                        <th className="py-2 pr-3">Status · Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b border-[var(--border-default)]/40 hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 pr-3 text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
                            {new Date(p.createdAt).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 pr-3 min-w-0">
                            <div className="text-white truncate">{p.userUsername ? `@${p.userUsername}` : p.userEmail ?? 'unknown'}</div>
                            {p.agentName && (
                              <div className="text-[10px] text-[var(--text-muted)] truncate">
                                {p.agentName}{p.agentFramework ? ` · ${p.agentFramework}` : ''}
                              </div>
                            )}
                          </td>
                          <td className="py-3 pr-3 text-[var(--text-secondary)] truncate">{p.featureKey}</td>
                          <td className="py-3 pr-3 text-right tabular-nums text-white">${p.usdAmount.toFixed(2)}</td>
                          <td className="py-3 pr-3 text-right tabular-nums text-[var(--text-muted)]">
                            {p.hatchAmount ? p.hatchAmount.toFixed(0) : '—'}
                          </td>
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                p.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' :
                                p.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-red-500/10 text-red-400'
                              }`}>{p.status}</span>
                              {p.txSignature && !p.txSignature.startsWith('stripe_') && (
                                <a
                                  href={`https://solscan.io/tx/${p.txSignature}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-[var(--color-accent)] hover:text-[var(--text-primary)] transition-colors truncate"
                                  title={p.txSignature}
                                >
                                  {p.txSignature.slice(0, 8)}…
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

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
                        <Server size={16} className="text-[var(--color-accent)]" />
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
                        health.disk.percent > 90 ? 'bg-red-500' : health.disk.percent > 70 ? 'bg-amber-500' : 'bg-[var(--color-accent)]'
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/20 transition-colors disabled:opacity-40"
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

      {/* User Detail Slide-over */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => { setSelectedUserId(null); setUserDetail(null); }} />
          {/* Panel */}
          <div className="relative w-full max-w-full sm:max-w-lg bg-[var(--bg-elevated)] border-l border-[var(--border-default)] h-full overflow-y-auto shadow-2xl">
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">User Details</h2>
                <button onClick={() => { setSelectedUserId(null); setUserDetail(null); }} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
                  ✕
                </button>
              </div>

              {userDetailLoading && <div className="text-center py-12 text-[var(--text-muted)] text-sm">Loading...</div>}

              {!userDetailLoading && userDetail && (
                <div className="space-y-6">
                  {/* Identity */}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-sm font-bold text-[var(--color-accent)]">
                        {userDetail.username[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">{userDetail.username}</div>
                        <div className="text-xs text-[var(--text-muted)]">{userDetail.email}</div>
                      </div>
                      <div className="ml-auto flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${userDetail.emailVerified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                          {userDetail.emailVerified ? '✓ Verified' : '⚠ Unverified'}
                        </span>
                      </div>
                    </div>
                    {/* Ban/Unban action */}
                    {!userDetail.isAdmin && (
                      <div className="mt-3">
                        <button
                          onClick={() => handleBanUser(userDetail.id)}
                          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                            userDetail.tier === 'banned'
                              ? 'bg-green-400/10 text-green-400 border border-green-400/20 hover:bg-green-400/20'
                              : 'bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20'
                          }`}
                        >
                          {userDetail.tier === 'banned' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {userDetail.tier === 'banned' ? 'Unban User' : 'Ban User'}
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                      <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]">
                        <div className="text-[var(--text-muted)] mb-0.5">Tier</div>
                        <div className="font-semibold text-[var(--text-primary)]"><TierBadge tier={userDetail.tier} /></div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]">
                        <div className="text-[var(--text-muted)] mb-0.5">Credits</div>
                        <div className="font-semibold text-[var(--text-primary)]">{userDetail.hatchCredits}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]">
                        <div className="text-[var(--text-muted)] mb-0.5">Joined</div>
                        <div className="font-semibold text-[var(--text-primary)]">{new Date(userDetail.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]">
                        <div className="text-[var(--text-muted)] mb-0.5">Wallet</div>
                        <div className="font-semibold text-[var(--text-primary)] truncate">{userDetail.walletAddress ? `${userDetail.walletAddress.slice(0,6)}…${userDetail.walletAddress.slice(-4)}` : '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Agents */}
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Agents ({userDetail.agents.length})</h3>
                    {userDetail.agents.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)]">No agents yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {userDetail.agents.map(a => (
                          <Link
                            key={a.id}
                            href={`/admin/agent/${a.id}`}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-xs hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent)]/5 transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--color-accent)] transition-colors">{a.name}</span>
                              <FrameworkTag framework={a.framework} />
                              <ExternalLink size={10} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <StatusBadge status={a.status} />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Purchases / Features */}
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Purchases ({userDetail.payments.length})</h3>
                    {userDetail.payments.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)]">No purchases yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {userDetail.payments.map(p => (
                          <div key={p.id} className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-xs">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-medium text-[var(--text-primary)]">{p.featureKey}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${p.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : p.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>{p.status}</span>
                            </div>
                            <div className="text-[var(--text-muted)]">${p.usdAmount.toFixed(2)} · {new Date(p.createdAt).toLocaleDateString()}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Active Features */}
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Active Features ({userDetail.features.filter(f => !f.expiresAt || new Date(f.expiresAt) > new Date()).length})</h3>
                    {userDetail.features.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)]">No active features.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {userDetail.features.map(f => (
                          <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-xs">
                            <span className="font-medium text-[var(--text-primary)]">{f.featureKey}</span>
                            <span className="text-[var(--text-muted)]">{f.expiresAt ? `until ${new Date(f.expiresAt).toLocaleDateString()}` : 'lifetime'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
