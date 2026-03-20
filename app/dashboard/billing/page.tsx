'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Payment } from '@/lib/api';
import { sendSolPayment, usdToSol } from '@/lib/solana-pay';
import Link from 'next/link';
import { WalletMultiButton } from '@/components/wallet/WalletButton';
import { getFeaturesByFramework } from '@hatcher/shared';
import type { FeaturePricing } from '@hatcher/shared';
import { motion } from 'framer-motion';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  CheckCircle, Lock, Shield, CreditCard, Wallet, Layers, Clock,
  TrendingUp, RefreshCw, Zap, Package, Coins, CalendarClock,
  Receipt, ArrowRight,
} from 'lucide-react';
import { CREDIT_PACKS } from '@hatcher/shared';
import type { CreditPack } from '@hatcher/shared';

function StatusBadge({ status }: { status: Payment['status'] }) {
  const styles: Record<Payment['status'], string> = {
    confirmed: 'bg-green-500/10 text-green-400 border border-green-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse',
    failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${styles[status]}`}>
      {status === 'confirmed' && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
      {status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
      {status === 'failed' && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatFeatureKey(key: string) {
  return key.replace(/_/g, ' ').replace(/\./g, ' > ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getExpiryInfo(expiresAt: string | null): { text: string; daysLeft: number; color: string } | null {
  if (!expiresAt) return null;
  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  const diff = exp - now;
  if (diff <= 0) return { text: 'Expired', daysLeft: 0, color: 'text-red-400' };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 14) return { text: `${days}d remaining`, daysLeft: days, color: 'text-green-400' };
  if (days >= 7) return { text: `${days}d ${hours}h remaining`, daysLeft: days, color: 'text-amber-400' };
  if (days > 0) return { text: `${days}d ${hours}h remaining`, daysLeft: days, color: 'text-red-400' };
  return { text: `${hours}h remaining`, daysLeft: 0, color: 'text-red-400' };
}

function getExpiryBorderColor(daysLeft: number): string {
  if (daysLeft > 14) return 'border-[var(--border-default)]';
  if (daysLeft >= 7) return 'border-amber-500/30 bg-amber-500/[0.02]';
  return 'border-red-500/30 bg-red-500/[0.02]';
}

function getExpiryDotColor(daysLeft: number): string {
  if (daysLeft > 14) return 'bg-green-400';
  if (daysLeft >= 7) return 'bg-amber-400';
  return 'bg-red-400';
}

const cardClass = 'card glass-noise';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function BillingPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const wallet = useWallet();
  const { connection } = useConnection();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Account features state
  const [activeAccountFeatures, setActiveAccountFeatures] = useState<Array<{ featureKey: string; type: string; expiresAt: string | null }>>([]);
  const [accountFeaturesLoading, setAccountFeaturesLoading] = useState(false);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [hatchCredits, setHatchCredits] = useState<number>(0);

  // Subscription renewal state
  const [subscriptions, setSubscriptions] = useState<Array<{
    id: string;
    featureKey: string;
    agent: { id: string; name: string; framework: string } | null;
    expiresAt: string;
    pricing: { key: string; name: string; usdPrice: number; type: string } | null;
  }>>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [renewing, setRenewing] = useState<string | null>(null);

  // Credit pack purchase state
  const [buyingPack, setBuyingPack] = useState<string | null>(null);

  const accountFeatureCatalog = getFeaturesByFramework('account');

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    api.getPayments().then((res) => {
      setLoading(false);
      if (res.success) setPayments(res.data.payments);
      else setError(res.error ?? 'Failed to load payments');
    }).catch(() => {
      setLoading(false);
      setError('Network error — is the API running?');
    });
  }, [isAuthenticated]);

  // Load account features + credits balance
  useEffect(() => {
    if (!isAuthenticated) return;
    setAccountFeaturesLoading(true);
    api.getAccountFeatures().then((res) => {
      setAccountFeaturesLoading(false);
      if (res.success) {
        setActiveAccountFeatures(res.data.activeFeatures);
        if (typeof res.data.hatchCredits === 'number') {
          setHatchCredits(res.data.hatchCredits);
        }
      } else {
        setError(res.error ?? 'Failed to load account features');
      }
    }).catch(() => {
      setAccountFeaturesLoading(false);
      setError('Failed to load account features');
    });
  }, [isAuthenticated]);

  // Load expiring subscriptions
  useEffect(() => {
    if (!isAuthenticated) return;
    setSubsLoading(true);
    api.getSubscriptions().then((res) => {
      setSubsLoading(false);
      if (res.success) setSubscriptions(res.data.subscriptions);
    }).catch(() => setSubsLoading(false));
  }, [isAuthenticated]);

  // Fetch live SOL price
  useEffect(() => {
    api.getPrice('sol')
      .then((res) => {
        if (res.success && res.data?.price) setSolPrice(res.data.price);
      })
      .catch(() => {/* keep fallback */});
  }, []);

  const handleUnlockAccountFeature = async (feature: FeaturePricing) => {
    if (!wallet.publicKey || solPrice === null) {
      setUnlockError('Please connect your wallet first.');
      return;
    }
    setUnlocking(feature.key);
    setUnlockError(null);
    try {
      const solAmount = usdToSol(feature.usdPrice, solPrice!);
      const txSignature = await sendSolPayment({ wallet, connection, solAmount });
      const res = await api.unlockFeature(undefined, feature.key, {
        paymentToken: 'sol',
        amount: solAmount,
        txSignature,
      });
      setUnlocking(null);
      if (res.success) {
        const acctRes = await api.getAccountFeatures();
        if (acctRes.success) {
          setActiveAccountFeatures(acctRes.data.activeFeatures);
          if (typeof acctRes.data.hatchCredits === 'number') {
            setHatchCredits(acctRes.data.hatchCredits);
          }
        }
        setSuccessMsg(`${feature.name} unlocked!`);
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setUnlockError(res.error ?? 'Failed to unlock feature');
      }
    } catch (err) {
      setUnlocking(null);
      setUnlockError(err instanceof Error ? err.message : 'Payment failed');
    }
  };

  const handleBuyCreditPack = async (pack: CreditPack) => {
    if (!wallet.publicKey || solPrice === null) {
      setUnlockError('Please connect your wallet first.');
      return;
    }
    setBuyingPack(pack.key);
    setUnlockError(null);
    try {
      const solAmount = usdToSol(pack.hatchUsd, solPrice);
      const txSignature = await sendSolPayment({ wallet, connection, solAmount });
      const res = await api.unlockFeature(undefined, pack.key, {
        paymentToken: 'sol',
        amount: solAmount,
        txSignature,
      });
      setBuyingPack(null);
      if (res.success) {
        // Refresh credits balance
        const acctRes = await api.getAccountFeatures();
        if (acctRes.success && typeof acctRes.data.hatchCredits === 'number') {
          setHatchCredits(acctRes.data.hatchCredits);
        }
        setSuccessMsg(`${pack.label} purchased! Credits added.`);
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setUnlockError(res.error ?? 'Failed to purchase credit pack');
      }
    } catch (err) {
      setBuyingPack(null);
      setUnlockError(err instanceof Error ? err.message : 'Payment failed');
    }
  };

  const handleRenewSubscription = async (sub: typeof subscriptions[0]) => {
    if (!wallet.publicKey || solPrice === null || !sub.pricing) {
      setUnlockError('Please connect your wallet first.');
      return;
    }
    setRenewing(sub.id);
    setUnlockError(null);
    try {
      const solAmount = usdToSol(sub.pricing.usdPrice, solPrice);
      const txSignature = await sendSolPayment({ wallet, connection, solAmount });
      const res = await api.renewFeature(sub.id, {
        paymentToken: 'sol',
        amount: solAmount,
        txSignature,
      });
      setRenewing(null);
      if (res.success) {
        const subsRes = await api.getSubscriptions();
        if (subsRes.success) setSubscriptions(subsRes.data.subscriptions);
        const acctRes = await api.getAccountFeatures();
        if (acctRes.success) setActiveAccountFeatures(acctRes.data.activeFeatures);
        setSuccessMsg('Subscription renewed!');
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setUnlockError(res.error ?? 'Failed to renew subscription');
      }
    } catch (err) {
      setRenewing(null);
      setUnlockError(err instanceof Error ? err.message : 'Renewal failed');
    }
  };

  const activeAccountKeys = new Set(activeAccountFeatures.map((f) => f.featureKey));

  if (authLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="text-4xl mb-4 animate-pulse">&#x1F510;</div>
        <p className="text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="text-5xl mb-6">&#x1F512;</div>
        <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">Connect Your Wallet</h1>
        <p className="mb-6 text-[var(--text-secondary)]">Connect to view billing and payment history.</p>
        <WalletMultiButton />
      </div>
    );
  }

  const confirmedPayments = payments.filter((p) => p.status === 'confirmed');
  const totalSpent = confirmedPayments.reduce((sum, p) => sum + p.hatchAmount, 0);
  const activeFeatures = new Set(confirmedPayments.map((p) => p.featureKey)).size;

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
        style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
        variants={itemVariants}
      >
        Billing &amp; Payments
      </motion.h1>

      {/* Credits Balance Card */}
      <motion.div className={`mb-10 ${cardClass}`} variants={itemVariants}>
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(249,115,22,0.05))',
                border: '1px solid rgba(249,115,22,0.2)',
                boxShadow: '0 0 24px rgba(249,115,22,0.1)',
              }}
            >
              <Coins size={24} className="text-[#f97316]" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">Credits Balance</p>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-3xl font-bold text-[var(--text-primary)] tabular-nums"
                  style={{ fontFamily: 'var(--font-mono, "JetBrains Mono"), monospace' }}
                >
                  ${hatchCredits.toFixed(2)}
                </span>
                <span className="text-sm text-[var(--text-muted)]">USD credits</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Used for hosted LLM calls (Claude Haiku, GPT-4o mini, Gemini Flash)
              </p>
            </div>
          </div>
          <a
            href="#credit-packs"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 flex-shrink-0"
            style={{
              background: '#f97316',
              boxShadow: '0 4px 16px rgba(249,115,22,0.3)',
            }}
          >
            <Zap size={14} />
            Buy Credits
            <ArrowRight size={14} />
          </a>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div className="grid sm:grid-cols-3 gap-4 mb-10" variants={itemVariants}>
        <div className={`stat-card ${cardClass}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#f97316]/15 flex items-center justify-center">
              <Wallet size={18} className="text-[#f97316]" />
            </div>
            <div className="flex-1">
              <div className="stat-label">Total Spent</div>
              <div className="stat-value text-[var(--accent-400)]">
                {totalSpent.toLocaleString()}{' '}
                <span className="text-sm font-normal text-[var(--accent-500)]">tokens</span>
              </div>
            </div>
            <div className="flex items-end gap-[2px] h-6 self-end">
              {[0.3, 0.5, 0.4, 0.7, 0.6, 0.8, 1].map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-[#f97316]/40"
                  style={{ height: `${h * 24}px` }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className={`stat-card ${cardClass}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Layers size={18} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="stat-label">Features Unlocked</div>
              <div className="stat-value">{activeFeatures}</div>
            </div>
            <svg width="32" height="32" viewBox="0 0 32 32" className="progress-ring">
              <circle cx="16" cy="16" r="12" className="progress-ring-bg" strokeWidth="3" />
              <circle
                cx="16" cy="16" r="12"
                className="progress-ring-fill"
                strokeWidth="3"
                stroke="#4ade80"
                strokeDasharray={`${Math.min(activeFeatures / 10, 1) * 75.4} 75.4`}
              />
            </svg>
          </div>
        </div>
        <div className={`stat-card ${cardClass}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center">
              <CreditCard size={18} className="text-orange-400" />
            </div>
            <div className="flex-1">
              <div className="stat-label">Total Payments</div>
              <div className="stat-value">{payments.length}</div>
            </div>
            {confirmedPayments.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full self-end">
                <TrendingUp size={10} />
                {Math.round((confirmedPayments.length / payments.length) * 100)}%
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Active Subscriptions */}
      <motion.div className={`overflow-hidden mb-10 ${cardClass}`} variants={itemVariants}>
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} className="text-[#f97316]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Active Subscriptions</h2>
            {subscriptions.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20 font-semibold">
                {subscriptions.length}
              </span>
            )}
          </div>
          <Link href="/pricing" className="text-xs text-[#f97316] hover:text-[#fed7aa] transition-colors duration-200">
            View all pricing &rarr;
          </Link>
        </div>
        {subsLoading ? (
          <div className="p-8 text-center">
            <div className="text-sm animate-pulse text-[var(--text-muted)]">Loading subscriptions...</div>
          </div>
        ) : subscriptions.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No active subscriptions"
            description="Unlock subscription-based features like dedicated resources, persistent memory, or cron jobs for your agents."
            actionLabel="Browse Features"
            actionHref="/pricing"
          />
        ) : (
          <div className="p-6">
            <div className="space-y-3">
              {subscriptions.map((sub, index) => {
                const expiry = getExpiryInfo(sub.expiresAt);
                const isRenewing = renewing === sub.id;
                const daysLeft = expiry?.daysLeft ?? 999;

                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all gap-3 ${getExpiryBorderColor(daysLeft)}`}
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      {/* Status dot */}
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 sm:mt-0 flex-shrink-0 ${getExpiryDotColor(daysLeft)}`} />

                      <div className="flex-1 min-w-0">
                        {/* Feature name + agent badge */}
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {sub.pricing?.name ?? formatFeatureKey(sub.featureKey)}
                          </span>
                          {sub.agent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20 font-medium">
                              {sub.agent.name}
                            </span>
                          )}
                        </div>

                        {/* Expiry details */}
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          {sub.expiresAt && (
                            <span className="text-[var(--text-muted)]">
                              Expires {formatDate(sub.expiresAt)}
                            </span>
                          )}
                          {expiry && (
                            <span className={`inline-flex items-center gap-1 font-medium ${expiry.color}`}>
                              <Clock size={10} />
                              {expiry.text}
                            </span>
                          )}
                          {sub.pricing && (
                            <span className="text-[var(--text-muted)]">
                              ${sub.pricing.usdPrice}/mo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Renew button */}
                    {sub.pricing && solPrice !== null && (
                      <button
                        onClick={() => handleRenewSubscription(sub)}
                        disabled={isRenewing}
                        className="inline-flex items-center justify-center gap-1.5 text-xs px-4 py-2 rounded-lg border border-[#f97316]/30 text-[#f97316] hover:bg-[#f97316]/10 transition-all disabled:opacity-40 flex-shrink-0 font-semibold"
                      >
                        {isRenewing ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            Renewing...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={12} />
                            Renew
                          </>
                        )}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* Account Features */}
      <motion.div className={`overflow-hidden mb-10 ${cardClass}`} variants={itemVariants}>
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#f97316]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Account Upgrades</h2>
          </div>
          <Link href="/pricing" className="text-xs text-[#f97316] hover:text-[#fed7aa] transition-colors duration-200">
            View all pricing &rarr;
          </Link>
        </div>

        {accountFeaturesLoading ? (
          <div className="p-8 text-center">
            <div className="text-sm animate-pulse text-[var(--text-muted)]">Loading account features...</div>
          </div>
        ) : (
          <div className="p-6">
            {unlockError && (
              <p className="text-xs text-red-400 mb-4">{unlockError}</p>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accountFeatureCatalog.map((feature) => {
                const isActive = activeAccountKeys.has(feature.key);
                const isUnlocking = unlocking === feature.key;
                const activeData = activeAccountFeatures.find((f) => f.featureKey === feature.key);

                return (
                  <div
                    key={feature.key}
                    className={`p-4 rounded-xl border transition-all ${
                      isActive
                        ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
                        : 'border-[var(--border-default)] hover:border-[#f97316]/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-emerald-500/15' : 'bg-white/5'
                      }`}>
                        {isActive ? (
                          <CheckCircle size={16} className="text-emerald-400" />
                        ) : (
                          <Lock size={16} className="text-[var(--text-muted)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[var(--text-primary)]">{feature.name}</span>
                          {isActive && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mb-2">{feature.description}</p>
                        {isActive && activeData?.expiresAt && (() => {
                          const expiry = getExpiryInfo(activeData.expiresAt);
                          return expiry ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Clock size={10} className={expiry.color} />
                              <span className={`text-[10px] font-medium ${expiry.color}`}>
                                {expiry.text}
                              </span>
                            </div>
                          ) : null;
                        })()}
                        {!isActive && (
                          <button
                            onClick={() => handleUnlockAccountFeature(feature)}
                            disabled={isUnlocking || solPrice === null}
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#f97316]/30 text-[#f97316] hover:bg-[#f97316]/10 transition-all disabled:opacity-40"
                          >
                            {isUnlocking ? (
                              'Signing transaction...'
                            ) : solPrice === null ? (
                              'Loading price...'
                            ) : (
                              <>
                                <Lock size={12} />
                                Upgrade for ${feature.usdPrice}/mo ({usdToSol(feature.usdPrice, solPrice)} SOL)
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* Hosted Credit Packs */}
      <motion.div id="credit-packs" className={`overflow-hidden mb-10 ${cardClass}`} variants={itemVariants}>
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-400" />
            <h2 className="font-semibold text-[var(--text-primary)]">Hosted Credit Packs</h2>
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">Pay with tokens &rarr; get LLM credits</span>
        </div>
        <div className="p-6">
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Purchase hosted credits to use premium LLMs (Claude Haiku, GPT-4o mini, Gemini Flash) without bringing your own API key.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {CREDIT_PACKS.map((pack) => {
              const isBuying = buyingPack === pack.key;
              return (
                <div
                  key={pack.key}
                  className="p-4 rounded-xl border border-[var(--border-default)] hover:border-amber-500/30 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Package size={14} className="text-amber-400" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{pack.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span
                      className="text-2xl font-bold text-amber-400 tabular-nums"
                      style={{ fontFamily: 'var(--font-mono, "JetBrains Mono"), monospace' }}
                    >
                      ${pack.hatchUsd}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">in tokens</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    &rarr; ${pack.creditsUsd} USD in hosted credits
                  </p>
                  {solPrice !== null && (
                    <p className="text-[10px] text-[var(--text-muted)] mb-3">
                      &asymp; {usdToSol(pack.hatchUsd, solPrice)} SOL
                    </p>
                  )}
                  <button
                    onClick={() => handleBuyCreditPack(pack)}
                    disabled={isBuying || solPrice === null}
                    className="w-full inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-40"
                  >
                    {isBuying ? 'Signing transaction...' : `Buy for $${pack.hatchUsd}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Payment History */}
      <motion.div className={`overflow-hidden ${cardClass}`} variants={itemVariants}>
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-[var(--text-muted)]" />
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

        {loading ? (
          <div className="p-10 text-center">
            <div className="text-sm animate-pulse text-[var(--text-muted)]">Loading payments...</div>
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No payments yet"
            description="Unlock premium features for your agents using platform tokens. Your transaction history will appear here."
            actionLabel="View Features & Pricing"
            actionHref="/pricing"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full payment-table">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] px-6 py-3.5 text-[var(--text-muted)]">
                    Date
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] px-6 py-3.5 text-[var(--text-muted)]">
                    Feature
                  </th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-[0.08em] px-6 py-3.5 text-[var(--text-muted)]">
                    Amount (USD)
                  </th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-[0.08em] px-6 py-3.5 text-[var(--text-muted)]">
                    Tokens
                  </th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-[0.08em] px-6 py-3.5 text-[var(--text-muted)]">
                    Status
                  </th>
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
                      <div className="flex flex-col">
                        <span>{formatDate(payment.createdAt)}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {new Date(payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[var(--text-primary)]">
                          {formatFeatureKey(payment.featureKey)}
                        </span>
                        {payment.agent?.name ? (
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {payment.agent.name}
                          </span>
                        ) : !payment.agentId ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                            <Shield size={8} /> Account-level
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-[var(--text-muted)]">{payment.agentId.slice(0, 8)}...</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                      <span
                        className="text-[var(--text-secondary)] tabular-nums"
                        style={{ fontFamily: 'var(--font-mono, "JetBrains Mono"), monospace' }}
                      >
                        ${payment.usdAmount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                      <span
                        className="text-[var(--accent-400)] font-semibold tabular-nums"
                        style={{ fontFamily: 'var(--font-mono, "JetBrains Mono"), monospace' }}
                      >
                        {payment.hatchAmount.toLocaleString()}
                      </span>
                      <span className="text-[10px] ml-1 text-[var(--text-muted)]">tokens</span>
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
