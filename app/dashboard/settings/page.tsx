'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, clearToken } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/ToastProvider';
import Link from 'next/link';
import {
  User,
  Shield,
  Bell,
  CreditCard,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Key,
  RefreshCw,
  Trash2,
  Loader2,
  Gift,
  Users,
  ExternalLink,
  Lock,
  Save,
  ArrowRight,
} from 'lucide-react';

// ── Animation variants ──────────────────────────────────────
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35 } },
};

const tabContentVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const displayFont = { fontFamily: 'var(--font-display), system-ui, sans-serif' };

// ── Tier badge ──────────────────────────────────────────────
function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    pro: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    basic: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    free: 'bg-white/[0.06] text-[var(--text-muted)] border-white/[0.08]',
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${styles[tier] ?? styles.free}`}>
      {tier}
    </span>
  );
}

// ── Avatar initials ─────────────────────────────────────────
function getAvatarColor(name: string) {
  const colors = ['#06b6d4', '#8b5cf6', '#10b981', '#f43f5e', '#6366f1', '#14b8a6', '#eab308'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ── Toggle Switch ───────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 cursor-pointer ${checked ? 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.3)]' : 'bg-white/[0.08]'}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      <motion.span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

// ── Input field ─────────────────────────────────────────────
function Field({
  label, value, onChange, type = 'text', placeholder, hint, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; hint?: string; disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  const inputType = type === 'password' ? (show ? 'text' : 'password') : type;
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="input w-full h-10 px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-[var(--text-muted)] mt-1">{hint}</p>}
    </div>
  );
}

// ── Section wrapper ─────────────────────────────────────────
function Section({ title, icon, iconColor = 'text-cyan-400', iconBg = 'bg-cyan-500/15', children }: {
  title: string; icon: React.ReactNode; iconColor?: string; iconBg?: string; children: React.ReactNode;
}) {
  return (
    <div className="card glass-noise p-6">
      <div className="flex items-center gap-2.5 mb-6">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]" style={displayFont}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Tab definition ──────────────────────────────────────────
const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'security',      label: 'Security',      icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing',       label: 'Billing',       icon: CreditCard },
  { id: 'danger',        label: 'Danger Zone',   icon: AlertTriangle },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ═══════════════════════════════════════════════════════════
// Settings Page
// ═══════════════════════════════════════════════════════════
export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  // ── Profile state ─────────────────────────────────────────
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Password state ────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // ── API key state (multi-key) ─────────────────────────────
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Array<{
    id: string; label: string; prefix: string;
    lastUsedAt: string | null; revokedAt: string | null; createdAt: string;
    requestsToday: number; requestsThisWeek: number;
  }>>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ id: string; key: string; label: string } | null>(null);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  // ── Notification prefs (localStorage) ────────────────────
  const [notifPush, setNotifPush] = useState(true);
  const [notifAgentAlerts, setNotifAgentAlerts] = useState(true);
  const [notifBilling, setNotifBilling] = useState(true);

  // ── Billing/profile data ──────────────────────────────────
  const [profile, setProfile] = useState<{
    tier: string; hatchCredits: number; createdAt: string; agentCount?: number;
  } | null>(null);

  // ── Referral state ────────────────────────────────────────
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralShareLink, setReferralShareLink] = useState('');
  const [referralStats, setReferralStats] = useState<{
    totalReferred: number; totalEarned: number; rewardPerReferral: number;
    referrals: Array<{ username: string; date: string; rewardClaimed: boolean }>;
  } | null>(null);
  const [claimingRewards, setClaimingRewards] = useState(false);

  // ── Danger state ──────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Initialise from user context ─────────────────────────
  useEffect(() => {
    if (user) {
      setUsername(user.username ?? '');
      setEmail(user.email ?? '');
    }
  }, [user]);

  // ── Load API keys ─────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    setApiKeysLoading(true);
    api.listApiKeys().then((res) => {
      if (res.success) setApiKeys(res.data.filter((k) => !k.revokedAt));
    }).finally(() => setApiKeysLoading(false));
  }, [isAuthenticated]);

  // ── Load full profile + referral data ─────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    api.getProfile().then((res) => {
      if (res.success) {
        setProfile({
          tier: res.data.tier,
          hatchCredits: res.data.hatchCredits,
          createdAt: res.data.createdAt,
          agentCount: (res.data as any).agentCount,
        });
      }
    });
    api.getReferralCode().then((res) => {
      if (res.success) { setReferralCode(res.data.referralCode); setReferralShareLink(res.data.shareLink); }
    });
    api.getReferralStats().then((res) => {
      if (res.success) setReferralStats(res.data);
    });
  }, [isAuthenticated]);

  // ── Load notification prefs ───────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = localStorage.getItem('hatcher:pref:notifPush');
    const a = localStorage.getItem('hatcher:pref:agentAlerts');
    const b = localStorage.getItem('hatcher:pref:notifBilling');
    if (p !== null) setNotifPush(p === 'true');
    if (a !== null) setNotifAgentAlerts(a === 'true');
    if (b !== null) setNotifBilling(b === 'true');
  }, []);

  useEffect(() => { localStorage.setItem('hatcher:pref:notifPush', String(notifPush)); }, [notifPush]);
  useEffect(() => { localStorage.setItem('hatcher:pref:agentAlerts', String(notifAgentAlerts)); }, [notifAgentAlerts]);
  useEffect(() => { localStorage.setItem('hatcher:pref:notifBilling', String(notifBilling)); }, [notifBilling]);

  // ── Helpers ───────────────────────────────────────────────
  function copy(text: string, field: string) {
    navigator.clipboard.writeText(text).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }).finally(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  // ── Save profile ──────────────────────────────────────────
  async function handleSaveProfile() {
    if (!user) return;
    if (!username.trim() || !email.trim()) { toast('error', 'Username and email are required'); return; }
    setSavingProfile(true);
    try {
      const updates: { username?: string; email?: string } = {};
      if (username !== user.username) updates.username = username;
      if (email !== user.email) updates.email = email;
      if (!Object.keys(updates).length) { toast('info', 'No changes to save'); return; }
      const res = await api.updateProfile(updates);
      if (res.success) toast('success', 'Profile updated');
      else toast('error', (res as any).error || 'Failed to update profile');
    } catch { toast('error', 'Failed to update profile'); }
    finally { setSavingProfile(false); }
  }

  // ── Save password ─────────────────────────────────────────
  async function handleChangePassword() {
    if (!currentPassword) { toast('error', 'Enter your current password'); return; }
    if (newPassword.length < 8) { toast('error', 'New password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast('error', 'Passwords do not match'); return; }
    setSavingPassword(true);
    try {
      const res = await api.updateProfile({ currentPassword, newPassword });
      if (res.success) {
        toast('success', 'Password changed');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        toast('error', (res as any).error || 'Failed to change password');
      }
    } catch { toast('error', 'Failed to change password'); }
    finally { setSavingPassword(false); }
  }

  // ── Delete account ────────────────────────────────────────
  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await api.deleteAccount();
      if (res.success) { clearToken(); logout(); router.push('/'); }
      else { toast('error', (res as any).error || 'Failed to delete account'); setDeleting(false); setShowDeleteConfirm(false); }
    } catch { toast('error', 'Failed to delete account. Please try again.'); setDeleting(false); setShowDeleteConfirm(false); }
  }

  // ── Auth guards ───────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  const avatarColor = getAvatarColor(user?.username ?? 'U');
  const tier = profile?.tier ?? user?.tier ?? 'free';

  // ── Render ────────────────────────────────────────────────
  return (
    <motion.div
      className="min-h-screen p-4 sm:p-6 lg:p-10 relative"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 30% 0%, rgba(139,92,246,0.05), transparent 60%)' }}
      />

      <div className="max-w-4xl mx-auto relative">
        {/* ── Page header ─────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={displayFont}>Settings</h1>
          <p className="text-sm mt-1 text-[var(--text-secondary)]">Manage your account, security, and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Sidebar tabs ──────────────────────────────── */}
          <nav className="lg:w-52 flex-shrink-0">
            <div className="card glass-noise p-2 space-y-0.5 lg:sticky lg:top-6">
              {/* User info */}
              <div className="flex items-center gap-3 px-3 py-3 mb-1 border-b border-[var(--border-default)]">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-base"
                  style={{ backgroundColor: avatarColor + '20', color: avatarColor, border: `1px solid ${avatarColor}30` }}
                >
                  {(user?.username ?? 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user?.username}</p>
                  <TierBadge tier={tier} />
                </div>
              </div>

              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer text-left ${
                    activeTab === id
                      ? id === 'danger'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-[var(--primary-500)]/10 text-[var(--primary-400)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon size={15} className={activeTab === id && id === 'danger' ? 'text-red-400' : undefined} />
                  {label}
                </button>
              ))}
            </div>
          </nav>

          {/* ── Tab content ───────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="space-y-5"
              >

                {/* ════════════════════════════════════════
                    PROFILE TAB
                    ════════════════════════════════════════ */}
                {activeTab === 'profile' && (
                  <>
                    <Section title="Profile" icon={<User size={16} />}>
                      {/* Avatar */}
                      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[var(--border-default)]">
                        <div
                          className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl font-bold shadow-lg"
                          style={{ backgroundColor: avatarColor + '20', color: avatarColor, border: `1px solid ${avatarColor}30` }}
                        >
                          {(user?.username ?? 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.username}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{user?.email}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <TierBadge tier={tier} />
                            {profile?.createdAt && (
                              <span className="text-[10px] text-[var(--text-muted)]">
                                Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Edit fields */}
                      <div className="space-y-4">
                        <Field label="Username" value={username} onChange={setUsername} placeholder="your_username" hint="3–30 characters, letters, numbers, _ or -" />
                        <Field label="Email address" value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
                        <button
                          onClick={handleSaveProfile}
                          disabled={savingProfile}
                          className="clay-btn-primary flex items-center gap-2 px-5 py-2.5 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          {savingProfile ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </Section>

                    {/* Referral */}
                    <Section title="Referral Program" icon={<Gift size={16} />} iconColor="text-emerald-400" iconBg="bg-emerald-500/15">
                      <p className="text-sm text-[var(--text-secondary)] mb-5 leading-relaxed">
                        Invite friends to Hatcher. You both get <span className="text-emerald-400 font-semibold">$2 credit</span> when they create their first agent.
                      </p>
                      {referralCode && (
                        <div className="space-y-3 mb-5">
                          {[
                            { label: 'Referral Code', value: referralCode, field: 'refCode', mono: true },
                            { label: 'Share Link', value: referralShareLink, field: 'refLink', mono: false },
                          ].map(({ label, value, field, mono }) => (
                            <div key={field}>
                              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">{label}</label>
                              <div className="flex items-center gap-2">
                                <div className={`flex-1 h-10 px-3 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] flex items-center truncate ${mono ? 'font-mono tracking-wider text-white' : 'text-[var(--text-secondary)]'}`}>
                                  {value}
                                </div>
                                <button onClick={() => copy(value, field)} className="h-10 w-10 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0">
                                  {copiedField === field ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-[var(--text-muted)]" />}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {referralStats && (
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            {[
                              { label: 'Referred', value: String(referralStats.totalReferred), icon: <Users size={12} />, color: 'text-[var(--text-primary)]' },
                              { label: 'Earned', value: `$${referralStats.totalEarned}`, icon: <Gift size={12} />, color: 'text-emerald-400' },
                            ].map(({ label, value, icon, color }) => (
                              <div key={label} className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 mb-1 text-[var(--text-muted)]">{icon}<span className="text-[10px] font-medium uppercase tracking-wider">{label}</span></div>
                                <p className={`text-xl font-bold ${color}`}>{value}</p>
                              </div>
                            ))}
                          </div>
                          {referralStats.referrals.some((r) => !r.rewardClaimed) && (
                            <button
                              onClick={async () => {
                                setClaimingRewards(true);
                                try {
                                  const res = await api.claimReferralRewards();
                                  if (res.success) {
                                    toast('success', res.data.message);
                                    const s = await api.getReferralStats();
                                    if (s.success) setReferralStats(s.data);
                                  } else toast('error', (res as any).error || 'Failed to claim rewards');
                                } catch { toast('error', 'Failed to claim rewards'); }
                                finally { setClaimingRewards(false); }
                              }}
                              disabled={claimingRewards}
                              className="w-full h-9 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                              {claimingRewards ? <><Loader2 size={13} className="animate-spin" />Claiming...</> : <><Gift size={13} />Claim Pending Rewards</>}
                            </button>
                          )}
                        </div>
                      )}
                    </Section>
                  </>
                )}

                {/* ════════════════════════════════════════
                    SECURITY TAB
                    ════════════════════════════════════════ */}
                {activeTab === 'security' && (
                  <>
                    {/* Change Password */}
                    <Section title="Change Password" icon={<Lock size={16} />}>
                      <div className="space-y-4">
                        <Field label="Current Password" value={currentPassword} onChange={setCurrentPassword} type="password" placeholder="Enter current password" />
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Field label="New Password" value={newPassword} onChange={setNewPassword} type="password" placeholder="Min 8 chars, upper, lower, number" />
                          <Field label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} type="password" placeholder="Repeat new password" />
                        </div>
                        <button
                          onClick={handleChangePassword}
                          disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                          className="clay-btn-primary flex items-center gap-2 px-5 py-2.5 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingPassword ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                          {savingPassword ? 'Changing...' : 'Change Password'}
                        </button>
                      </div>
                    </Section>

                    {/* API Keys (multi-key) */}
                    <Section title="API Keys" icon={<Key size={16} />}>
                      <p className="text-sm text-[var(--text-secondary)] mb-5 leading-relaxed">
                        Create multiple API keys for programmatic access. Each key uses the <code className="font-mono text-xs bg-white/[0.05] px-1.5 py-0.5 rounded text-cyan-400">hk_</code> prefix.
                        The full key is shown <span className="text-amber-400 font-medium">only once</span> at creation.
                      </p>

                      {/* Newly created key — one-time reveal */}
                      {newlyCreatedKey && (
                        <div className="mb-5 p-4 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
                          <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">New key created — copy it now!</p>
                          <p className="text-xs text-[var(--text-muted)] mb-2">{newlyCreatedKey.label}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-9 px-3 rounded-lg bg-white/[0.06] border border-emerald-500/20 flex items-center font-mono text-xs tracking-wider text-white overflow-hidden">
                              {newlyCreatedKey.key}
                            </div>
                            <button
                              onClick={() => copy(newlyCreatedKey.key, 'newKey')}
                              className="h-9 w-9 rounded-lg border border-emerald-500/20 bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                            >
                              {copiedField === 'newKey' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-emerald-400" />}
                            </button>
                            <button
                              onClick={() => setNewlyCreatedKey(null)}
                              className="h-9 w-9 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                              title="Dismiss"
                            >
                              <Trash2 size={13} className="text-[var(--text-muted)]" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Existing keys list */}
                      {apiKeysLoading ? (
                        <div className="flex items-center gap-2 py-4 text-[var(--text-muted)] text-sm">
                          <Loader2 size={14} className="animate-spin" />Loading keys...
                        </div>
                      ) : apiKeys.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)] py-3 mb-4">No API keys yet. Create one below.</p>
                      ) : (
                        <div className="space-y-2 mb-5">
                          {apiKeys.map((k) => (
                            <div key={k.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  {editingKeyId === k.id ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        className="input h-7 px-2 text-xs flex-1"
                                        value={editingLabel}
                                        onChange={(e) => setEditingLabel(e.target.value)}
                                        onKeyDown={async (e) => {
                                          if (e.key === 'Enter') {
                                            const res = await api.renameApiKey(k.id, editingLabel);
                                            if (res.success) {
                                              setApiKeys((prev) => prev.map((x) => x.id === k.id ? { ...x, label: editingLabel } : x));
                                              toast('success', 'Key renamed');
                                            }
                                            setEditingKeyId(null);
                                          } else if (e.key === 'Escape') {
                                            setEditingKeyId(null);
                                          }
                                        }}
                                        autoFocus
                                      />
                                      <button
                                        onClick={async () => {
                                          const res = await api.renameApiKey(k.id, editingLabel);
                                          if (res.success) {
                                            setApiKeys((prev) => prev.map((x) => x.id === k.id ? { ...x, label: editingLabel } : x));
                                            toast('success', 'Key renamed');
                                          }
                                          setEditingKeyId(null);
                                        }}
                                        className="h-7 px-2 text-xs rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors cursor-pointer"
                                      >Save</button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => { setEditingKeyId(k.id); setEditingLabel(k.label); }}
                                      className="text-sm font-medium text-[var(--text-primary)] hover:text-cyan-400 transition-colors text-left cursor-pointer"
                                      title="Click to rename"
                                    >{k.label}</button>
                                  )}
                                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    <code className="text-[11px] font-mono text-[var(--text-muted)]">{k.prefix}</code>
                                    <span className="text-[11px] text-[var(--text-muted)]">
                                      {k.requestsToday} req today · {k.requestsThisWeek} this week
                                    </span>
                                    {k.lastUsedAt && (
                                      <span className="text-[11px] text-[var(--text-muted)]">
                                        Last used {new Date(k.lastUsedAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => copy(k.prefix, `key-${k.id}`)}
                                    className="h-7 w-7 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] flex items-center justify-center transition-colors cursor-pointer"
                                    title="Copy prefix"
                                  >
                                    {copiedField === `key-${k.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-[var(--text-muted)]" />}
                                  </button>
                                  <button
                                    disabled={revokingKeyId === k.id}
                                    onClick={async () => {
                                      setRevokingKeyId(k.id);
                                      try {
                                        const res = await api.revokeApiKey(k.id);
                                        if (res.success) {
                                          setApiKeys((prev) => prev.filter((x) => x.id !== k.id));
                                          toast('success', 'API key revoked');
                                        } else toast('error', 'Failed to revoke key');
                                      } catch { toast('error', 'Failed to revoke key'); }
                                      finally { setRevokingKeyId(null); }
                                    }}
                                    className="h-7 w-7 rounded-lg border border-red-500/20 bg-red-500/[0.04] hover:bg-red-500/[0.12] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                                    title="Revoke key"
                                  >
                                    {revokingKeyId === k.id ? <Loader2 size={12} className="animate-spin text-red-400" /> : <Trash2 size={12} className="text-red-400" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Create new key */}
                      <div className="flex items-center gap-2">
                        <input
                          className="input h-9 px-3 text-sm flex-1"
                          placeholder='Label (e.g. "Production")'
                          value={newKeyLabel}
                          onChange={(e) => setNewKeyLabel(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key !== 'Enter' || !newKeyLabel.trim() || creatingKey) return;
                            setCreatingKey(true);
                            try {
                              const res = await api.createApiKey(newKeyLabel.trim());
                              if (res.success) {
                                setNewlyCreatedKey({ id: res.data.id, key: res.data.key, label: res.data.label });
                                setApiKeys((prev) => [{ id: res.data.id, label: res.data.label, prefix: res.data.prefix, lastUsedAt: null, revokedAt: null, createdAt: res.data.createdAt, requestsToday: 0, requestsThisWeek: 0 }, ...prev]);
                                setNewKeyLabel('');
                                toast('success', 'API key created');
                              } else toast('error', (res as any).error || 'Failed to create key');
                            } catch { toast('error', 'Failed to create key'); }
                            finally { setCreatingKey(false); }
                          }}
                          maxLength={64}
                        />
                        <button
                          disabled={creatingKey}
                          onClick={async () => {
                            if (!newKeyLabel.trim()) { toast('error', 'Enter a label for this key'); return; }
                            setCreatingKey(true);
                            try {
                              const res = await api.createApiKey(newKeyLabel.trim());
                              if (res.success) {
                                setNewlyCreatedKey({ id: res.data.id, key: res.data.key, label: res.data.label });
                                setApiKeys((prev) => [{ id: res.data.id, label: res.data.label, prefix: res.data.prefix, lastUsedAt: null, revokedAt: null, createdAt: res.data.createdAt, requestsToday: 0, requestsThisWeek: 0 }, ...prev]);
                                setNewKeyLabel('');
                                toast('success', 'API key created');
                              } else toast('error', (res as any).error || 'Failed to create key');
                            } catch { toast('error', 'Failed to create key'); }
                            finally { setCreatingKey(false); }
                          }}
                          className="clay-btn-primary flex items-center gap-1.5 px-4 py-2 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {creatingKey ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
                          {creatingKey ? 'Creating...' : 'Create Key'}
                        </button>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-2">Up to 10 active keys. Each key has full API access.</p>
                    </Section>
                  </>
                )}

                {/* ════════════════════════════════════════
                    NOTIFICATIONS TAB
                    ════════════════════════════════════════ */}
                {activeTab === 'notifications' && (
                  <Section title="Notifications" icon={<Bell size={16} />}>
                    <div className="space-y-1">
                      {[
                        { key: 'push', label: 'Push Notifications', desc: 'Browser push notifications for real-time updates', value: notifPush, onChange: setNotifPush },
                        { key: 'agents', label: 'Agent Alerts', desc: 'Get notified when agents change status, crash, or need attention', value: notifAgentAlerts, onChange: setNotifAgentAlerts },
                        { key: 'billing', label: 'Billing Alerts', desc: 'Payment confirmations, subscription renewals, and credits', value: notifBilling, onChange: setNotifBilling },
                      ].map(({ key, label, desc, value, onChange }, i, arr) => (
                        <div key={key}>
                          <div className="flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-white/[0.02]">
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                              <p className="text-xs mt-0.5 text-[var(--text-muted)]">{desc}</p>
                            </div>
                            <Toggle checked={value} onChange={onChange} label={`Toggle ${label}`} />
                          </div>
                          {i < arr.length - 1 && <div className="mx-3 h-px bg-white/[0.04]" />}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* ════════════════════════════════════════
                    BILLING TAB
                    ════════════════════════════════════════ */}
                {activeTab === 'billing' && (
                  <Section title="Billing" icon={<CreditCard size={16} />}>
                    {profile && (
                      <>
                        {/* Current plan */}
                        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Current Plan</span>
                            <TierBadge tier={profile.tier} />
                          </div>
                          <p className="text-2xl font-bold text-[var(--text-primary)] capitalize" style={displayFont}>{profile.tier}</p>
                          <p className="text-sm text-[var(--text-muted)] mt-0.5">
                            {profile.tier === 'free' ? 'Free — up to 1 agent, 20 messages/day' :
                             profile.tier === 'basic' ? '$9.99/mo — 100 messages/day per agent' :
                             '$19.99/mo — 300 messages/day, dedicated resources'}
                          </p>
                        </div>

                        {/* Credits */}
                        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-5">
                          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider block mb-1">Hatch Credits</span>
                          <p className="text-2xl font-bold text-emerald-400" style={displayFont}>${profile.hatchCredits.toFixed(2)}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">Automatically applied at checkout</p>
                        </div>

                        <Link
                          href="/dashboard/billing"
                          className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl btn-cta cursor-pointer"
                        >
                          Manage Billing
                          <ArrowRight size={14} />
                        </Link>
                      </>
                    )}
                  </Section>
                )}

                {/* ════════════════════════════════════════
                    DANGER ZONE TAB
                    ════════════════════════════════════════ */}
                {activeTab === 'danger' && (
                  <div className="card glass-noise p-6" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <AlertTriangle size={16} className="text-red-400" />
                      </div>
                      <h2 className="text-lg font-semibold text-red-400" style={displayFont}>Danger Zone</h2>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-xl border border-red-500/15 bg-red-500/[0.03] p-4">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Delete Account</h3>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                          Permanently remove your account, all agents, payment history, and configuration. This action is irreversible.
                        </p>
                        <button
                          disabled={deleting}
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Trash2 size={14} />
                          {deleting ? 'Deleting...' : 'Delete Account'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Dialogs ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Your Account?"
        description="This will permanently remove all your agents, data, and payment history. This action cannot be undone."
        confirmLabel={deleting ? 'Deleting...' : 'Delete Account'}
        variant="danger"
        loading={deleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
      />
    </motion.div>
  );
}
