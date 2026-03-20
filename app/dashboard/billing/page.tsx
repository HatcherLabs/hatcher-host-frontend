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
import { RobotMascot } from '@/components/ui/RobotMascot';
import { CheckCircle, Lock, Shield, CreditCard, Wallet, Layers, Clock, TrendingUp, RefreshCw, Zap, Package } from 'lucide-react';
import { CREDIT_PACKS } from '@hatcher/shared';
import type { CreditPack } from '@hatcher/shared';

function StatusBadge({ status }: { status: Payment['status'] }) {
  const styles: Record<Payment['status'], string> = {
    confirmed: 'bg-green-500/10 text-green-400 border border-green-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse',
    failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
  };
  const icons: Record<Payment['status'], string> = {
    confirmed: '',
    pending: '',
    failed: '',
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

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFeatureKey(key: string) {
  return key.replace(/_/g, ' ').replace(/\./g, ' > ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getExpiryCountdown(expiresAt: string | null): { text: string; urgent: boolean } | null {
  if (!expiresAt) return null;
  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  const diff = exp - now;
  if (diff <= 0) return { text: 'Expired', urgent: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 7) return { text: `${days}d remaining`, urgent: false };
  if (days > 0) return { text: `${days}d ${hours}h remaining`, urgent: days <= 3 };
  return { text: `${hours}h remaining`, urgent: true };
}

const cardClass = 'card glass-noise';

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

  // Load account features
  useEffect(() => {
    if (!isAuthenticated) return;
    setAccountFeaturesLoading(true);
    api.getAccountFeatures().then((res) => {
      setAccountFeaturesLoading(false);
      if (res.success) {
        setActiveAccountFeatures(res.data.activeFeatures);
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

  // Fetch live SOL price for accurate conversion display
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
        if (acctRes.success) setActiveAccountFeatures(acctRes.data.activeFeatures);
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
        // Refresh subscriptions list
        const subsRes = await api.getSubscriptions();
        if (subsRes.success) setSubscriptions(subsRes.data.subscriptions);
        // Also refresh account features
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  };

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

      <motion.h1 className="text-3xl font-bold mb-8 text-[var(--text-primary)]" variants={itemVariants}>Billing &amp; Payments</motion.h1>

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
                <span className="text-sm font-normal text-[var(--accent-500)]">$HATCH</span>
              </div>
            </div>
            {/* Mini sparkline-style indicator */}
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
            {/* Mini donut / ring */}
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

      {/* Account Features */}
      <div className={`overflow-hidden mb-10 ${cardClass}`}>
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
                          const countdown = getExpiryCountdown(activeData.expiresAt);
                          return countdown ? (
                            <div className={`flex items-center gap-1.5 mt-1 ${countdown.urgent ? 'countdown-urgent' : ''}`}>
                              <Clock size={10} className={countdown.urgent ? 'text-amber-400' : 'text-[var(--text-muted)]'} />
                              <span className={`text-[10px] font-medium ${countdown.urgent ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
                                {countdown.text}
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
      </div>

      {/* Hosted Credit Packs */}
      <motion.div className={`overflow-hidden mb-10 ${cardClass}`} variants={itemVariants}>
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-400" />
            <h2 className="font-semibold text-[var(--text-primary)]">Hosted Credit Packs</h2>
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">Pay with $HATCH → get LLM credits</span>
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
                    <span className="text-2xl font-bold text-amber-400">${pack.hatchUsd}</span>
                    <span className="text-xs text-[var(--text-muted)]">in $HATCH</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    → ${pack.creditsUsd} USD in hosted credits
                  </p>
                  {solPrice !== null && (
                    <p className="text-[10px] text-[var(--text-muted)] mb-3">
                      ≈ {usdToSol(pack.hatchUsd, solPrice)} SOL
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

      {/* Active Subscriptions */}
      {subscriptions.length > 0 && (
        <motion.div className={`overflow-hidden mb-10 ${cardClass}`} variants={itemVariants}>
          <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} className="text-orange-400" />
              <h2 className="font-semibold text-[var(--text-primary)]">Active Subscriptions</h2>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">{subscriptions.length} active</span>
          </div>
          {subsLoading ? (
            <div className="p-8 text-center">
              <div className="text-sm animate-pulse text-[var(--text-muted)]">Loading subscriptions...</div>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-3">
                {subscriptions.map((sub) => {
                  const countdown = getExpiryCountdown(sub.expiresAt);
                  const isRenewing = renewing === sub.id;
                  return (
                    <div
                      key={sub.id}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        countdown?.urgent
                          ? 'border-amber-500/30 bg-amber-500/[0.03]'
                          : 'border-[var(--border-default)]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {sub.pricing?.name ?? formatFeatureKey(sub.featureKey)}
                          </span>
                          {sub.agent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20">
                              {sub.agent.name}
                            </span>
                          )}
                        </div>
                        {countdown && (
                          <div className="flex items-center gap-1.5">
                            <Clock size={10} className={countdown.urgent ? 'text-amber-400' : 'text-[var(--text-muted)]'} />
                            <span className={`text-[10px] font-medium ${countdown.urgent ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
                              {countdown.text}
                            </span>
                          </div>
                        )}
                      </div>
                      {sub.pricing && solPrice !== null && (
                        <button
                          onClick={() => handleRenewSubscription(sub)}
                          disabled={isRenewing}
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-all disabled:opacity-40 ml-4 flex-shrink-0"
                        >
                          {isRenewing ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" />
                              Renewing...
                            </>
                          ) : (
                            <>
                              <RefreshCw size={12} />
                              Renew ${sub.pricing.usdPrice}/mo
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Payment History */}
      <div className={`overflow-hidden ${cardClass}`}>
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <h2 className="font-semibold text-[var(--text-primary)]">Payment History</h2>
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
          <div className="p-16 text-center">
            <RobotMascot size="md" mood="thinking" className="mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2 text-[var(--text-primary)]">No payments yet</h3>
            <p className="text-sm mb-6 text-[var(--text-muted)]">
              Unlock premium features for your agents using $HATCH tokens.
            </p>
            <Link href="/pricing" className="btn-primary text-sm px-6 py-2">
              View Features &amp; Pricing
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full payment-table">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] px-6 py-3.5 text-[var(--text-muted)]">
                    Date
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] px-6 py-3.5 text-[var(--text-muted)]">
                    Agent
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-[0.08em] px-6 py-3.5 text-[var(--text-muted)]">
                    Feature
                  </th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-[0.08em] px-6 py-3.5 text-[var(--text-muted)]">
                    Amount
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
                      {payment.agent?.name
                        ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#f97316]/30 to-[#ea580c]/30 flex items-center justify-center text-[9px] font-bold text-[#f97316]">
                              {payment.agent.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[var(--text-primary)] font-medium">{payment.agent.name}</span>
                          </div>
                        )
                        : payment.agentId
                          ? <span className="font-mono text-xs text-[var(--text-muted)]">{payment.agentId.slice(0, 8)}...</span>
                          : (
                            <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
                              <Shield size={10} /> Account
                            </span>
                          )
                      }
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)]">
                        {formatFeatureKey(payment.featureKey)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                      <span className="text-[var(--accent-400)] font-semibold tabular-nums">
                        {payment.hatchAmount.toLocaleString()}
                      </span>
                      <span className="text-[10px] ml-1 text-[var(--text-muted)] font-medium">$HATCH</span>
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
      </div>
      {/* ── Success toast ─────────────────────────────── */}
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
