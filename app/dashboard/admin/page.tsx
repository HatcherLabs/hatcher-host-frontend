'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { timeAgo } from '@/lib/utils';
import {
  Users,
  Bot,
  Activity,
  DollarSign,
  MessageSquare,
  Shield,
  Server,
  Database,
  Cpu,
  HardDrive,
  RefreshCw,
  Search,
  Ban,
  Square,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Zap,
  TicketCheck,
  Send,
  Filter,
  UserCheck,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────

interface AdminStats {
  totalUsers: number;
  totalAgents: number;
  activeAgents: number;
  totalFeaturesUnlocked: number;
  totalPayments: number;
  totalRevenueUsd: number;
  totalMessages: number;
  newUsersLast7d: number;
}

interface AdminUser {
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
}

interface AdminAgent {
  id: string;
  name: string;
  framework: string;
  status: string;
  messageCount: number;
  ownerUsername: string;
  ownerWallet: string | null;
  createdAt: string;
}

interface AdminTicket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  userUsername: string;
  userEmail: string;
  agentName: string | null;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  createdAt: string;
  updatedAt: string;
}

interface HealthData {
  api: { status: string; uptime: number; memory: { used: number; total: number } };
  database: { status: string; connectionCount: number };
  redis: { status: string; usedMemory: string; connectedClients: number };
  docker: { status: string; containersRunning: number; containersTotal: number };
  services: Array<{ name: string; status: string; uptime: string; restarts: number }>;
  disk: { used: string; total: string; percent: number };
  backup: { lastBackup: string | null; lastSize: string | null };
}

// ─── Tab definition ──────────────────────────────────────────
type Tab = 'overview' | 'users' | 'agents' | 'tickets' | 'system';
const TABS: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
  { key: 'overview', label: 'Overview', icon: TrendingUp },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'agents', label: 'Agents', icon: Bot },
  { key: 'tickets', label: 'Support', icon: TicketCheck },
  { key: 'system', label: 'System', icon: Server },
];

// ─── Helpers ─────────────────────────────────────────────────
const TIER_COLORS: Record<string, string> = {
  free: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  basic: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  pro: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  banned: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  sleeping: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  paused: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  error: 'text-red-400 bg-red-500/10 border-red-500/20',
  killed: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const TICKET_PRIORITY_COLORS: Record<string, string> = {
  low: 'text-zinc-400',
  normal: 'text-blue-400',
  high: 'text-amber-400',
  urgent: 'text-red-400',
};

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${TIER_COLORS[tier] ?? TIER_COLORS.free}`}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${STATUS_COLORS[status] ?? STATUS_COLORS.paused}`}>
      {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function HealthDot({ status }: { status: string }) {
  const ok = status === 'healthy';
  return (
    <span className={`inline-flex w-2 h-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'cyan',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: 'cyan' | 'purple' | 'emerald' | 'amber' | 'red';
}) {
  const colors = {
    cyan: 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]',
    purple: 'bg-purple-500/15 text-purple-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
    amber: 'bg-amber-500/15 text-amber-400',
    red: 'bg-red-500/15 text-red-400',
  };
  return (
    <div className="card glass-noise p-5">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
          {sub && <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [serverStats, setServerStats] = useState<{ cpu: { cores: number; usagePercent: number; model: string; loadAvg: { '1m': number; '5m': number; '15m': number } }; memory: { totalBytes: number; usedBytes: number; usagePercent: number }; disk: { total: number; used: number; usePercent: number }; uptime: number; containers: { running: number; total: number } } | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);

  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Users tab state
  const [userSearch, setUserSearch] = useState('');
  const [userTierFilter, setUserTierFilter] = useState<string>('all');
  const [userPage, setUserPage] = useState(0);
  const USER_PAGE_SIZE = 20;

  // Agents tab state
  const [agentSearch, setAgentSearch] = useState('');
  const [agentStatusFilter, setAgentStatusFilter] = useState<string>('all');
  const [agentFrameworkFilter, setAgentFrameworkFilter] = useState<string>('all');
  const [agentTotal, setAgentTotal] = useState(0);
  const [agentHasMore, setAgentHasMore] = useState(false);
  const [agentLoadingMore, setAgentLoadingMore] = useState(false);
  const AGENT_PAGE_SIZE = 25;

  // Tickets tab state
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [ticketReply, setTicketReply] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');

  // ── Auth guard ────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push('/dashboard/agents');
    }
  }, [authLoading, user, router]);

  // ── Initial load ──────────────────────────────────────────
  useEffect(() => {
    if (!user?.isAdmin) return;
    setLoading(true);
    Promise.all([
      api.adminGetStats(),
      api.adminGetUsers(0, 100),
      api.adminGetAgents(AGENT_PAGE_SIZE, 0),
      api.adminGetTickets(),
    ]).then(([statsRes, usersRes, agentsRes, ticketsRes]) => {
      if (statsRes.success) setStats(statsRes.data);
      if (usersRes.success) setUsers((usersRes.data as any).users ?? []);
      if (agentsRes.success) {
        const d = agentsRes.data as any;
        setAgents(d.agents ?? []);
        setAgentTotal(d.pagination?.total ?? 0);
        setAgentHasMore(d.pagination?.hasMore ?? false);
      }
      if (ticketsRes.success) setTickets((ticketsRes.data as any).tickets ?? []);
      setLoading(false);
    });
    api.adminGetServerStats().then(res => { if (res.success) setServerStats(res.data); });
  }, [user]);

  // ── Load health when System tab is shown ─────────────────
  useEffect(() => {
    if (activeTab !== 'system' || health) return;
    setTabLoading(true);
    api.adminGetHealth().then((res) => {
      if (res.success) setHealth(res.data);
      setTabLoading(false);
    });
  }, [activeTab, health]);

  const showAction = useCallback((type: 'success' | 'error', text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 3500);
  }, []);

  // ── Load more agents ──────────────────────────────────────
  const loadMoreAgents = useCallback(async () => {
    setAgentLoadingMore(true);
    const res = await api.adminGetAgents(AGENT_PAGE_SIZE, agents.length);
    if (res.success) {
      const d = res.data as any;
      setAgents(prev => [...prev, ...(d.agents ?? [])]);
      setAgentHasMore(d.pagination?.hasMore ?? false);
      setAgentTotal(d.pagination?.total ?? agentTotal);
    }
    setAgentLoadingMore(false);
  }, [agents.length, agentTotal]);

  // ── User actions ──────────────────────────────────────────
  const handleBanUser = async (u: AdminUser) => {
    const isBanned = u.tier === 'banned';
    const res = isBanned ? await api.adminUnbanUser(u.id) : await api.adminBanUser(u.id);
    if (res.success) {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, tier: isBanned ? 'free' : 'banned' } : x));
      showAction('success', isBanned ? `@${u.username} unbanned` : `@${u.username} banned`);
    } else {
      showAction('error', (res as any).error ?? 'Action failed');
    }
  };

  // ── Agent actions ─────────────────────────────────────────
  const handleKillAgent = async (a: AdminAgent) => {
    const res = await api.adminKillAgent(a.id);
    if (res.success) {
      setAgents(prev => prev.map(x => x.id === a.id ? { ...x, status: 'killed' } : x));
      showAction('success', `Agent "${a.name}" killed`);
    } else {
      showAction('error', (res as any).error ?? 'Kill failed');
    }
  };

  const handlePauseAgent = async (a: AdminAgent) => {
    const res = await api.adminPauseAgent(a.id);
    if (res.success) {
      setAgents(prev => prev.map(x => x.id === a.id ? { ...x, status: 'paused' } : x));
      showAction('success', `Agent "${a.name}" paused`);
    } else {
      showAction('error', (res as any).error ?? 'Pause failed');
    }
  };

  // ── Ticket actions ────────────────────────────────────────
  const handleTicketReply = async () => {
    if (!selectedTicket || !ticketReply.trim()) return;
    setReplyLoading(true);
    const res = await api.adminReplyTicket(selectedTicket.id, ticketReply.trim());
    if (res.success) {
      const newMsg = { role: 'admin', content: ticketReply.trim(), timestamp: new Date().toISOString() };
      const updated = { ...selectedTicket, messages: [...selectedTicket.messages, newMsg] };
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t));
      setSelectedTicket(updated);
      setTicketReply('');
      showAction('success', 'Reply sent');
    } else {
      showAction('error', 'Failed to send reply');
    }
    setReplyLoading(false);
  };

  const handleTicketStatus = async (ticketId: string, status: string) => {
    const res = await api.adminUpdateTicketStatus(ticketId, status);
    if (res.success) {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
      if (selectedTicket?.id === ticketId) setSelectedTicket(prev => prev ? { ...prev, status } : null);
      showAction('success', 'Status updated');
    }
  };

  // ── Derived data ──────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let res = users;
    if (userTierFilter !== 'all') res = res.filter(u => u.tier === userTierFilter);
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      res = res.filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return res;
  }, [users, userTierFilter, userSearch]);

  const pagedUsers = useMemo(() =>
    filteredUsers.slice(userPage * USER_PAGE_SIZE, (userPage + 1) * USER_PAGE_SIZE),
    [filteredUsers, userPage]
  );

  const filteredAgents = useMemo(() => {
    let res = agents;
    if (agentStatusFilter !== 'all') res = res.filter(a => a.status === agentStatusFilter);
    if (agentFrameworkFilter !== 'all') res = res.filter(a => a.framework === agentFrameworkFilter);
    if (agentSearch.trim()) {
      const q = agentSearch.toLowerCase();
      res = res.filter(a => a.name.toLowerCase().includes(q) || a.ownerUsername?.toLowerCase().includes(q));
    }
    return res;
  }, [agents, agentStatusFilter, agentFrameworkFilter, agentSearch]);

  const filteredTickets = useMemo(() => {
    if (ticketStatusFilter === 'all') return tickets;
    return tickets.filter(t => t.status === ticketStatusFilter);
  }, [tickets, ticketStatusFilter]);

  // Agent breakdown stats
  const agentByFramework = useMemo(() => {
    const map: Record<string, number> = {};
    agents.forEach(a => { map[a.framework] = (map[a.framework] ?? 0) + 1; });
    return map;
  }, [agents]);

  const agentByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    agents.forEach(a => { map[a.status] = (map[a.status] ?? 0) + 1; });
    return map;
  }, [agents]);

  const usersByTier = useMemo(() => {
    const map: Record<string, number> = {};
    users.forEach(u => { map[u.tier] = (map[u.tier] ?? 0) + 1; });
    return map;
  }, [users]);

  // ── Loading/auth states ───────────────────────────────────
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#8b5cf6] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user.isAdmin) return null;

  if (loading) {
    return (
      <div className="min-h-screen p-6 lg:p-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 w-48 rounded shimmer" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="card glass-noise p-5 h-24 shimmer" />)}
          </div>
          <div className="card glass-noise h-64 shimmer" />
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <Shield size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-[var(--text-muted)]">Platform management &amp; oversight</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] w-fit overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-purple-500/15 text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon size={14} />
                {tab.label}
                {tab.key === 'tickets' && tickets.filter(t => t.status === 'open').length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {tickets.filter(t => t.status === 'open').length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Overview tab ────────────────────────────────── */}
        {activeTab === 'overview' && stats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Top stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Users" value={stats.totalUsers} sub={`+${stats.newUsersLast7d} this week`} color="cyan" />
              <StatCard icon={Bot} label="Total Agents" value={stats.totalAgents} sub={`${stats.activeAgents} active`} color="purple" />
              <StatCard icon={MessageSquare} label="Total Messages" value={stats.totalMessages.toLocaleString()} color="emerald" />
              <StatCard icon={DollarSign} label="Revenue (USD)" value={`$${stats.totalRevenueUsd.toFixed(2)}`} sub={`${stats.totalPayments} payments`} color="amber" />
            </div>

            {/* Server Stats */}
            {serverStats && (
              <div className="card glass-noise p-5 space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Server size={14} className="text-cyan-400" />
                  Server Resources
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">CPU</p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">{serverStats.cpu.usagePercent}%</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{serverStats.cpu.cores} cores — load {serverStats.cpu.loadAvg['1m'].toFixed(1)}</p>
                    <div className="h-1.5 rounded-full bg-[var(--bg-hover)] mt-1 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${serverStats.cpu.usagePercent}%`, background: serverStats.cpu.usagePercent > 80 ? '#ef4444' : serverStats.cpu.usagePercent > 50 ? '#f59e0b' : '#22c55e' }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">RAM</p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">{serverStats.memory.usagePercent}%</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{(serverStats.memory.usedBytes / 1073741824).toFixed(1)} / {(serverStats.memory.totalBytes / 1073741824).toFixed(1)} GB</p>
                    <div className="h-1.5 rounded-full bg-[var(--bg-hover)] mt-1 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${serverStats.memory.usagePercent}%`, background: serverStats.memory.usagePercent > 85 ? '#ef4444' : serverStats.memory.usagePercent > 60 ? '#f59e0b' : '#22c55e' }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Disk</p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">{serverStats.disk.usePercent}%</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{(serverStats.disk.used / 1073741824).toFixed(0)} / {(serverStats.disk.total / 1073741824).toFixed(0)} GB</p>
                    <div className="h-1.5 rounded-full bg-[var(--bg-hover)] mt-1 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${serverStats.disk.usePercent}%`, background: serverStats.disk.usePercent > 90 ? '#ef4444' : serverStats.disk.usePercent > 70 ? '#f59e0b' : '#22c55e' }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Containers</p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">{serverStats.containers.running} <span className="text-sm font-normal text-[var(--text-muted)]">/ {serverStats.containers.total}</span></p>
                    <p className="text-[10px] text-[var(--text-muted)]">Uptime: {Math.floor(serverStats.uptime / 86400)}d {Math.floor((serverStats.uptime % 86400) / 3600)}h</p>
                  </div>
                </div>
              </div>
            )}

            {/* Agent breakdown + User tier breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Agents by framework */}
              <div className="card glass-noise p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Bot size={14} className="text-purple-400" />
                  Agents by Framework
                </h3>
                {Object.entries(agentByFramework).map(([fw, count]) => {
                  const pct = agents.length ? Math.round((count / agents.length) * 100) : 0;
                  return (
                    <div key={fw}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[var(--text-secondary)] capitalize">{fw}</span>
                        <span className="text-white font-medium">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[rgba(46,43,74,0.4)]">
                        <div className="h-full rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {/* By status mini breakdown */}
                <div className="pt-3 border-t border-[var(--border-default)] flex flex-wrap gap-2">
                  {Object.entries(agentByStatus).map(([s, c]) => (
                    <span key={s} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[s] ?? STATUS_COLORS.paused}`}>
                      {s}: {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Users by tier */}
              <div className="card glass-noise p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Users size={14} className="text-[var(--color-accent)]" />
                  Users by Tier
                </h3>
                {Object.entries(usersByTier).map(([tier, count]) => {
                  const pct = users.length ? Math.round((count / users.length) * 100) : 0;
                  const barColor: Record<string, string> = { free: 'bg-zinc-500', basic: 'bg-blue-500', pro: 'bg-purple-500', banned: 'bg-red-500' };
                  return (
                    <div key={tier}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[var(--text-secondary)] capitalize">{tier}</span>
                        <span className="text-white font-medium">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[rgba(46,43,74,0.4)]">
                        <div className={`h-full rounded-full ${barColor[tier] ?? 'bg-zinc-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 border-t border-[var(--border-default)]">
                  <div className="text-xs text-[var(--text-muted)]">
                    {stats.totalFeaturesUnlocked} features unlocked across all accounts
                  </div>
                </div>
              </div>
            </div>

            {/* Recent tickets summary */}
            {tickets.filter(t => t.status === 'open').length > 0 && (
              <div className="card glass-noise p-5 border-l-4 border-amber-500">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <span className="text-sm font-semibold text-white">
                    {tickets.filter(t => t.status === 'open').length} open support ticket{tickets.filter(t => t.status === 'open').length !== 1 ? 's' : ''}
                  </span>
                  <button onClick={() => setActiveTab('tickets')} className="ml-auto text-xs text-[var(--color-accent)] hover:text-[var(--text-primary)] transition-colors">
                    View all
                  </button>
                </div>
                <div className="space-y-2">
                  {tickets.filter(t => t.status === 'open').slice(0, 3).map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setActiveTab('tickets'); setSelectedTicket(t); }}
                      className="w-full text-left text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 py-1"
                    >
                      <span className={`font-medium ${TICKET_PRIORITY_COLORS[t.priority]}`}>[{t.priority}]</span>
                      <span className="truncate">{t.subject}</span>
                      <span className="ml-auto text-[var(--text-muted)] flex-shrink-0">{t.userUsername}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Users tab ────────────────────────────────────── */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 flex-1 max-w-xs">
                <Search size={14} className="text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={e => { setUserSearch(e.target.value); setUserPage(0); }}
                  className="bg-transparent outline-none text-sm flex-1 text-white placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                {['all', 'free', 'starter', 'pro', 'business', 'banned'].map(t => (
                  <button
                    key={t}
                    onClick={() => { setUserTierFilter(t); setUserPage(0); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer capitalize ${
                      userTierFilter === t ? 'bg-purple-500/15 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {t}
                    {t !== 'all' && <span className="ml-1 opacity-60">({usersByTier[t] ?? 0})</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="card glass-noise overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">User</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Tier</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] hidden sm:table-cell">Agents</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] hidden md:table-cell">Payments</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] hidden lg:table-cell">Joined</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.map(u => (
                      <tr key={u.id} className="border-b border-[var(--border-default)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-purple-300">
                                {u.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-white font-medium text-xs truncate flex items-center gap-1">
                                @{u.username}
                                {u.isAdmin && <Shield size={11} className="text-amber-400 flex-shrink-0" />}
                              </div>
                              <div className="text-[var(--text-muted)] text-[11px] truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><TierBadge tier={u.tier} /></td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)] hidden sm:table-cell">{u.agentCount}</td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)] hidden md:table-cell">{u.paymentCount}</td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)] hidden lg:table-cell">{timeAgo(u.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          {!u.isAdmin && (
                            <button
                              onClick={() => handleBanUser(u)}
                              title={u.tier === 'banned' ? 'Unban user' : 'Ban user'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                u.tier === 'banned'
                                  ? 'hover:bg-emerald-500/10 text-emerald-400'
                                  : 'hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400'
                              }`}
                            >
                              {u.tier === 'banned' ? <UserCheck size={14} /> : <Ban size={14} />}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {pagedUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {filteredUsers.length > USER_PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-default)]">
                  <span className="text-xs text-[var(--text-muted)]">
                    {userPage * USER_PAGE_SIZE + 1}–{Math.min((userPage + 1) * USER_PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setUserPage(p => p - 1)}
                      disabled={userPage === 0}
                      className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={14} className="text-[var(--text-secondary)]" />
                    </button>
                    <button
                      onClick={() => setUserPage(p => p + 1)}
                      disabled={(userPage + 1) * USER_PAGE_SIZE >= filteredUsers.length}
                      className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight size={14} className="text-[var(--text-secondary)]" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Agents tab ────────────────────────────────────── */}
        {activeTab === 'agents' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 w-full sm:w-auto">
                <Search size={14} className="text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search agents or owners..."
                  value={agentSearch}
                  onChange={e => setAgentSearch(e.target.value)}
                  className="bg-transparent outline-none text-sm flex-1 text-white placeholder:text-[var(--text-muted)] w-40"
                />
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                {['all', 'active', 'sleeping', 'paused', 'error', 'killed'].map(s => (
                  <button
                    key={s}
                    onClick={() => setAgentStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer capitalize ${
                      agentStatusFilter === s ? 'bg-purple-500/15 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                {['all', 'openclaw', 'hermes', 'elizaos', 'milady'].map(fw => (
                  <button
                    key={fw}
                    onClick={() => setAgentFrameworkFilter(fw)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer capitalize ${
                      agentFrameworkFilter === fw ? 'bg-purple-500/15 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {fw}
                  </button>
                ))}
              </div>
            </div>

            <div className="card glass-noise overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Agent</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] hidden sm:table-cell">Framework</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] hidden md:table-cell">Owner</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] hidden lg:table-cell">Messages</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgents.map(a => (
                      <tr key={a.id} className="border-b border-[var(--border-default)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-white font-medium text-xs">{a.name}</div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)] hidden sm:table-cell capitalize">{a.framework}</td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)] hidden md:table-cell">@{a.ownerUsername}</td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)] hidden lg:table-cell">{(a.messageCount ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {a.status === 'active' && (
                              <button
                                onClick={() => handlePauseAgent(a)}
                                title="Pause agent"
                                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-[var(--text-muted)] hover:text-amber-400 transition-colors cursor-pointer"
                              >
                                <Square size={13} />
                              </button>
                            )}
                            {a.status !== 'killed' && (
                              <button
                                onClick={() => handleKillAgent(a)}
                                title="Force kill agent"
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors cursor-pointer"
                              >
                                <Zap size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAgents.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">No agents found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Footer: count + load more */}
              <div className="px-4 py-3 border-t border-[var(--border-default)] flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">
                  Showing {agents.length} of {agentTotal} agents
                </span>
                {agentHasMore && (
                  <button
                    onClick={loadMoreAgents}
                    disabled={agentLoadingMore}
                    className="text-xs font-medium text-purple-400 hover:text-purple-300 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {agentLoadingMore
                      ? <><span className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" /> Loading...</>
                      : `Load more (+${Math.min(AGENT_PAGE_SIZE, agentTotal - agents.length)})`
                    }
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Tickets tab ────────────────────────────────────── */}
        {activeTab === 'tickets' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* List */}
            <div className="lg:col-span-2 space-y-3">
              {/* Status filter */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] w-fit">
                {['all', 'open', 'in_progress', 'resolved'].map(s => (
                  <button
                    key={s}
                    onClick={() => setTicketStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      ticketStatusFilter === s ? 'bg-purple-500/15 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <div className="card glass-noise overflow-hidden divide-y divide-[rgba(46,43,74,0.2)]">
                {filteredTickets.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`w-full text-left px-4 py-3 transition-colors hover:bg-[rgba(255,255,255,0.02)] cursor-pointer ${
                      selectedTicket?.id === t.id ? 'bg-purple-500/5 border-l-2 border-purple-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white truncate">{t.subject}</div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">@{t.userUsername}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-[10px] font-semibold ${TICKET_PRIORITY_COLORS[t.priority]}`}>
                          {t.priority}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          t.status === 'open' ? 'bg-amber-500/10 text-amber-400' :
                          t.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {t.status === 'in_progress' ? 'active' : t.status}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredTickets.length === 0 && (
                  <div className="py-12 text-center text-sm text-[var(--text-muted)]">No tickets</div>
                )}
              </div>
            </div>

            {/* Detail panel */}
            <div className="lg:col-span-3">
              {selectedTicket ? (
                <div className="card glass-noise p-5 space-y-4 sticky top-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{selectedTicket.subject}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-[var(--text-muted)]">@{selectedTicket.userUsername}</span>
                        <span className="text-[11px] text-[var(--text-muted)]">·</span>
                        <span className="text-[11px] text-[var(--text-muted)]">{selectedTicket.category}</span>
                        {selectedTicket.agentName && (
                          <>
                            <span className="text-[11px] text-[var(--text-muted)]">·</span>
                            <span className="text-[11px] text-[var(--text-secondary)]">{selectedTicket.agentName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {selectedTicket.status !== 'resolved' && (
                        <button
                          onClick={() => handleTicketStatus(selectedTicket.id, 'resolved')}
                          className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-[var(--text-muted)] hover:text-emerald-400 transition-colors cursor-pointer"
                          title="Mark resolved"
                        >
                          <CheckCircle size={15} />
                        </button>
                      )}
                      {selectedTicket.status !== 'open' && (
                        <button
                          onClick={() => handleTicketStatus(selectedTicket.id, 'open')}
                          className="p-1.5 rounded-lg hover:bg-amber-500/10 text-[var(--text-muted)] hover:text-amber-400 transition-colors cursor-pointer"
                          title="Reopen"
                        >
                          <Clock size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {selectedTicket.messages.map((msg, i) => (
                      <div key={i} className={`flex gap-2 ${msg.role === 'admin' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                          msg.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                        }`}>
                          {msg.role === 'admin' ? 'A' : 'U'}
                        </div>
                        <div className={`rounded-xl px-3 py-2 text-xs max-w-[80%] ${
                          msg.role === 'admin'
                            ? 'bg-purple-500/10 text-[var(--text-secondary)]'
                            : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)]'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply */}
                  {selectedTicket.status !== 'resolved' && (
                    <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
                      <textarea
                        value={ticketReply}
                        onChange={e => setTicketReply(e.target.value)}
                        placeholder="Type a reply..."
                        rows={2}
                        className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)] outline-none focus:border-purple-500/40 resize-none"
                      />
                      <button
                        onClick={handleTicketReply}
                        disabled={!ticketReply.trim() || replyLoading}
                        className="btn-primary px-3 py-2 text-xs self-end disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {replyLoading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card glass-noise p-10 flex flex-col items-center justify-center text-center">
                  <TicketCheck size={32} className="text-[var(--text-muted)] mb-3" />
                  <p className="text-sm text-[var(--text-muted)]">Select a ticket to view details</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── System tab ────────────────────────────────────── */}
        {activeTab === 'system' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {tabLoading || !health ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="card glass-noise p-5 h-24 shimmer" />)}
              </div>
            ) : (
              <>
                {/* Health summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="card glass-noise p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <HealthDot status={health.database.status} />
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">Database</span>
                    </div>
                    <div className="text-white text-sm font-medium capitalize">{health.database.status}</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{health.database.connectionCount} connections</div>
                  </div>
                  <div className="card glass-noise p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <HealthDot status={health.redis.status} />
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">Redis</span>
                    </div>
                    <div className="text-white text-sm font-medium capitalize">{health.redis.status}</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{health.redis.usedMemory} · {health.redis.connectedClients} clients</div>
                  </div>
                  <div className="card glass-noise p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <HealthDot status={health.docker.status} />
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">Docker</span>
                    </div>
                    <div className="text-white text-sm font-medium capitalize">{health.docker.status}</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{health.docker.containersRunning}/{health.docker.containersTotal} running</div>
                  </div>
                  <div className="card glass-noise p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Cpu size={12} className="text-[var(--text-secondary)]" />
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">API Process</span>
                    </div>
                    <div className="text-white text-sm font-medium">
                      {health.api.memory.used}MB / {health.api.memory.total}MB
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Uptime: {Math.floor(health.api.uptime / 3600)}h {Math.floor((health.api.uptime % 3600) / 60)}m
                    </div>
                  </div>
                </div>

                {/* Memory usage bar */}
                <div className="card glass-noise p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-white flex items-center gap-2">
                      <Cpu size={14} className="text-[var(--color-accent)]" />
                      API Memory Usage
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {health.api.memory.used}MB / {health.api.memory.total}MB
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[rgba(46,43,74,0.4)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-purple-500"
                      style={{ width: `${Math.min(100, Math.round((health.api.memory.used / health.api.memory.total) * 100))}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">
                    {Math.round((health.api.memory.used / health.api.memory.total) * 100)}% used
                  </div>
                </div>

                {/* Disk + Backup */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card glass-noise p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-white flex items-center gap-2">
                        <HardDrive size={14} className="text-amber-400" />
                        Disk Usage
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{health.disk.used} / {health.disk.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[rgba(46,43,74,0.4)]">
                      <div
                        className={`h-full rounded-full ${health.disk.percent > 80 ? 'bg-red-500' : health.disk.percent > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${health.disk.percent}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-1">{health.disk.percent}% used</div>
                  </div>
                  <div className="card glass-noise p-5">
                    <span className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                      <Database size={14} className="text-purple-400" />
                      Last Backup
                    </span>
                    {health.backup.lastBackup ? (
                      <div>
                        <div className="text-white text-sm font-medium">{health.backup.lastBackup}</div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{health.backup.lastSize}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle size={13} />
                        No backups found
                      </div>
                    )}
                  </div>
                </div>

                {/* PM2 Services */}
                {health.services.length > 0 && (
                  <div className="card glass-noise p-5">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                      <Activity size={14} className="text-emerald-400" />
                      PM2 Services
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {health.services.map(svc => (
                        <div key={svc.name} className="bg-[rgba(255,255,255,0.02)] rounded-xl p-3 border border-[var(--border-default)]">
                          <div className="flex items-center gap-2 mb-2">
                            <HealthDot status={svc.status === 'online' ? 'healthy' : 'unhealthy'} />
                            <span className="text-xs font-medium text-white truncate">{svc.name}</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">Up: {svc.uptime}</div>
                          {svc.restarts > 0 && (
                            <div className="text-[11px] text-amber-400 mt-0.5">{svc.restarts} restart{svc.restarts !== 1 ? 's' : ''}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

      </div>

      {/* Action toast */}
      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed bottom-6 right-6 z-50 card glass-noise px-5 py-3 border-l-4 shadow-lg ${
              actionMsg.type === 'success' ? 'border-emerald-500' : 'border-red-500'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMsg.type === 'success'
                ? <CheckCircle size={14} className="text-emerald-400" />
                : <XCircle size={14} className="text-red-400" />}
              <p className={`text-sm font-medium ${actionMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {actionMsg.text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
