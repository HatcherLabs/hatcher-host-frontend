'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Crown,
  Shield,
  Eye,
  User,
  Trash2,
  LogOut,
  Share2,
  Loader2,
  UserPlus,
  Bot,
  ChevronDown,
} from 'lucide-react';

/* ── Animation ───────────────────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const cardClass = 'card-solid';
const displayFont = { fontFamily: 'var(--font-display), system-ui, sans-serif' };

/* ── Types ───────────────────────────────────────────────── */
interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  user: { id: string; username: string; walletAddress?: string | null; createdAt?: string };
}

interface Team {
  id: string;
  name: string;
  ownerId: string;
  myRole: string;
  agentCount: number;
  members: TeamMember[];
  createdAt: string;
  updatedAt?: string;
}

interface TeamAgent {
  id: string;
  name: string;
  status: string;
  framework: string;
  ownerUsername: string;
  createdAt: string;
}

interface MyAgent {
  id: string;
  name: string;
  status: string;
  framework: string;
  teamId?: string | null;
}

/* ── Helpers ─────────────────────────────────────────────── */
function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    owner: { bg: 'bg-cyan-500/15 border-cyan-500/30', text: 'text-cyan-400', icon: <Crown className="w-3 h-3" /> },
    admin: { bg: 'bg-purple-500/15 border-purple-500/30', text: 'text-purple-400', icon: <Shield className="w-3 h-3" /> },
    member: { bg: 'bg-blue-500/15 border-blue-500/30', text: 'text-blue-400', icon: <User className="w-3 h-3" /> },
    viewer: { bg: 'bg-gray-500/15 border-gray-500/30', text: 'text-gray-400', icon: <Eye className="w-3 h-3" /> },
  };
  const s = styles[role] ?? styles.viewer;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.text}`}>
      {s.icon}
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'active' ? 'bg-green-400' : status === 'sleeping' ? 'bg-amber-400' : 'bg-gray-500';
  return <span className={`w-2 h-2 rounded-full ${color}`} />;
}

/* ── Page ─────────────────────────────────────────────────── */
export default function TeamPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamAgents, setTeamAgents] = useState<TeamAgent[]>([]);
  const [myAgents, setMyAgents] = useState<MyAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create team form
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<'leave' | 'delete' | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const teamsRes = await api.getMyTeams();
      if (teamsRes.success && teamsRes.data.length > 0) {
        const t = teamsRes.data[0];
        // Fetch full team details
        const teamRes = await api.getTeam(t.id);
        if (teamRes.success) {
          setTeam(teamRes.data as Team);
          // Fetch team agents
          const agentsRes = await api.getTeamAgents(t.id);
          if (agentsRes.success) setTeamAgents(agentsRes.data as TeamAgent[]);
        }
      } else {
        setTeam(null);
      }
      // Fetch my agents for sharing
      const myRes = await api.getMyAgents();
      if (myRes.success) setMyAgents(myRes.data as MyAgent[]);
    } catch {
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated, fetchData]);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await api.createTeam(teamName.trim());
      if (res.success) {
        await fetchData();
        setTeamName('');
      } else {
        setError(res.error);
      }
    } catch {
      setError('Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !team) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const res = await api.inviteTeamMember(team.id, inviteEmail.trim(), inviteRole);
      if (res.success) {
        setInviteSuccess(`Invited ${inviteEmail.trim()} as ${inviteRole}`);
        setInviteEmail('');
        await fetchData();
      } else {
        setInviteError(res.error);
      }
    } catch {
      setInviteError('Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!team) return;
    setActionLoading(memberId);
    try {
      const res = await api.removeTeamMember(team.id, memberId);
      if (res.success) await fetchData();
      else setError(res.error);
    } catch {
      setError('Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveTeam = async () => {
    if (!team || !user) return;
    const myMembership = team.members.find((m) => m.userId === user.id);
    if (!myMembership) return;
    setConfirmDialog(null);
    setActionLoading('leave');
    try {
      const res = await api.removeTeamMember(team.id, myMembership.id);
      if (res.success) {
        setTeam(null);
        setTeamAgents([]);
      } else {
        setError(res.error);
      }
    } catch {
      setError('Failed to leave team');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTeam = async () => {
    if (!team) return;
    setConfirmDialog(null);
    setActionLoading('delete');
    try {
      const res = await api.deleteTeam(team.id);
      if (res.success) {
        setTeam(null);
        setTeamAgents([]);
      } else {
        setError(res.error);
      }
    } catch {
      setError('Failed to delete team');
    } finally {
      setActionLoading(null);
    }
  };

  const handleShareAgent = async (agentId: string) => {
    if (!team) return;
    setActionLoading(`share-${agentId}`);
    try {
      const res = await api.shareAgentWithTeam(team.id, agentId);
      if (res.success) await fetchData();
      else setError(res.error);
    } catch {
      setError('Failed to share agent');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnshareAgent = async (agentId: string) => {
    if (!team) return;
    setActionLoading(`unshare-${agentId}`);
    try {
      const res = await api.unshareAgentFromTeam(team.id, agentId);
      if (res.success) await fetchData();
      else setError(res.error);
    } catch {
      setError('Failed to unshare agent');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async (memberId: string, role: string) => {
    if (!team) return;
    setActionLoading(`role-${memberId}`);
    try {
      const res = await api.updateTeamMemberRole(team.id, memberId, role);
      if (res.success) await fetchData();
      else setError(res.error);
    } catch {
      setError('Failed to update role');
    } finally {
      setActionLoading(null);
    }
  };

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className={cardClass + ' p-8 text-center max-w-sm'}>
          <Users className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
          <p className="text-[var(--text-primary)] font-medium mb-2">Sign in to access Teams</p>
          <p className="text-sm text-[var(--text-secondary)]">Teams let you collaborate with others on your AI agents.</p>
        </div>
      </div>
    );
  }

  const isOwner = team?.myRole === 'owner';
  const isAdmin = team?.myRole === 'admin' || isOwner;

  return (
    <motion.div
      className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3" style={displayFont}>
          <Users className="w-6 h-6 text-cyan-400" />
          Team Collaboration
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Create a team to share agents and collaborate with others.
        </p>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-[var(--text-primary)]">&times;</button>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      ) : !team ? (
        /* ── No Team — Create Form ──────────────────────────── */
        <motion.div variants={itemVariants} className={cardClass + ' p-8 max-w-lg mx-auto text-center'}>
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-5">
            <Users className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2" style={displayFont}>Create Your Team</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Start collaborating by creating a team. You can then invite members and share your agents.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Team name..."
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
              maxLength={50}
            />
            <button
              onClick={handleCreateTeam}
              disabled={creating || !teamName.trim()}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
            </button>
          </div>
        </motion.div>
      ) : (
        /* ── Team Dashboard ─────────────────────────────────── */
        <div className="space-y-6">
          {/* Team Info */}
          <motion.div variants={itemVariants} className={cardClass + ' p-6'}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]" style={displayFont}>{team.name}</h2>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-[var(--text-secondary)]">{team.members.length} member{team.members.length !== 1 ? 's' : ''}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{team.agentCount} agent{team.agentCount !== 1 ? 's' : ''} shared</span>
                    <RoleBadge role={team.myRole} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isOwner && (
                  <button
                    onClick={() => setConfirmDialog('leave')}
                    disabled={actionLoading === 'leave'}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 border border-amber-500/20 hover:bg-amber-500/10 transition-colors flex items-center gap-1.5"
                  >
                    {actionLoading === 'leave' ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                    Leave
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={() => setConfirmDialog('delete')}
                    disabled={actionLoading === 'delete'}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
                  >
                    {actionLoading === 'delete' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Delete Team
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Members Section */}
          <motion.div variants={itemVariants} className={cardClass + ' p-6'}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2" style={displayFont}>
              <User className="w-4 h-4 text-cyan-400" />
              Members
            </h3>
            <div className="space-y-2">
              {team.members
                .sort((a, b) => {
                  const order: Record<string, number> = { owner: 0, admin: 1, member: 2, viewer: 3 };
                  return (order[a.role] ?? 4) - (order[b.role] ?? 4);
                })
                .map((member) => {
                  const isSelf = member.userId === user?.id;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--border-default)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                          {member.user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm text-[var(--text-primary)] font-medium">
                            {member.user.username}
                            {isSelf && <span className="text-[var(--text-secondary)] font-normal ml-1">(you)</span>}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && member.role !== 'owner' && !isSelf && (
                          <div className="relative">
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                              disabled={actionLoading === `role-${member.id}`}
                              className="appearance-none bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md px-2 py-1 pr-6 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer"
                            >
                              {isOwner && (
                                <option value="admin" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Admin</option>
                              )}
                              <option value="member" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Member</option>
                              <option value="viewer" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Viewer</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-[var(--text-muted)] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        )}
                        <RoleBadge role={member.role} />
                        {isAdmin && member.role !== 'owner' && !isSelf && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={actionLoading === member.id}
                            className="p-1.5 rounded-md text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Remove member"
                          >
                            {actionLoading === member.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Invite form */}
            {isAdmin && (
              <div className="mt-5 pt-4 border-t border-[var(--border-default)]">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  Invite Member
                </h4>
                {inviteError && (
                  <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {inviteError}
                  </div>
                )}
                {inviteSuccess && (
                  <div className="mb-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
                    {inviteSuccess}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Email address..."
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                  <div className="relative">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'viewer')}
                      className="appearance-none h-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 pr-7 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
                    >
                      {/* Native <option> elements inherit the OS/browser chrome
                          (white-on-white on dark Chromium) unless we set explicit
                          background-color + color. Inline style wins over the
                          dropdown popup stylesheet on every engine. */}
                      {isOwner && (
                        <option value="admin" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Admin</option>
                      )}
                      <option value="member" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Member</option>
                      <option value="viewer" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Viewer</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <button
                    onClick={handleInvite}
                    disabled={inviting || !inviteEmail.trim()}
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-1.5"
                  >
                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Invite
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Shared Agents */}
          <motion.div variants={itemVariants} className={cardClass + ' p-6'}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2" style={displayFont}>
              <Bot className="w-4 h-4 text-cyan-400" />
              Shared Agents
            </h3>

            {teamAgents.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-4 text-center">No agents shared with this team yet.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {teamAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--border-default)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <StatusDot status={agent.status} />
                      <div>
                        <span className="text-sm text-[var(--text-primary)] font-medium">{agent.name}</span>
                        <span className="text-xs text-[var(--text-muted)] ml-2">by {agent.ownerUsername}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">{agent.framework}</span>
                      {isAdmin && (
                        <button
                          onClick={() => handleUnshareAgent(agent.id)}
                          disabled={actionLoading === `unshare-${agent.id}`}
                          className="p-1.5 rounded-md text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Unshare agent"
                        >
                          {actionLoading === `unshare-${agent.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Share my agents */}
            {myAgents.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" />
                  Your Agents
                </h4>
                <div className="space-y-1.5">
                  {myAgents.map((agent) => {
                    const isShared = teamAgents.some((ta) => ta.id === agent.id);
                    return (
                      <div
                        key={agent.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]"
                      >
                        <div className="flex items-center gap-3">
                          <StatusDot status={agent.status} />
                          <span className="text-sm text-[var(--text-primary)]">{agent.name}</span>
                          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">{agent.framework}</span>
                        </div>
                        <button
                          onClick={() => isShared ? handleUnshareAgent(agent.id) : handleShareAgent(agent.id)}
                          disabled={actionLoading === `share-${agent.id}` || actionLoading === `unshare-${agent.id}`}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                            isShared
                              ? 'text-amber-400 border border-amber-500/20 hover:bg-amber-500/10'
                              : 'text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/10'
                          }`}
                        >
                          {(actionLoading === `share-${agent.id}` || actionLoading === `unshare-${agent.id}`) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Share2 className="w-3 h-3" />
                          )}
                          {isShared ? 'Unshare' : 'Share'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={confirmDialog === 'leave'}
        title="Leave Team"
        description="Are you sure you want to leave this team? You will lose access to all shared agents."
        confirmLabel="Leave Team"
        variant="warning"
        loading={actionLoading === 'leave'}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={handleLeaveTeam}
      />
      <ConfirmDialog
        open={confirmDialog === 'delete'}
        title="Delete Team"
        description="Are you sure you want to permanently delete this team? All shared agents will be unshared."
        confirmLabel="Delete Team"
        variant="danger"
        loading={actionLoading === 'delete'}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={handleDeleteTeam}
      />
    </motion.div>
  );
}
