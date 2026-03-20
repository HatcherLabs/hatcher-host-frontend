'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/lib/auth-context';
import { api, clearToken } from '@/lib/api';
import { WalletMultiButton } from '@/components/wallet/WalletButton';
import { motion } from 'framer-motion';
import { Copy, Check, Eye, EyeOff, Shield, Bell, Trash2, Bot, Zap, AlertTriangle, Key, Wallet, RefreshCw } from 'lucide-react';

const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function SettingsPage() {
  const router = useRouter();
  const { publicKey, connected, disconnect } = useWallet();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hatcher:pref:notifications');
      return stored !== null ? stored === 'true' : true;
    }
    return true;
  });
  const [emailAlerts, setEmailAlerts] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hatcher:pref:emailAlerts');
      return stored === 'true';
    }
    return false;
  });
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const walletAddress = publicKey?.toString() ?? 'Not connected';
  const apiKeyAvailable = isAuthenticated && connected;

  // Persist preference toggles to localStorage
  useEffect(() => { localStorage.setItem('hatcher:pref:notifications', String(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem('hatcher:pref:emailAlerts', String(emailAlerts)); }, [emailAlerts]);

  // Fetch user profile (API key) from backend
  useEffect(() => {
    if (!isAuthenticated) return;
    api.getProfile().then((res) => {
      if (res.success) setApiKey(res.data.apiKey);
    }).catch(() => {
      // API key fetch failed — non-critical, user can retry
    });
  }, [isAuthenticated]);

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {
      // Fallback for browsers that block clipboard API
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

  // Auth gates
  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-20 h-20 rounded-2xl bg-[#f97316]/15 flex items-center justify-center mx-auto mb-6">
            <Bot size={40} className="text-[#f97316]" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">Connect Your Wallet</h1>
          <p className="mb-8 text-sm text-[var(--text-secondary)]">
            Connect a Solana wallet to view your settings.
          </p>
          <WalletMultiButton />
        </motion.div>
      </div>
    );
  }

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
            Sign a message with your wallet to access settings.
          </p>
          <button className="btn-primary px-8 py-3" onClick={login}>
            Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen p-4 sm:p-6 lg:p-10"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <motion.div variants={cardVariants} className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.06),transparent_60%)] pointer-events-none rounded-2xl" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Settings
          </h1>
          <p className="text-sm mt-1 text-[var(--text-secondary)]">
            Manage your account and preferences
          </p>
        </motion.div>

        {/* Account Section */}
        <motion.div className="card glass-noise p-6" variants={cardVariants}>
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#f97316]/15 flex items-center justify-center">
              <Shield size={16} className="text-[#f97316]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Account
            </h2>
          </div>

          <div className="space-y-5">
            {/* Wallet Address */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
                <Wallet size={12} />
                Wallet Address
              </label>
              <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] transition-all duration-200 hover:border-[rgba(249,115,22,0.3)]">
                <span className="font-mono text-sm truncate mr-3 text-[var(--text-primary)]">
                  {walletAddress}
                </span>
                <button
                  onClick={() => copyToClipboard(walletAddress, 'wallet')}
                  className="flex-shrink-0 p-2 rounded-lg transition-all duration-200 hover:bg-[#f97316]/10 text-[var(--text-muted)] hover:text-[#f97316]"
                  aria-label="Copy wallet address"
                >
                  {copiedField === 'wallet' ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
                      <Check size={16} className="text-green-400" />
                    </motion.div>
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
                <Key size={12} />
                API Key
              </label>
              <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] transition-all duration-200 hover:border-[rgba(249,115,22,0.3)]">
                <span className="font-mono text-sm truncate mr-3 text-[var(--text-primary)]">
                  {apiKeyAvailable && apiKey
                    ? showKey
                      ? apiKey
                      : apiKey.slice(0, 8) + '****************************'
                    : 'Connect wallet to view your API key'}
                </span>
                {apiKeyAvailable && apiKey && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="p-2 rounded-lg transition-all duration-200 hover:bg-[#f97316]/10 text-[var(--text-muted)] hover:text-[#f97316]"
                      aria-label={showKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(apiKey, 'apikey')}
                      className="p-2 rounded-lg transition-all duration-200 hover:bg-[#f97316]/10 text-[var(--text-muted)] hover:text-[#f97316]"
                      aria-label="Copy API key"
                    >
                      {copiedField === 'apikey' ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
                          <Check size={16} className="text-green-400" />
                        </motion.div>
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-[var(--text-muted)]">
                  Use this key to authenticate API requests programmatically.
                </p>
                {apiKeyAvailable && apiKey && (
                  <button
                    disabled={regenerating}
                    onClick={async () => {
                      if (!window.confirm(
                        'Regenerate your API key? The old key will stop working immediately.'
                      )) return;
                      setRegenerating(true);
                      try {
                        const res = await api.regenerateApiKey();
                        if (res.success) {
                          setApiKey(res.data.apiKey);
                          setCopiedField(null);
                        }
                      } catch {
                        // Regeneration failed — non-critical
                      } finally {
                        setRegenerating(false);
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 text-[var(--text-muted)] hover:text-[#f97316] hover:bg-[#f97316]/10"
                  >
                    <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
                    {regenerating ? 'Regenerating...' : 'Regenerate'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Preferences Section */}
        <motion.div className="card glass-noise p-6" variants={cardVariants}>
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#f97316]/15 flex items-center justify-center">
              <Bell size={16} className="text-[#f97316]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Preferences
            </h2>
          </div>

          <div className="space-y-1">
            {/* Notifications Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-white/[0.02]">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Push Notifications
                </p>
                <p className="text-xs mt-0.5 text-[var(--text-muted)]">
                  Receive alerts when agents change status
                </p>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                  notifications
                    ? 'bg-[#f97316] shadow-[0_0_12px_rgba(249,115,22,0.3)]'
                    : 'bg-[rgba(46,43,74,0.6)]'
                }`}
                role="switch"
                aria-checked={notifications}
                aria-label="Toggle push notifications"
              >
                <motion.span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
                  animate={{ x: notifications ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            <div className="mx-3 h-px bg-[rgba(46,43,74,0.3)]" />

            {/* Email Alerts Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-white/[0.02]">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Email Alerts
                </p>
                <p className="text-xs mt-0.5 text-[var(--text-muted)]">
                  Get email summaries of agent activity
                </p>
              </div>
              <button
                onClick={() => setEmailAlerts(!emailAlerts)}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                  emailAlerts
                    ? 'bg-[#f97316] shadow-[0_0_12px_rgba(249,115,22,0.3)]'
                    : 'bg-[rgba(46,43,74,0.6)]'
                }`}
                role="switch"
                aria-checked={emailAlerts}
                aria-label="Toggle email alerts"
              >
                <motion.span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
                  animate={{ x: emailAlerts ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          className="card glass-noise p-6 border-red-500/15"
          variants={cardVariants}
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-red-400">
              Danger Zone
            </h2>
          </div>

          <p className="text-sm mb-5 text-[var(--text-secondary)] leading-relaxed">
            Permanently delete your account and all associated agents. This action cannot be undone.
          </p>

          <button
            disabled={deleting}
            className={`btn-danger ${deleting ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={async () => {
              if (!window.confirm(
                'Are you sure you want to delete your account? This will permanently remove all your agents, data, and payment history. This action CANNOT be undone.'
              )) return;
              setDeleting(true);
              try {
                const res = await api.deleteAccount();
                if (res.success) {
                  clearToken();
                  disconnect();
                  router.push('/');
                } else {
                  alert((res as {error: string}).error || 'Failed to delete account');
                  setDeleting(false);
                }
              } catch {
                alert('Failed to delete account. Please try again.');
                setDeleting(false);
              }
            }}
          >
            <Trash2 size={14} />
            {deleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
