'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, clearToken } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/ToastProvider';
import {
  Copy,
  Check,
  Bell,
  Trash2,
  Zap,
  AlertTriangle,
  User,
} from 'lucide-react';

// ── Animation variants ──────────────────────────────────────
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ── Toggle Switch component ─────────────────────────────────
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
        checked
          ? 'bg-[#f97316] shadow-[0_0_12px_rgba(249,115,22,0.3)]'
          : 'bg-[rgba(46,43,74,0.6)]'
      }`}
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

// ── Tier badge colors ───────────────────────────────────────
function getTierStyle(tier: string) {
  switch (tier?.toLowerCase()) {
    case 'pro':
      return 'bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30';
    case 'basic':
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    default:
      return 'bg-[rgba(46,43,74,0.6)] text-[var(--text-muted)] border-white/[0.06]';
  }
}

// ── Avatar background color from username ───────────────────
function getAvatarColor(name: string) {
  const colors = [
    '#f97316', '#8b5cf6', '#06b6d4', '#10b981',
    '#f43f5e', '#6366f1', '#14b8a6', '#eab308',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ═════════════════════════════════════════════════════════════
// Settings Page
// ═════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const { toast } = useToast();

  // ── State ─────────────────────────────────────────────────
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [notifications, setNotifications] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hatcher:pref:notifications');
      return stored !== null ? stored === 'true' : true;
    }
    return true;
  });
  const [agentAlerts, setAgentAlerts] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hatcher:pref:agentAlerts');
      return stored !== null ? stored === 'true' : true;
    }
    return true;
  });

  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const username = user?.username || 'Anonymous';
  const email = user?.email || '';
  const tier = user?.tier || 'free';
  const avatarColor = getAvatarColor(username);

  // ── Persist preferences ───────────────────────────────────
  useEffect(() => { localStorage.setItem('hatcher:pref:notifications', String(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem('hatcher:pref:agentAlerts', String(agentAlerts)); }, [agentAlerts]);

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  // ── Auth gates ────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#f97316] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-20 h-20 rounded-2xl bg-[#f97316]/15 flex items-center justify-center mx-auto mb-6">
            <Zap size={40} className="text-[#f97316]" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">Sign In Required</h1>
          <p className="mb-8 text-sm text-[var(--text-secondary)]">
            Sign in to your account to access settings.
          </p>
          <a href="/login" className="btn-primary px-8 py-3 inline-block">
            Sign In
          </a>
        </motion.div>
      </div>
    );
  }

  // ── Main settings page ────────────────────────────────────
  return (
    <motion.div
      className="min-h-screen p-4 sm:p-6 lg:p-10 relative overflow-hidden"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Subtle background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 30% 0%, rgba(249,115,22,0.05), transparent 60%)',
        }}
      />

      <div className="max-w-3xl mx-auto space-y-6 relative">
        {/* ── Page Header ──────────────────────────────────── */}
        <motion.div variants={cardVariants}>
          <h1
            className="text-2xl font-bold text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            Settings
          </h1>
          <p className="text-sm mt-1 text-[var(--text-secondary)]">
            Manage your account and preferences
          </p>
        </motion.div>

        {/* ════════════════════════════════════════════════════
            1. PROFILE SECTION
            ════════════════════════════════════════════════════ */}
        <motion.div className="card glass-noise p-6" variants={cardVariants}>
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#f97316]/15 flex items-center justify-center">
              <User size={16} className="text-[#f97316]" />
            </div>
            <h2
              className="text-lg font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              Profile
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ backgroundColor: avatarColor + '20', border: `1px solid ${avatarColor}30` }}
            >
              <span
                className="text-2xl font-bold"
                style={{ color: avatarColor }}
              >
                {username.charAt(0).toUpperCase()}
              </span>
            </div>
            {/* Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <p className="text-base font-semibold text-[var(--text-primary)] truncate">
                  {username}
                </p>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getTierStyle(tier)}`}
                >
                  {tier}
                </span>
              </div>
              {email && (
                <p className="text-sm text-[var(--text-muted)] mt-0.5 truncate">
                  {email}
                </p>
              )}
            </div>
          </div>
        </motion.div>


        {/* ════════════════════════════════════════════════════
            3. NOTIFICATIONS SECTION
            ════════════════════════════════════════════════════ */}
        <motion.div className="card glass-noise p-6" variants={cardVariants}>
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#f97316]/15 flex items-center justify-center">
              <Bell size={16} className="text-[#f97316]" />
            </div>
            <h2
              className="text-lg font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              Notifications
            </h2>
          </div>

          <div className="space-y-1">
            {/* Push Notifications */}
            <div className="flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-white/[0.02]">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Push Notifications
                </p>
                <p className="text-xs mt-0.5 text-[var(--text-muted)]">
                  Browser push notifications for real-time updates
                </p>
              </div>
              <Toggle
                checked={notifications}
                onChange={setNotifications}
                label="Toggle push notifications"
              />
            </div>

            <div className="mx-3 h-px bg-[rgba(46,43,74,0.3)]" />

            {/* Agent Alerts */}
            <div className="flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-white/[0.02]">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Agent Alerts
                </p>
                <p className="text-xs mt-0.5 text-[var(--text-muted)]">
                  Get notified when agents change status, crash, or need attention
                </p>
              </div>
              <Toggle
                checked={agentAlerts}
                onChange={setAgentAlerts}
                label="Toggle agent alerts"
              />
            </div>
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════════
            4. DANGER ZONE SECTION
            ════════════════════════════════════════════════════ */}
        <motion.div
          className="card glass-noise p-6"
          style={{ borderColor: 'rgba(239, 68, 68, 0.15)' }}
          variants={cardVariants}
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <h2
              className="text-lg font-semibold text-red-400"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              Danger Zone
            </h2>
          </div>

          <p className="text-sm mb-5 text-[var(--text-secondary)] leading-relaxed">
            Permanently delete your account. This removes all agents, payment history, and configuration. This action cannot be undone.
          </p>

          <button
            disabled={deleting}
            className={`flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-500 ${
              deleting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 size={14} />
            {deleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </motion.div>
      </div>

      {/* ── Confirmation Dialog ─────────────────────────────── */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Your Account?"
        description="This will permanently remove all your agents, data, and payment history. This action cannot be undone."
        confirmLabel={deleting ? 'Deleting...' : 'Delete Account'}
        variant="danger"
        loading={deleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            const res = await api.deleteAccount();
            if (res.success) {
              clearToken();
              logout();
              router.push('/');
            } else {
              toast('error', (res as { error: string }).error || 'Failed to delete account');
              setDeleting(false);
              setShowDeleteConfirm(false);
            }
          } catch {
            toast('error', 'Failed to delete account. Please try again.');
            setDeleting(false);
            setShowDeleteConfirm(false);
          }
        }}
      />
    </motion.div>
  );
}
