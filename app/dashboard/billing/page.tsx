'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Payment } from '@/lib/api';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { EmptyState } from '@/components/ui/EmptyState';
import { TIERS, TIER_ORDER, ADDONS } from '@hatcher/shared';
import type { UserTierKey, AddonKey } from '@hatcher/shared';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle,
  Clock,
  Crown,
  Loader2,
  Plus,
  Receipt,
  Rocket,
  Shield,
  Users,
  Zap,
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

/* ── Account data shape from new API ─────────────────────── */
interface AccountFeatures {
  tier: typeof TIERS['free'];  // full tier config object
  activeAddons: Array<{ key: AddonKey; name: string; expiresAt: string | null }>;
  agentLimit: number;
  agentCount: number;
  subscriptionExpiresAt?: string | null;
  hatchCredits?: number;
}

/* ── Page ─────────────────────────────────────────────────── */
export default function BillingPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [accountData, setAccountData] = useState<AccountFeatures | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [purchasingAddon, setPurchasingAddon] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const loadAccountData = useCallback(async () => {
    const res = await api.getAccountFeatures();
    if (res.success) {
      setAccountData(res.data as unknown as AccountFeatures);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);

    Promise.all([
      api.getAccountFeatures(),
      api.getPayments(),
    ]).then(([acctRes, payRes]) => {
      if (acctRes.success) setAccountData(acctRes.data as unknown as AccountFeatures);
      if (payRes.success) setPayments(payRes.data.payments);
      if (!acctRes.success) setError(acctRes.error ?? 'Failed to load account');
      setLoading(false);
    }).catch(() => {
      setError('Network error');
      setLoading(false);
    });
  }, [isAuthenticated]);

  /* ── Subscribe to a tier (mock payment) ────────────────── */
  const handleSubscribe = async (tierKey: UserTierKey) => {
    setSubscribing(tierKey);
    setError(null);
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
    }
  };

  /* ── Purchase add-on (mock payment) ────────────────────── */
  const handlePurchaseAddon = async (addonKey: AddonKey) => {
    setPurchasingAddon(addonKey);
    setError(null);
    try {
      const txSignature = `mock-${Date.now()}`;
      const res = await api.purchaseAddon(addonKey, txSignature);
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
    }
  };

  /* ── Cancel subscription ───────────────────────────────── */
  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel? Your tier will revert to Free at the end of the billing period.')) return;
    setCancelling(true);
    setError(null);
    try {
      const res = await api.cancelSubscription();
      if (res.success) {
        await loadAccountData();
        showSuccess('Subscription cancelled');
      } else {
        setError(res.error ?? 'Cancel failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setCancelling(false);
    }
  };

  /* ── Loading / auth states ─────────────────────────────── */
  if (authLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f97316] mx-auto mb-4" />
        <p className="text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Shield className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">Sign In Required</h1>
        <p className="mb-6 text-[var(--text-secondary)]">Sign in to manage your subscription and billing.</p>
        <Link href="/login" className="btn-primary">Sign In</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f97316] mx-auto mb-4" />
        <p className="text-[var(--text-secondary)]">Loading billing...</p>
      </div>
    );
  }

  const tierConfig = accountData?.tier ?? TIERS.free;
  const currentTier = (tierConfig.key ?? 'free') as UserTierKey;
  const agentCount = accountData?.agentCount ?? 0;
  const agentLimit = accountData?.agentLimit ?? 1;
  const activeAddons = accountData?.activeAddons ?? [];

  return (
    <motion.div
      className="mx-auto max-w-5xl px-4 py-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumb */}
      <motion.div className="flex items-center gap-2 text-sm mb-8 text-[var(--text-muted)]" variants={itemVariants}>
        <Link href="/dashboard" className="hover:text-[#f97316] transition-colors duration-200">Dashboard</Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)]">Billing</span>
      </motion.div>

      <motion.h1
        className="text-3xl font-bold mb-8 text-[var(--text-primary)]"
        style={displayFont}
        variants={itemVariants}
      >
        Billing &amp; Subscription
      </motion.h1>

      {error && (
        <motion.div variants={itemVariants} className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-sm text-red-400">
          {error}
        </motion.div>
      )}

      {/* ── Current Tier Card ──────────────────────────────── */}
      <motion.div className={`mb-8 ${cardClass}`} variants={itemVariants}>
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: currentTier === 'free'
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))'
                    : 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(249,115,22,0.05))',
                  border: currentTier === 'free'
                    ? '1px solid rgba(34,197,94,0.3)'
                    : '1px solid rgba(249,115,22,0.3)',
                  boxShadow: currentTier === 'free'
                    ? '0 0 24px rgba(34,197,94,0.1)'
                    : '0 0 24px rgba(249,115,22,0.1)',
                }}
              >
                {currentTier === 'pro' ? (
                  <Crown className="w-7 h-7 text-[#f97316]" />
                ) : currentTier === 'unlimited' ? (
                  <Zap className="w-7 h-7 text-[#f97316]" />
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
                      : 'text-[#f97316] bg-[#f97316]/10 border border-[#f97316]/20'
                  }`}>
                    {currentTier === 'free' ? 'Free Tier' : 'Active'}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  {tierConfig.usdPrice === 0 ? 'No charge' : `$${tierConfig.usdPrice}/mo`}
                  {tierConfig.messagesPerDay === 0 ? ' -- Unlimited messages' : ` -- ${tierConfig.messagesPerDay} messages/day`}
                </p>
                {accountData?.subscriptionExpiresAt && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[var(--text-muted)]">
                    <Clock className="w-3 h-3" />
                    Renews {formatDate(accountData.subscriptionExpiresAt)}
                  </div>
                )}
              </div>
            </div>

            {currentTier !== 'free' && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="text-xs px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40 flex-shrink-0"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Agent Usage ───────────────────────────────────── */}
      <motion.div className={`mb-8 ${cardClass}`} variants={itemVariants}>
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#f97316]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Agent Usage</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[var(--text-secondary)]">
              {agentCount} of {agentLimit} agents used
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {agentLimit - agentCount} slot{agentLimit - agentCount !== 1 ? 's' : ''} remaining
            </span>
          </div>
          <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((agentCount / agentLimit) * 100, 100)}%`,
                background: agentCount >= agentLimit
                  ? 'linear-gradient(90deg, #ef4444, #f97316)'
                  : 'linear-gradient(90deg, #f97316, #fb923c)',
              }}
            />
          </div>

          {/* Active add-ons */}
          {activeAddons.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[rgba(46,43,74,0.3)]">
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
          <div className="mt-4 pt-4 border-t border-[rgba(46,43,74,0.3)]">
            <a href="#addons" className="text-xs text-[#f97316] hover:text-[#fed7aa] transition-colors flex items-center gap-1">
              <Plus className="w-3 h-3" />
              Need more agents? Purchase an add-on
            </a>
          </div>
        </div>
      </motion.div>

      {/* ── Upgrade Tier ─────────────────────────────────── */}
      {currentTier !== 'pro' && (
        <motion.div className={`mb-8 ${cardClass}`} variants={itemVariants}>
          <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-[#f97316]" />
              <h2 className="font-semibold text-[var(--text-primary)]">Upgrade Your Tier</h2>
            </div>
            <Link href="/pricing" className="text-xs text-[#f97316] hover:text-[#fed7aa] transition-colors duration-200">
              Compare plans &rarr;
            </Link>
          </div>
          <div className="p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              {TIER_ORDER.filter(k => k !== 'free' && TIER_ORDER.indexOf(k) > TIER_ORDER.indexOf(currentTier)).map((tierKey) => {
                const tier = TIERS[tierKey];
                const isSubscribing = subscribing === tierKey;

                return (
                  <div
                    key={tierKey}
                    className={`p-5 rounded-xl border transition-all ${
                      tierKey === 'pro'
                        ? 'border-[#f97316]/30 bg-[#f97316]/[0.03]'
                        : 'border-[var(--border-default)] hover:border-[#f97316]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[var(--text-primary)]">{tier.name}</h3>
                        {tierKey === 'pro' && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white font-bold uppercase tracking-wider">
                            Popular
                          </span>
                        )}
                      </div>
                      <span className="text-xl font-extrabold text-gradient">${tier.usdPrice}<span className="text-xs text-[var(--text-muted)] font-normal">/mo</span></span>
                    </div>
                    <div className="space-y-1.5 mb-4">
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-[#f97316]" />
                        {tier.includedAgents} agent{tier.includedAgents > 1 ? 's' : ''}, unlimited messages
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-[#f97316]" />
                        {tier.cpuLimit} CPU, {tier.memoryMb >= 1024 ? `${tier.memoryMb / 1024} GB` : `${tier.memoryMb} MB`} RAM, {tier.storageMb >= 1024 ? `${tier.storageMb / 1024} GB` : `${tier.storageMb} MB`} storage
                      </p>
                      {tier.fileManager && (
                        <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-[#f97316]" />
                          File Manager + Full Logs
                        </p>
                      )}
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-[#f97316]" />
                        No auto-sleep
                      </p>
                    </div>
                    <button
                      onClick={() => handleSubscribe(tierKey)}
                      disabled={isSubscribing || subscribing !== null}
                      className="w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-bold transition-all disabled:opacity-40 text-white"
                      style={{
                        background: '#f97316',
                        boxShadow: '0 4px 16px rgba(249,115,22,0.3)',
                      }}
                    >
                      {isSubscribing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Subscribing...
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
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#f97316]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Agent Add-ons</h2>
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">Stackable on any tier</span>
        </div>
        <div className="p-6">
          <div className="grid sm:grid-cols-3 gap-4">
            {ADDONS.map((addon) => {
              const isBuying = purchasingAddon === addon.key;
              return (
                <div
                  key={addon.key}
                  className="p-4 rounded-xl border border-[var(--border-default)] hover:border-[#f97316]/30 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-[#f97316]" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{addon.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-bold text-gradient tabular-nums">
                      ${addon.usdPrice}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">/mo</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    {addon.extraAgents} additional agent slots
                  </p>
                  <button
                    onClick={() => handlePurchaseAddon(addon.key as AddonKey)}
                    disabled={isBuying || purchasingAddon !== null}
                    className="w-full inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-[#f97316]/30 text-[#f97316] hover:bg-[#f97316]/10 transition-all disabled:opacity-40 font-semibold"
                  >
                    {isBuying ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Purchasing...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        Buy for ${addon.usdPrice}/mo
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
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[var(--text-muted)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Payment History</h2>
            {payments.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)] font-semibold">
                {payments.length}
              </span>
            )}
          </div>
          <Link href="/pricing" className="text-xs text-[#f97316] hover:text-[#fed7aa] transition-colors duration-200">
            View pricing &rarr;
          </Link>
        </div>

        {payments.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No payments yet"
            description="Your payment history will appear here once you subscribe or purchase add-ons."
            actionLabel="View Pricing"
            actionHref="/pricing"
          />
        ) : (
          <div className="overflow-x-auto">
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
                    className="hover:bg-[#f97316]/[0.03] transition-colors duration-150 border-b border-[var(--border-default)] last:border-b-0"
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
        )}
      </motion.div>

      {/* Success toast */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50 card glass-noise px-5 py-3 border-l-4 border-green-500 shadow-lg"
        >
          <p className="text-sm text-green-400">{successMsg}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
