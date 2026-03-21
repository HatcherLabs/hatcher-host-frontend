'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/lib/auth-context';
import { api, clearToken } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/ToastProvider';
import Link from 'next/link';
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Shield,
  Bell,
  Trash2,
  Bot,
  Zap,
  AlertTriangle,
  Key,
  Wallet,
  RefreshCw,
  User,
  Plus,
  X,
  Download,
  ChevronDown,
  ExternalLink,
  BarChart3,
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

// ── BYOK Provider list ──────────────────────────────────────
const BYOK_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'google', name: 'Google', placeholder: 'AIza...' },
  { id: 'groq', name: 'Groq', placeholder: 'gsk_...' },
  { id: 'xai', name: 'xAI', placeholder: 'xai-...' },
  { id: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-...' },
] as const;

type ProviderId = (typeof BYOK_PROVIDERS)[number]['id'];

interface StoredKey {
  id: string;
  provider: ProviderId;
  maskedKey: string;
  addedAt: string;
}

// ═════════════════════════════════════════════════════════════
// Settings Page
// ═════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const router = useRouter();
  const { publicKey, connected, disconnect } = useWallet();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();

  // ── Profile state ───────────────────────────────────────
  const [displayName, setDisplayName] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // ── API Key state ───────────────────────────────────────
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  // ── API Usage state ─────────────────────────────────────
  const [apiUsage, setApiUsage] = useState<{ requestsToday: number; limit: number; remaining: number; resetAt: string } | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  // ── BYOK state ──────────────────────────────────────────
  const [byokKeys, setByokKeys] = useState<StoredKey[]>([]);
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKeyProvider, setNewKeyProvider] = useState<ProviderId>('openai');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showNewKeyValue, setShowNewKeyValue] = useState(false);
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);

  // ── Notification state ──────────────────────────────────
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
  const [billingReminders, setBillingReminders] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hatcher:pref:billingReminders');
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

  // ── Danger zone state ───────────────────────────────────
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);

  const walletAddress = user?.walletAddress ?? publicKey?.toString() ?? null;
  const apiKeyAvailable = isAuthenticated;

  // ── Persist preferences ─────────────────────────────────
  useEffect(() => { localStorage.setItem('hatcher:pref:notifications', String(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem('hatcher:pref:agentAlerts', String(agentAlerts)); }, [agentAlerts]);
  useEffect(() => { localStorage.setItem('hatcher:pref:billingReminders', String(billingReminders)); }, [billingReminders]);
  useEffect(() => { localStorage.setItem('hatcher:pref:emailAlerts', String(emailAlerts)); }, [emailAlerts]);

  // ── Fetch user profile ──────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    api.getProfile().then((res) => {
      if (res.success) {
        setApiKey(res.data.apiKey);
        const profile = res.data as Record<string, unknown>;
        if (typeof profile.displayName === 'string') setDisplayName(profile.displayName);
      }
    }).catch(() => {
      // Non-critical
    });

    // Fetch API usage stats
    setUsageLoading(true);
    api.getApiUsage().then((res) => {
      if (res.success) {
        setApiUsage(res.data);
      }
    }).catch(() => {
      // Non-critical — endpoint may not exist yet
    }).finally(() => {
      setUsageLoading(false);
    });
  }, [isAuthenticated]);

  // ── Load BYOK keys from localStorage (UI-only demo) ────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('hatcher:byok:keys');
    if (stored) {
      try { setByokKeys(JSON.parse(stored)); } catch { /* ignore corrupt data */ }
    }
  }, []);

  const persistByokKeys = useCallback((keys: StoredKey[]) => {
    setByokKeys(keys);
    localStorage.setItem('hatcher:byok:keys', JSON.stringify(keys));
  }, []);

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

  function maskKey(key: string): string {
    if (key.length <= 10) return key.slice(0, 3) + '...' + key.slice(-3);
    return key.slice(0, 6) + '...' + key.slice(-6);
  }

  function handleAddByokKey() {
    if (!newKeyValue.trim()) return;
    const newKey: StoredKey = {
      id: crypto.randomUUID(),
      provider: newKeyProvider,
      maskedKey: maskKey(newKeyValue.trim()),
      addedAt: new Date().toISOString(),
    };
    persistByokKeys([...byokKeys, newKey]);
    setNewKeyValue('');
    setShowAddKey(false);
    setShowNewKeyValue(false);
    toast('success', `${BYOK_PROVIDERS.find(p => p.id === newKeyProvider)?.name} key added`);
  }

  function handleRemoveByokKey(id: string) {
    persistByokKeys(byokKeys.filter(k => k.id !== id));
    toast('success', 'API key removed');
  }

  function handleExportData() {
    setExporting(true);
    // Simulate export delay (no real API call)
    setTimeout(() => {
      const data = {
        exportedAt: new Date().toISOString(),
        wallet: walletAddress,
        displayName,
        preferences: { notifications, agentAlerts, billingReminders, emailAlerts },
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hatcher-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      toast('success', 'Data exported successfully');
    }, 800);
  }

  const selectedProvider = BYOK_PROVIDERS.find(p => p.id === newKeyProvider)!;

  // ── Auth gates ──────────────────────────────────────────
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

  // ── Main settings page ──────────────────────────────────
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
            Manage your account, API keys, and preferences
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

          <div className="space-y-5">
            {/* Avatar placeholder */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#252240] border border-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden">
                <span
                  className="text-2xl font-bold"
                  style={{ color: '#f97316' }}
                >
                  {(displayName || user?.username || '?').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {displayName || user?.username || 'Anonymous'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Avatar support coming soon
                </p>
              </div>
            </div>

            {/* Wallet Address (read-only, shown only if linked) */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
                <Wallet size={12} />
                Wallet Address
              </label>
              {walletAddress ? (
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
              ) : (
              <div className="rounded-xl px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                <span className="text-sm text-[var(--text-muted)]">No wallet linked. Connect a wallet when making payments.</span>
              </div>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
                <User size={12} />
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter a display name..."
                className="w-full rounded-xl px-4 py-3 bg-[#252240] border border-white/[0.06] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-200 focus:border-[#f97316]/50 focus:shadow-[0_0_0_2px_rgba(249,115,22,0.1)]"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1.5">
                Shown on your public agent pages
              </p>
            </div>
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════════
            2. API KEYS SECTION
            ════════════════════════════════════════════════════ */}
        <motion.div className="card glass-noise p-6" variants={cardVariants}>
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#f97316]/15 flex items-center justify-center">
              <Key size={16} className="text-[#f97316]" />
            </div>
            <h2
              className="text-lg font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              API Keys
            </h2>
          </div>

          <div className="space-y-6">
            {/* Platform API Key */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
                <Shield size={12} />
                Platform API Key
              </label>
              <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] transition-all duration-200 hover:border-[rgba(249,115,22,0.3)]">
                <span className="font-mono text-sm truncate mr-3 text-[var(--text-primary)]">
                  {apiKeyAvailable && apiKey
                    ? showKey
                      ? apiKey
                      : `hk_${'*'.repeat(20)}...${apiKey.slice(-4)}`
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
                <div className="flex items-center gap-2 flex-shrink-0">
                  {apiKeyAvailable && apiKey && (
                    <button
                      disabled={regenerating}
                      onClick={() => setShowRegenConfirm(true)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 text-[var(--text-muted)] hover:text-[#f97316] hover:bg-[#f97316]/10"
                    >
                      <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
                      {regenerating ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  )}
                  <Link
                    href="/docs/api"
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 text-[var(--text-muted)] hover:text-[#f97316] hover:bg-[#f97316]/10"
                  >
                    <ExternalLink size={12} />
                    View API Docs
                  </Link>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[rgba(46,43,74,0.4)]" />

            {/* BYOK Keys */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    <Key size={12} />
                    Bring Your Own Keys (BYOK)
                  </label>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Add your own LLM provider keys. Always free, never gated.
                  </p>
                </div>
                {!showAddKey && (
                  <button
                    onClick={() => setShowAddKey(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 bg-[#f97316]/10 text-[#f97316] hover:bg-[#f97316]/20"
                  >
                    <Plus size={14} />
                    Add Key
                  </button>
                )}
              </div>

              {/* Existing BYOK keys list */}
              {byokKeys.length > 0 && (
                <div className="space-y-2 mb-4">
                  {byokKeys.map((key) => {
                    const provider = BYOK_PROVIDERS.find(p => p.id === key.provider);
                    return (
                      <div
                        key={key.id}
                        className="flex items-center justify-between rounded-xl px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] group transition-all duration-200 hover:border-[rgba(249,115,22,0.2)]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-semibold px-2 py-1 rounded-md bg-[#f97316]/10 text-[#f97316] flex-shrink-0">
                            {provider?.name ?? key.provider}
                          </span>
                          <span className="font-mono text-sm text-[var(--text-secondary)] truncate">
                            {key.maskedKey}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveByokKey(key.id)}
                          className="flex-shrink-0 p-1.5 rounded-lg transition-all duration-200 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100"
                          aria-label={`Remove ${provider?.name} key`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {byokKeys.length === 0 && !showAddKey && (
                <div className="rounded-xl border border-dashed border-[rgba(46,43,74,0.6)] px-4 py-6 text-center mb-4">
                  <Key size={20} className="mx-auto mb-2 text-[var(--text-muted)] opacity-40" />
                  <p className="text-xs text-[var(--text-muted)]">
                    No BYOK keys added yet. Add a provider key to use your own LLM credits.
                  </p>
                </div>
              )}

              {/* Add new key form */}
              {showAddKey && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-xl border border-[rgba(249,115,22,0.2)] bg-[rgba(249,115,22,0.03)] p-4 space-y-3"
                >
                  {/* Provider selector */}
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] mb-1.5 block">
                      Provider
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setProviderDropdownOpen(!providerDropdownOpen)}
                        className="w-full flex items-center justify-between rounded-xl px-4 py-3 bg-[#252240] border border-white/[0.06] text-sm text-[var(--text-primary)] transition-all duration-200 focus:border-[#f97316]/50 focus:shadow-[0_0_0_2px_rgba(249,115,22,0.1)] outline-none"
                      >
                        <span>{selectedProvider.name}</span>
                        <ChevronDown
                          size={16}
                          className={`text-[var(--text-muted)] transition-transform duration-200 ${
                            providerDropdownOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {providerDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl bg-[#252240] border border-white/[0.06] shadow-xl overflow-hidden"
                        >
                          {BYOK_PROVIDERS.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setNewKeyProvider(p.id);
                                setProviderDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 ${
                                p.id === newKeyProvider
                                  ? 'bg-[#f97316]/10 text-[#f97316]'
                                  : 'text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              {p.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* API key input */}
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-muted)] mb-1.5 block">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showNewKeyValue ? 'text' : 'password'}
                        value={newKeyValue}
                        onChange={(e) => setNewKeyValue(e.target.value)}
                        placeholder={selectedProvider.placeholder}
                        className="w-full rounded-xl px-4 py-3 pr-10 bg-[#252240] border border-white/[0.06] text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-200 focus:border-[#f97316]/50 focus:shadow-[0_0_0_2px_rgba(249,115,22,0.1)]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddByokKey();
                        }}
                      />
                      <button
                        onClick={() => setShowNewKeyValue(!showNewKeyValue)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--text-muted)] hover:text-[#f97316] transition-colors"
                        aria-label={showNewKeyValue ? 'Hide key' : 'Show key'}
                        type="button"
                      >
                        {showNewKeyValue ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Keys are encrypted (AES-256) and never logged or returned after save.
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleAddByokKey}
                      disabled={!newKeyValue.trim()}
                      className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 bg-[#f97316] text-white hover:bg-[#ea580c] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#f97316]/20"
                    >
                      <Plus size={14} />
                      Save Key
                    </button>
                    <button
                      onClick={() => {
                        setShowAddKey(false);
                        setNewKeyValue('');
                        setShowNewKeyValue(false);
                        setProviderDropdownOpen(false);
                      }}
                      className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════════
            2b. API USAGE SECTION
            ════════════════════════════════════════════════════ */}
        <motion.div className="card glass-noise p-6" variants={cardVariants}>
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#f97316]/15 flex items-center justify-center">
              <BarChart3 size={16} className="text-[#f97316]" />
            </div>
            <h2
              className="text-lg font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              API Usage
            </h2>
          </div>

          {usageLoading ? (
            <div className="space-y-3">
              <div className="h-4 w-48 rounded bg-[#252240] animate-pulse" />
              <div className="h-3 w-full rounded-full bg-[#252240] animate-pulse" />
              <div className="h-3 w-32 rounded bg-[#252240] animate-pulse" />
            </div>
          ) : apiUsage ? (
            <div className="space-y-4">
              {/* Usage count */}
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-[var(--text-secondary)]">
                  <span className="text-lg font-bold text-[var(--text-primary)] font-mono">
                    {apiUsage.requestsToday.toLocaleString()}
                  </span>
                  {' / '}
                  <span className="font-mono">{apiUsage.limit.toLocaleString()}</span>
                  {' requests today'}
                </p>
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  {Math.round((apiUsage.requestsToday / apiUsage.limit) * 100)}%
                </span>
              </div>

              {/* Progress bar */}
              {(() => {
                const pct = Math.min((apiUsage.requestsToday / apiUsage.limit) * 100, 100);
                const barColor =
                  pct > 80
                    ? 'bg-[#F87171]'
                    : pct > 50
                      ? 'bg-[#FBBF24]'
                      : 'bg-[#4ADE80]';
                const glowColor =
                  pct > 80
                    ? 'shadow-[0_0_8px_rgba(248,113,113,0.4)]'
                    : pct > 50
                      ? 'shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                      : 'shadow-[0_0_8px_rgba(74,222,128,0.3)]';
                return (
                  <div className="h-2.5 rounded-full bg-[#252240] overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${barColor} ${glowColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />
                  </div>
                );
              })()}

              {/* Reset time & remaining */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--text-muted)]">
                  Resets at midnight UTC
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {apiUsage.remaining.toLocaleString()} remaining
                </p>
              </div>

              {/* Upgrade CTA for free tier (limit <= 100) */}
              {apiUsage.limit <= 100 && (
                <>
                  <div className="h-px bg-[rgba(46,43,74,0.4)]" />
                  <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-[#f97316]/[0.04] border border-[#f97316]/10">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        Need more requests?
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Upgrade to Pro for 10,000 req/day — $15/mo
                      </p>
                    </div>
                    <Link
                      href="/pricing"
                      className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200 bg-[#f97316] text-white hover:bg-[#ea580c] shadow-lg shadow-[#f97316]/20 flex-shrink-0"
                    >
                      <Zap size={12} />
                      Upgrade
                    </Link>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Fallback when endpoint is unavailable — show placeholder */
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-[var(--text-secondary)]">
                  <span className="text-lg font-bold text-[var(--text-primary)] font-mono">0</span>
                  {' / '}
                  <span className="font-mono">100</span>
                  {' requests today'}
                </p>
                <span className="text-xs font-medium text-[var(--text-muted)]">0%</span>
              </div>
              <div className="h-2.5 rounded-full bg-[#252240] overflow-hidden">
                <div className="h-full rounded-full bg-[#4ADE80] w-0" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--text-muted)]">
                  Resets at midnight UTC
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  100 remaining
                </p>
              </div>
              <div className="h-px bg-[rgba(46,43,74,0.4)]" />
              <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-[#f97316]/[0.04] border border-[#f97316]/10">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Need more requests?
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Upgrade to Pro for 10,000 req/day — $15/mo
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200 bg-[#f97316] text-white hover:bg-[#ea580c] shadow-lg shadow-[#f97316]/20 flex-shrink-0"
                >
                  <Zap size={12} />
                  Upgrade
                </Link>
              </div>
            </div>
          )}
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
            {/* Email Notifications */}
            <div className="flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-white/[0.02]">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Email Notifications
                </p>
                <p className="text-xs mt-0.5 text-[var(--text-muted)]">
                  Receive email summaries of agent activity
                </p>
              </div>
              <Toggle
                checked={emailAlerts}
                onChange={setEmailAlerts}
                label="Toggle email notifications"
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

            <div className="mx-3 h-px bg-[rgba(46,43,74,0.3)]" />

            {/* Billing Reminders */}
            <div className="flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-white/[0.02]">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Billing Reminders
                </p>
                <p className="text-xs mt-0.5 text-[var(--text-muted)]">
                  Alerts before subscriptions renew or credits run low
                </p>
              </div>
              <Toggle
                checked={billingReminders}
                onChange={setBillingReminders}
                label="Toggle billing reminders"
              />
            </div>

            <div className="mx-3 h-px bg-[rgba(46,43,74,0.3)]" />

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
            Export your data or permanently delete your account. Deletion removes all agents, payment history, and configuration. This action cannot be undone.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportData}
              disabled={exporting}
              className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[rgba(249,115,22,0.3)] hover:bg-white/[0.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} className={exporting ? 'animate-bounce' : ''} />
              {exporting ? 'Exporting...' : 'Export Data'}
            </button>
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
          </div>
        </motion.div>
      </div>

      {/* ── Confirmation Dialogs ─────────────────────────────── */}
      <ConfirmDialog
        open={showRegenConfirm}
        title="Regenerate API Key?"
        description="The old key will stop working immediately. Any integrations using it will need to be updated."
        confirmLabel={regenerating ? 'Regenerating...' : 'Regenerate Key'}
        variant="warning"
        loading={regenerating}
        onCancel={() => setShowRegenConfirm(false)}
        onConfirm={async () => {
          setRegenerating(true);
          try {
            const res = await api.regenerateApiKey();
            if (res.success) {
              setApiKey(res.data.apiKey);
              setCopiedField(null);
              toast('success', 'API key regenerated successfully');
            } else {
              toast('error', 'Failed to regenerate API key');
            }
          } catch {
            toast('error', 'Failed to regenerate API key. Please try again.');
          } finally {
            setRegenerating(false);
            setShowRegenConfirm(false);
          }
        }}
      />

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
              disconnect();
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
