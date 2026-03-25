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
function FrameworkTag({ framework = 'openclaw' }: { framework?: string }) {
  const label = framework === 'hermes' ? 'Hermes' : 'OpenClaw';
  const style = framework === 'hermes' ? 'bg-purple-500/10 text-purple-400 border-purple-500/25' : '';
  return <span className={`fw-tag ${style}`}>{label}</span>;
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

  const [activeTab, setActiveTab] = useState<'agents' | 'users' | 'tickets'>('agents');
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Action in-progress tracking
  const [actionInProgress, setActionInProgress] = useState<Record<string, string>>({});

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

        {/* ── Tab Switcher + Table Area ─────────────────────── */}
        <motion.div className="card glass-noise p-5" variants={cardVariants}>
          {/* Tab switcher */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[rgba(46,43,74,0.3)]">
              {(['agents', 'users', 'tickets'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2 ${
                    activeTab === tab
                      ? 'text-[var(--text-primary)] bg-[#06b6d4]/20'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab === 'agents' ? <Bot size={14} /> : tab === 'users' ? <Users size={14} /> : <Ticket size={14} />}
                  {tab === 'agents' ? 'Agents' : tab === 'users' ? 'Users' : `Tickets${tickets.length ? ` (${tickets.length})` : ''}`}
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
                            className="transition-colors hover:bg-white/[0.02] border-b border-[var(--border-default)]"
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
                          className="transition-colors hover:bg-white/[0.02] border-b border-[var(--border-default)]"
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
              low: 'text-[#6B6890]',
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
                          <tr key={ticket.id} className="transition-colors hover:bg-white/[0.02] border-b border-[var(--border-default)]">
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
