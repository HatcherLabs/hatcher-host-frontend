'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Payment } from '@/lib/api';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/components/ui/EmptyState';
import { TIERS, TIER_ORDER, ADDONS } from '@hatcher/shared';
import type { UserTierKey, AddonKey } from '@hatcher/shared';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle,
  Clock,
  CreditCard,
  Crown,
  Loader2,
  Plus,
  Receipt,
  Rocket,
  Shield,
  Users,
  Wallet,
  X,
  Zap,
  Diamond,
} from 'lucide-react';

/* ── Animation ───────────────────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const cardClass = 'card glass-noise';
const displayFont = { fontFamily: 'var(--font-display), system-ui, sans-serif' };

/* ── Helpers ─────────────────────────────────────────────── */
function StatusBadge({ status }: { status: Payment['status'] }) {
  const styles: Record<Payment['status'], string> = {
    confirmed: 'bg-green-500/10 text-green-400 border border-green-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse',
    failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
    refunded: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'confirmed' ? 'bg-green-400' : status === 'pending' ? 'bg-amber-400' : 'bg-red-400'}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatFeatureKey(key: string) {
  return key.replace(/_/g, ' ').replace(/\./g, ' > ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Payment method modal ─────────────────────────────────── */
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  price: number;
  onPayWithSOL: () => void;
  onPayWithHATCHER: () => void;
  onPayWithCard: () => void;
  onPayWithCredits?: () => void;
  creditBalance: number;
  loading: boolean;
  requiresAgent?: boolean;
  agents?: Array<{ id: string; name: string }>;
  selectedAgentId?: string | null;
  onSelectAgent?: (agentId: string) => void;
}

function PaymentMethodModal({ isOpen, onClose, title, price, onPayWithSOL, onPayWithHATCHER, onPayWithCard, onPayWithCredits, creditBalance, loading, requiresAgent, agents, selectedAgentId, onSelectAgent }: PaymentModalProps) {
  if (!isOpen) return null;
  const canPayWithCredits = creditBalance >= price && price > 0;
  const needsAgentSelection = requiresAgent && !selectedAgentId;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="card glass-noise w-full max-w-md mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
            <h3 className="font-semibold text-[var(--text-primary)]">{requiresAgent ? 'Select Agent' : 'Choose Payment Method'}</h3>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 space-y-3">
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {title} — <span className="font-bold text-[var(--text-primary)]">${price}</span>
            </p>

            {/* Agent selector for per-agent addons */}
            {requiresAgent && (
              <div className="mb-4">
                <label className="block text-xs text-[var(--text-muted)] mb-2">Apply to agent:</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {agents && agents.length > 0 ? agents.map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => onSelectAgent?.(agent.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                        selectedAgentId === agent.id
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--text-primary)]'
                          : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-accent)]/30'
                      }`}
                    >
                      {agent.name}
                    </button>
                  )) : (
                    <p className="text-xs text-[var(--text-muted)] py-2">No agents found. Create an agent first.</p>
                  )}
                </div>
              </div>
            )}

            {/* Pay with Credits */}
            {canPayWithCredits && onPayWithCredits && (
              <button
                onClick={onPayWithCredits}
                disabled={loading || needsAgentSelection}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-green-500/30 hover:border-green-400/50 hover:bg-green-500/[0.05] transition-all disabled:opacity-40"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">$</span>
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Pay with Credits</p>
                  <p className="text-[11px] text-[var(--text-muted)]">${creditBalance.toFixed(2)} available — instant</p>
                </div>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)] ml-auto" />}
              </button>
            )}

            {/* Pay with SOL */}
            <button
              onClick={onPayWithSOL}
              disabled={loading || needsAgentSelection}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/[0.03] transition-all disabled:opacity-40"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#9945FF] to-[#14F195] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">SOL</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Pay with SOL</p>
                <p className="text-[11px] text-[var(--text-muted)]">Solana wallet payment</p>
              </div>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)] ml-auto" />}
            </button>

            {/* Pay with $HATCHER */}
            <button
              onClick={onPayWithHATCHER}
              disabled={loading || needsAgentSelection}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[#f59e0b]/30 hover:bg-[#f59e0b]/[0.03] transition-all disabled:opacity-40"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#f97316] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-extrabold text-[7px] tracking-tight">HATCHER</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Pay with $HATCHER</p>
                <p className="text-[11px] text-[var(--text-muted)]">HATCHER token on Solana</p>
              </div>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)] ml-auto" />}
            </button>

            {/* Pay with Card */}
            <button
              onClick={onPayWithCard}
              disabled={loading || needsAgentSelection}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/[0.03] transition-all disabled:opacity-40"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#635BFF] to-[#A259FF] flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Pay with Card</p>
                <p className="text-[11px] text-[var(--text-muted)]">Credit/debit card via Stripe</p>
              </div>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)] ml-auto" />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Account data shape from new API ─────────────────────── */
interface AccountFeatures {
  tier: string;  // tier key string (e.g. 'free', 'starter', 'pro', 'business')
  tierConfig?: typeof TIERS['free'];  // full tier config object (optional)
  activeAddons: Array<{ key: AddonKey; name: string; expiresAt: string | null }>;
  agentLimit: number;
  agentCount: number;
  subscriptionExpiresAt?: string | null;
  hatchCredits?: number;
}

/* ── Page ─────────────────────────────────────────────────── */
export default function BillingPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  const [accountData, setAccountData] = useState<AccountFeatures | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [purchasingAddon, setPurchasingAddon] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [subscriptionCancelled, setSubscriptionCancelled] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [creditHistory, setCreditHistory] = useState<Array<{
    id: string; amount: number; balance: number; type: string; description: string | null; createdAt: string;
  }>>([]);
  const [userAgents, setUserAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Payment method modal state
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    type: 'subscription' | 'addon';
    tierKey?: UserTierKey;
    addonKey?: AddonKey;
    title: string;
    price: number;
  }>({ isOpen: false, type: 'subscription', title: '', price: 0 });
  const [paymentLoading, setPaymentLoading] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 6000);
  };

  // Handle Stripe redirect success/cancel
  useEffect(() => {
    if (searchParams?.get('success') === 'true') {
      showSuccess('Payment successful! Your account is being upgraded. It may take a moment to reflect.');
      // Clean up URL params
      window.history.replaceState({}, '', '/dashboard/billing');
    }
    if (searchParams?.get('canceled') === 'true') {
      setError('Payment was canceled. No charges were made.');
      window.history.replaceState({}, '', '/dashboard/billing');
    }
  }, [searchParams]);

  const loadAccountData = useCallback(async () => {
    const [acctRes, balRes] = await Promise.all([
      api.getAccountFeatures(),
      api.getCreditBalance(),
    ]);
    if (acctRes.success) {
      setAccountData(acctRes.data as unknown as AccountFeatures);
    }
    if (balRes.success) {
      setCreditBalance(balRes.data.balance);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);

    Promise.all([
      api.getAccountFeatures(),
      api.getPayments(),
      api.getCreditBalance(),
      api.getCreditHistory(10),
      api.getMyAgents(),
    ]).then(([acctRes, payRes, balRes, histRes, agentsRes]) => {
      if (acctRes.success) setAccountData(acctRes.data as unknown as AccountFeatures);
      if (payRes.success) setPayments(payRes.data.payments);
      if (balRes.success) setCreditBalance(balRes.data.balance);
      if (histRes.success) setCreditHistory(histRes.data.transactions);
      if (agentsRes.success && agentsRes.data) {
        const agents = (agentsRes.data as unknown as Array<{ id: string; name: string }>);
        setUserAgents(agents.map(a => ({ id: a.id, name: a.name })));
      }
      if (!acctRes.success) setError(acctRes.error ?? 'Failed to load account');
      setLoading(false);
    }).catch(() => {
      setError('Network error');
      setLoading(false);
    });
  }, [isAuthenticated]);

  /* ── Open payment modal ────────────────────────────────── */
  const openSubscribeModal = (tierKey: UserTierKey) => {
    const tier = TIERS[tierKey];
    setPaymentModal({
      isOpen: true,
      type: 'subscription',
      tierKey,
      title: `Upgrade to ${tier.name}`,
      price: tier.usdPrice,
    });
  };

  const openAddonModal = (addonKey: AddonKey) => {
    const addon = ADDONS.find(a => a.key === addonKey);
    setSelectedAgentId(null);
    setPaymentModal({
      isOpen: true,
      type: 'addon',
      addonKey,
      title: addon?.name ?? 'Add-on',
      price: addon?.usdPrice ?? 0,
    });
  };

  /* ── Subscribe to a tier (SOL payment) ────────────────── */
  const handleSubscribeSOL = async () => {
    const tierKey = paymentModal.tierKey;
    if (!tierKey) return;
    setPaymentLoading(true);
    setSubscribing(tierKey);
    setError(null);
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    try {
      const txSignature = `mock-${Date.now()}`;
      const res = await api.subscribe(tierKey, txSignature);
      if (res.success) {
        await loadAccountData();
        showSuccess(`Subscribed to ${TIERS[tierKey].name}!`);
      } else {
        setError(res.error ?? 'Subscription failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription failed');
    } finally {
      setSubscribing(null);
      setPaymentLoading(false);
    }
  };

  /* ── Subscribe to a tier (HATCHER token payment) ────────── */
  const handleSubscribeHATCHER = async () => {
    const tierKey = paymentModal.tierKey;
    if (!tierKey) return;
    setPaymentLoading(true);
    setSubscribing(tierKey);
    setError(null);
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    try {
      const txSignature = `mock-${Date.now()}`;
      const res = await api.subscribe(tierKey, txSignature, 'hatch');
      if (res.success) {
        await loadAccountData();
        showSuccess(`Subscribed to ${TIERS[tierKey].name} with $HATCHER!`);
      } else {
        setError(res.error ?? 'Subscription failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription failed');
    } finally {
      setSubscribing(null);
      setPaymentLoading(false);
    }
  };

  /* ── Subscribe via Stripe (mock) ──────────────────────── */
  const handleSubscribeStripe = handleSubscribeSOL;

  /* ── Purchase add-on (SOL payment) ────────────────────── */
  const handlePurchaseAddonSOL = async () => {
    const addonKey = paymentModal.addonKey;
    if (!addonKey) return;
    const addonConfig = ADDONS.find(a => a.key === addonKey);
    if (addonConfig?.perAgent && !selectedAgentId) return;
    setPaymentLoading(true);
    setPurchasingAddon(addonKey);
    setError(null);
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    try {
      const txSignature = `mock-${Date.now()}`;
      const res = await api.purchaseAddon(addonKey, txSignature, selectedAgentId ?? undefined);
      if (res.success) {
        await loadAccountData();
        const addon = ADDONS.find(a => a.key === addonKey);
        showSuccess(`${addon?.name ?? 'Add-on'} purchased!`);
      } else {
        setError(res.error ?? 'Purchase failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setPurchasingAddon(null);
      setPaymentLoading(false);
    }
  };

  /* ── Purchase add-on (HATCHER token payment) ──────────── */
  const handlePurchaseAddonHATCHER = async () => {
    const addonKey = paymentModal.addonKey;
    if (!addonKey) return;
    const addonConfig = ADDONS.find(a => a.key === addonKey);
    if (addonConfig?.perAgent && !selectedAgentId) return;
    setPaymentLoading(true);
    setPurchasingAddon(addonKey);
    setError(null);
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    try {
      const txSignature = `mock-${Date.now()}`;
      const res = await api.purchaseAddon(addonKey, txSignature, selectedAgentId ?? undefined, 'hatch');
      if (res.success) {
        await loadAccountData();
        const addon = ADDONS.find(a => a.key === addonKey);
        showSuccess(`${addon?.name ?? 'Add-on'} purchased with $HATCHER!`);
      } else {
        setError(res.error ?? 'Purchase failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setPurchasingAddon(null);
      setPaymentLoading(false);
    }
  };

  /* ── Purchase add-on via Stripe (mock) ──────────────────── */
  const handlePurchaseAddonStripe = handlePurchaseAddonSOL;

  /* ── Subscribe with Credits (mock) ────────────────────── */
  const handleSubscribeCredits = handleSubscribeSOL;

  /* ── Purchase add-on with Credits (mock) ──────────────── */
  const handlePurchaseAddonCredits = handlePurchaseAddonSOL;

  /* ── Cancel Stripe subscription ──────────────────────────── */
  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will keep access until the end of your billing period.')) return;
    setCancellingSubscription(true);
    setError(null);
    try {
      const res = await api.stripeCancelSubscription();
      if (res.success) {
        setSubscriptionCancelled(true);
        await loadAccountData();
        showSuccess('Subscription cancelled. You will keep access until the end of your billing period.');
      } else {
        setError(res.error ?? 'Failed to cancel subscription');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCancellingSubscription(false);
    }
  };

  /* ── Open Stripe billing portal ────────────────────────── */
  const handleOpenPortal = async () => {
    setOpeningPortal(true);
    setError(null);
    try {
      const returnUrl = `${window.location.origin}/dashboard/billing`;
      const res = await api.stripePortal(returnUrl);
      if (res.success) {
        window.location.href = res.data.url;
        return;
      }
      // Portal not configured — redirect to support
      window.location.href = '/support?topic=billing';
    } catch {
      // Portal endpoint unavailable — redirect to support
      window.location.href = '/support?topic=billing';
    } finally {
      setOpeningPortal(false);
    }
  };

  /* ── Legacy direct subscribe handler (for renew button) ── */
  const handleSubscribe = async (tierKey: UserTierKey) => {
    openSubscribeModal(tierKey);
  };

  /* ── Legacy direct addon handler ───────────────────────── */
  const handlePurchaseAddon = async (addonKey: AddonKey) => {
    openAddonModal(addonKey);
  };

  /* ── Loading / auth states ─────────────────────────────── */
  if (authLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)] mx-auto mb-4" />
        <p className="text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Shield className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">Sign In Required</h1>
        <p className="mb-6 text-[var(--text-secondary)]">Sign in to manage your plan and billing.</p>
        <Link href="/login" className="btn-primary">Sign In</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)] mx-auto mb-4" />
        <p className="text-[var(--text-secondary)]">Loading billing...</p>
      </div>
    );
  }

  const currentTier = (accountData?.tier ?? 'free') as UserTierKey;
  const tierConfig = accountData?.tierConfig ?? TIERS[currentTier] ?? TIERS.free;
  const agentCount = accountData?.agentCount ?? 0;
  const agentLimit = accountData?.agentLimit ?? 1;
  const activeAddons = accountData?.activeAddons ?? [];

  return (
    <motion.div
      className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumb */}
      <motion.div className="flex items-baseline gap-2 text-sm mb-8 text-[var(--text-muted)]" variants={itemVariants}>
        <Link href="/dashboard" className="hover:text-[var(--color-accent)] transition-colors duration-200">Dashboard</Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)]">Billing</span>
      </motion.div>

      <motion.h1
        className="text-3xl font-bold mb-8 text-[var(--text-primary)]"
        style={displayFont}
        variants={itemVariants}
      >
        Billing &amp; Plans
      </motion.h1>

      {error && (
        <motion.div variants={itemVariants} className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-sm text-red-400">
          {error}
        </motion.div>
      )}

      {/* ── Credits Balance Card ──────────────────────────── */}
      <motion.div className={`mb-8 ${cardClass}`} variants={itemVariants}>
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-green-400" />
            <h2 className="font-semibold text-[var(--text-primary)]">Credits Balance</h2>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-green-400 tabular-nums" style={{ fontFamily: 'var(--font-mono, "JetBrains Mono"), monospace' }}>
                  ${creditBalance.toFixed(2)}
                </span>
                <span className="text-sm text-[var(--text-muted)]">USD</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Credits can be used for subscriptions, add-ons, and hosted LLM usage.
              </p>
            </div>
          </div>

          {/* Recent credit transactions */}
          {creditHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium mb-3">Recent Transactions</p>
              <div className="space-y-2">
                {creditHistory.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tx.amount > 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="text-[var(--text-secondary)] text-xs truncate">
                        {tx.description ?? tx.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className={`text-xs font-semibold tabular-nums ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}
                        style={{ fontFamily: 'var(--font-mono, "JetBrains Mono"), monospace' }}>
                        {tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap hidden sm:inline">
                        {formatDate(tx.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Current Tier Card ──────────────────────────────── */}
      <motion.div className={`mb-8 ${cardClass}`} variants={itemVariants}>
        <div className="p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: currentTier === 'free'
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))'
                    : 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(6,182,212,0.05))',
                  border: currentTier === 'free'
                    ? '1px solid rgba(34,197,94,0.3)'
                    : '1px solid rgba(6,182,212,0.3)',
                  boxShadow: currentTier === 'free'
                    ? '0 0 24px rgba(34,197,94,0.1)'
                    : '0 0 24px rgba(6,182,212,0.1)',
                }}
              >
                {currentTier === 'founding_member' ? (
                  <Crown className="w-7 h-7 text-[#e11d48]" />
                ) : currentTier === 'pro' ? (
                  <Crown className="w-7 h-7 text-[var(--color-accent)]" />
                ) : currentTier === 'business' ? (
                  <Crown className="w-7 h-7 text-[#ec4899]" />
                ) : currentTier === 'starter' ? (
                  <Zap className="w-7 h-7 text-[var(--color-accent)]" />
                ) : (
                  <Rocket className="w-7 h-7 text-green-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">{tierConfig.name}</h2>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    currentTier === 'free'
                      ? 'text-green-400 bg-green-500/10 border border-green-500/20'
                      : 'text-[var(--color-accent)] bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20'
                  }`}>
                    {currentTier === 'free' ? 'Free Tier' : 'Active'}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  {tierConfig.usdPrice === 0 ? 'No charge' : currentTier === 'founding_member' ? `$${tierConfig.usdPrice} lifetime` : `$${tierConfig.usdPrice} / 30 days`}
                  {` -- ${tierConfig.messagesPerDay === 0 ? 'unlimited' : tierConfig.messagesPerDay} messages/day`}{tierConfig.usdPrice > 0 && ' (BYOK = unlimited)'}
                </p>
                {accountData?.subscriptionExpiresAt && (() => {
                  const expires = new Date(accountData.subscriptionExpiresAt);
                  const daysLeft = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isExpiring = daysLeft <= 7 && daysLeft > 0;
                  const isExpired = daysLeft <= 0;
                  return (
                    <div className="mt-2 space-y-2">
                      <div className={`flex items-center gap-1.5 text-xs ${isExpired ? 'text-red-400' : isExpiring ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
                        <Clock className="w-3 h-3" />
                        {isExpired
                          ? 'Plan expired — renew to keep your tier'
                          : isExpiring
                            ? `Expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''} — renew now`
                            : `Active until ${formatDate(accountData.subscriptionExpiresAt)}`}
                      </div>
                      {(isExpiring || isExpired) && (
                        <button
                          onClick={() => handleSubscribe(currentTier)}
                          disabled={subscribing !== null}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[var(--color-accent)] hover:bg-[#0891b2] disabled:opacity-50 transition-colors"
                        >
                          {subscribing === currentTier ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                          Renew for ${tierConfig.usdPrice}
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Subscription management buttons for paid users */}
            {currentTier !== 'free' && (
              <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
                <button
                  onClick={handleOpenPortal}
                  disabled={openingPortal}
                  title="Manage payment method, invoices, and billing details"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--color-accent)]/30 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 disabled:opacity-50 transition-colors"
                >
                  {openingPortal ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                  Manage Billing
                </button>
                {subscriptionCancelled ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-amber-500/20 text-amber-400 bg-amber-500/5">
                    <Clock className="w-3 h-3" />
                    Cancellation scheduled
                  </span>
                ) : (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancellingSubscription}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-red-500/20 text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                  >
                    {cancellingSubscription ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                    Cancel Plan
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Agent Usage ───────────────────────────────────── */}
      <motion.div className={`mb-8 ${cardClass}`} variants={itemVariants}>
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--color-accent)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Agent Usage</h2>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[var(--text-secondary)]">
              {agentCount} of {agentLimit} agents used
            </span>
            <span className={`text-xs ${agentCount > agentLimit ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
              {agentCount > agentLimit
                ? `${agentCount - agentLimit} over limit`
                : `${agentLimit - agentCount} slot${agentLimit - agentCount !== 1 ? 's' : ''} remaining`}
            </span>
          </div>
          <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((agentCount / agentLimit) * 100, 100)}%`,
                background: agentCount >= agentLimit
                  ? 'linear-gradient(90deg, #ef4444, var(--color-accent))'
                  : 'linear-gradient(90deg, var(--color-accent), #22d3ee)',
              }}
            />
          </div>

          {/* Active add-ons */}
          {activeAddons.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium mb-2">Active Add-ons</p>
              <div className="space-y-2">
                {activeAddons.map((addon, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-[var(--text-secondary)]">{addon.name}</span>
                    </div>
                    {addon.expiresAt && (
                      <span className="text-xs text-[var(--text-muted)]">
                        Expires {formatDate(addon.expiresAt)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Need more agents? */}
          <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
            <a href="#addons" className="text-xs text-[var(--color-accent)] hover:text-[#fed7aa] transition-colors flex items-center gap-1">
              <Plus className="w-3 h-3" />
              Need more agents? Purchase an add-on
            </a>
          </div>
        </div>
      </motion.div>

      {/* ── Upgrade Tier ─────────────────────────────────── */}
      {currentTier !== 'founding_member' && (
        <motion.div className={`mb-8 ${cardClass}`} variants={itemVariants}>
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-[var(--color-accent)]" />
              <h2 className="font-semibold text-[var(--text-primary)]">Upgrade Your Tier</h2>
            </div>
            <Link href="/pricing" className="text-xs text-[var(--color-accent)] hover:text-[#fed7aa] transition-colors duration-200">
              Compare plans &rarr;
            </Link>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              {TIER_ORDER.filter(k => k !== 'free' && TIER_ORDER.indexOf(k) > TIER_ORDER.indexOf(currentTier)).map((tierKey) => {
                const tier = TIERS[tierKey];
                const isSubscribing = subscribing === tierKey;

                return (
                  <div
                    key={tierKey}
                    className={`p-5 rounded-xl border transition-all ${
                      tierKey === 'pro'
                        ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/[0.03]'
                        : 'border-[var(--border-default)] hover:border-[var(--color-accent)]/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[var(--text-primary)]">{tier.name}</h3>
                        {tierKey === 'pro' && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[#0891b2] text-white font-bold uppercase tracking-wider">
                            Popular
                          </span>
                        )}
                      </div>
                      <span className="text-xl font-extrabold text-[var(--text-primary)]">${tier.usdPrice}<span className="text-xs text-[var(--text-muted)] font-normal"> {tierKey === 'founding_member' ? 'lifetime' : '/ 30 days'}</span></span>
                    </div>
                    <div className="space-y-1.5 mb-4">
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-[var(--color-accent)]" />
                        {tier.includedAgents} agent{tier.includedAgents > 1 ? 's' : ''}, {tier.messagesPerDay} messages/day
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-[var(--color-accent)]" />
                        {tier.cpuLimit} CPU, {tier.memoryMb >= 1024 ? `${tier.memoryMb / 1024} GB` : `${tier.memoryMb} MB`} RAM, {tier.storageMb >= 1024 ? `${tier.storageMb / 1024} GB` : `${tier.storageMb} MB`} storage
                      </p>
                      {tier.fileManager && (
                        <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-[var(--color-accent)]" />
                          File Manager + Full Logs
                        </p>
                      )}
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-[var(--color-accent)]" />
                        No auto-sleep
                      </p>
                    </div>
                    <button
                      onClick={() => handleSubscribe(tierKey)}
                      disabled={isSubscribing || subscribing !== null}
                      className="w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-bold transition-all disabled:opacity-40 text-white"
                      style={{
                        background: 'var(--color-accent)',
                        boxShadow: '0 4px 16px rgba(6,182,212,0.3)',
                      }}
                    >
                      {isSubscribing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Upgrade to {tier.name}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Agent Add-ons ────────────────────────────────── */}
      <motion.div id="addons" className={`mb-8 ${cardClass}`} variants={itemVariants}>
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[var(--color-accent)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Agent Add-ons</h2>
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">Stackable on any tier</span>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ADDONS.filter(a => a.key !== 'addon.file_manager').map((addon) => {
              const isBuying = purchasingAddon === addon.key;
              return (
                <div
                  key={addon.key}
                  className="p-4 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-[var(--color-accent)]" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{addon.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                      ${addon.usdPrice}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{addon.type === 'one_time' ? 'one-time' : '/ 30 days'}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    {addon.description}
                  </p>
                  <button
                    onClick={() => handlePurchaseAddon(addon.key as AddonKey)}
                    disabled={isBuying || purchasingAddon !== null}
                    className="w-full inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-[var(--color-accent)]/30 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-all disabled:opacity-40 font-semibold"
                  >
                    {isBuying ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Purchasing...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        Buy for ${addon.usdPrice}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Payment History ──────────────────────────────── */}
      <motion.div className={`overflow-hidden ${cardClass}`} variants={itemVariants}>
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[var(--text-muted)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Payment History</h2>
            {payments.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)] font-semibold">
                {payments.length}
              </span>
            )}
          </div>
          <Link href="/pricing" className="text-xs text-[var(--color-accent)] hover:text-[#fed7aa] transition-colors duration-200">
            View pricing &rarr;
          </Link>
        </div>

        {payments.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No payments yet"
            description="Your payment history will appear here once you purchase a plan or add-ons."
            actionLabel="View Pricing"
            actionHref="/pricing"
          />
        ) : (
          <>
          {/* Mobile: card layout */}
          <div className="sm:hidden p-4 space-y-3">
            {payments.map((payment, index) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.25 }}
                className="p-3 rounded-lg border border-[var(--border-default)] hover:border-[var(--color-accent)]/20 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{formatFeatureKey(payment.featureKey)}</span>
                  <StatusBadge status={payment.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">{formatDate(payment.createdAt)}</span>
                  <span className="text-sm font-semibold text-[var(--text-secondary)] tabular-nums" style={{ fontFamily: 'var(--font-mono, "JetBrains Mono"), monospace' }}>
                    ${Number(payment.usdAmount).toFixed(2)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          {/* Desktop: table layout */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full payment-table">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] px-6 py-3.5 text-[var(--text-muted)]">Date</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] px-6 py-3.5 text-[var(--text-muted)]">Item</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-[0.08em] px-6 py-3.5 text-[var(--text-muted)]">Amount</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-[0.08em] px-6 py-3.5 text-[var(--text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => (
                  <motion.tr
                    key={payment.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.25 }}
                    className="hover:bg-[var(--color-accent)]/[0.03] transition-colors duration-150 border-b border-[var(--border-default)] last:border-b-0"
                  >
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-[var(--text-secondary)]">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-[var(--text-primary)]">
                      {formatFeatureKey(payment.featureKey)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                      <span className="text-[var(--text-secondary)] tabular-nums" style={{ fontFamily: 'var(--font-mono, "JetBrains Mono"), monospace' }}>
                        ${Number(payment.usdAmount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <StatusBadge status={payment.status} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </motion.div>

      {/* Payment method modal */}
      <PaymentMethodModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
        title={paymentModal.title}
        price={paymentModal.price}
        onPayWithSOL={paymentModal.type === 'subscription' ? handleSubscribeSOL : handlePurchaseAddonSOL}
        onPayWithHATCHER={paymentModal.type === 'subscription' ? handleSubscribeHATCHER : handlePurchaseAddonHATCHER}
        onPayWithCard={paymentModal.type === 'subscription' ? handleSubscribeStripe : handlePurchaseAddonStripe}
        onPayWithCredits={paymentModal.type === 'subscription' ? handleSubscribeCredits : handlePurchaseAddonCredits}
        creditBalance={creditBalance}
        loading={paymentLoading}
        requiresAgent={paymentModal.type === 'addon' && ADDONS.find(a => a.key === paymentModal.addonKey)?.perAgent}
        agents={userAgents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={setSelectedAgentId}
      />

      {/* Success toast */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 card glass-noise px-5 py-3 border-l-4 border-green-500 shadow-lg max-w-[calc(100vw-2rem)]"
        >
          <p className="text-sm text-green-400">{successMsg}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
