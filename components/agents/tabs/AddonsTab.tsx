'use client';

// ============================================================
// AddonsTab — buy / extend per-agent add-ons directly from the
// agent dashboard.
//
// Shows all per-agent addons (Always On, +200 msg/day, File Manager)
// with their current status (active / not purchased) and buy / extend
// buttons that open the shared PaymentRailButtons inline.
//
// Account-level addons (agents.3, agents.10) live on the billing page
// because they aren't scoped to a single agent.
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAgentContext } from '../AgentContext';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { ADDONS } from '@hatcher/shared';
import { usePaymentDrivers } from '@/lib/payment-drivers';
import { ConfirmPaymentModal } from '@/components/payments/ConfirmPaymentModal';
import { PaymentRailButtons } from '@/components/payments/PaymentRailButtons';
import { formatFeatureKey } from '@/lib/feature-labels';
import {
  Check,
  Clock,
  Loader2,
  ShieldCheck,
  Zap,
  HardDrive,
  MessageSquarePlus,
  FileText,
  Puzzle,
} from 'lucide-react';

// Per-agent addons that can be bought from the agent's own page.
// Account-level addons (agents, messages, searches, logs, plugins) live
// on the billing page since they aren't scoped to a single agent.
// Hard-coded key whitelist — a stale @hatcher/shared bundle could ship a
// wrong `perAgent` flag (happened once in dev when node_modules was out of
// sync with the package source), which would spill account-level messages
// addons into the per-agent tab. Listing keys keeps the UI deterministic.
const PER_AGENT_ADDON_KEYS = ['addon.always_on', 'addon.file_manager', 'addon.full_logs', 'addon.extra_plugins'] as const;
const PER_AGENT_ADDONS = PER_AGENT_ADDON_KEYS
  .map((k) => ADDONS.find((a) => a.key === k))
  .filter((a): a is typeof ADDONS[number] => Boolean(a));

const ADDON_ICONS: Record<string, React.ElementType> = {
  'addon.always_on': Zap,
  'addon.file_manager': HardDrive,
  'addon.full_logs': FileText,
  'addon.extra_plugins': Puzzle,
};

interface AddonStatus {
  featureKey: string;
  active: boolean;
  expiresAt: string | null;
  type: string;
}

export function AddonsTab() {
  const { agent } = useAgentContext();
  const { user } = useAuth();
  const { confirmState, closeConfirm, driveSol, driveUsdc, driveHatch } = usePaymentDrivers();

  const [statuses, setStatuses] = useState<Map<string, AddonStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  // Tier entitlements — Business/Founding already include File Manager +
  // Full Logs. We mark those addons as "Included" so users don't pay
  // for something their tier already covers.
  const [tierIncludes, setTierIncludes] = useState<{ fileManager: boolean; fullLogs: boolean }>(
    { fileManager: false, fullLogs: false },
  );
  // HATCHER credit balance — powers the "Pay with Credits" rail.
  // Loaded alongside the tier entitlements.
  const [creditBalance, setCreditBalance] = useState<number>(0);
  // Annual toggle only shows up if at least one subscription-type per-agent
  // addon exists. File Manager is one-time so it ignores this completely.
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const computePrice = (monthly: number, isSubscription: boolean) => {
    if (!isSubscription || billingPeriod === 'monthly') return monthly;
    return Math.round(monthly * 12 * 0.85 * 100) / 100;
  };

  const loadStatuses = useCallback(async () => {
    setLoading(true);
    try {
      const [featuresRes, accountRes] = await Promise.all([
        api.getAgentFeatures(agent.id),
        api.getAccountFeatures(),
      ]);
      if (featuresRes.success) {
        const map = new Map<string, AddonStatus>();
        for (const f of featuresRes.data) {
          if (!f.featureKey.startsWith('addon.')) continue;
          const isActive = !f.expiresAt || new Date(f.expiresAt) > new Date();
          if (isActive) {
            map.set(f.featureKey, {
              featureKey: f.featureKey,
              active: true,
              expiresAt: f.expiresAt ?? null,
              type: f.type,
            });
          }
        }
        setStatuses(map);
      }
      if (accountRes.success) {
        setTierIncludes({
          fileManager: accountRes.data.tierConfig?.fileManager === true,
          fullLogs: accountRes.data.tierConfig?.fullLogs === true,
        });
      }
      // Credit balance — the account endpoint exposes hatchCredits on
      // the root response for convenience. Fallback to 0 so the rail
      // cleanly disables itself when it's missing.
      const hatchCredits = accountRes.success ? (accountRes.data.hatchCredits ?? 0) : 0;
      setCreditBalance(Number(hatchCredits));
    } finally {
      setLoading(false);
    }
  }, [agent.id]);

  useEffect(() => { loadStatuses(); }, [loadStatuses]);

  const handlePurchase = async (addonKey: string, rail: 'sol' | 'usdc' | 'hatch') => {
    const addon = PER_AGENT_ADDONS.find((a) => a.key === addonKey);
    if (!addon) return;
    const isSub = addon.type === 'subscription';
    const period: 'monthly' | 'annual' = isSub ? billingPeriod : 'monthly';
    const chargedUsd = computePrice(addon.usdPrice, isSub);
    setPurchasing(addonKey);
    setError(null);
    setSuccess(null);
    try {
      const driver = rail === 'sol' ? driveSol : rail === 'usdc' ? driveUsdc : driveHatch;
      const label = `${addon.name} for ${agent.name}${period === 'annual' ? ' (annual)' : ''}`;
      const txSignature = await driver(chargedUsd, label);
      const res = await api.purchaseAddon(addonKey, txSignature, agent.id, rail, period);
      if (res.success) {
        await loadStatuses();
        setExpandedKey(null);
        setSuccess(`${formatFeatureKey(addonKey)} activated!`);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(res.error ?? 'Purchase failed');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Purchase failed';
      if (msg !== 'Cancelled') setError(msg);
    } finally {
      setPurchasing(null);
    }
  };

  // Stripe hosted checkout — redirects the browser. Return URL lands
  // back on the agent page so the user sees their new entitlement
  // after Stripe's success screen.
  const handlePurchaseCard = async (addonKey: string) => {
    const addon = PER_AGENT_ADDONS.find((a) => a.key === addonKey);
    if (!addon) return;
    const isSub = addon.type === 'subscription';
    const period: 'monthly' | 'annual' = isSub ? billingPeriod : 'monthly';
    setPurchasing(addonKey);
    setError(null);
    try {
      const returnUrl = `${window.location.origin}/dashboard/agent/${agent.id}?tab=addons`;
      const res = await api.stripeCheckoutAddon(addonKey, agent.id, period, returnUrl);
      if (!res.success) {
        setError(res.error ?? 'Stripe checkout failed');
        setPurchasing(null);
        return;
      }
      window.location.href = res.data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stripe checkout failed');
      setPurchasing(null);
    }
  };

  // Credits checkout — settled entirely server-side, no wallet popup.
  // Uses the same stacking / billingPeriod logic as the on-chain path.
  const handlePurchaseCredits = async (addonKey: string) => {
    const addon = PER_AGENT_ADDONS.find((a) => a.key === addonKey);
    if (!addon) return;
    const isSub = addon.type === 'subscription';
    const period: 'monthly' | 'annual' = isSub ? billingPeriod : 'monthly';
    const chargedUsd = computePrice(addon.usdPrice, isSub);
    if (creditBalance < chargedUsd) {
      setError(`Not enough credits. Need $${chargedUsd.toFixed(2)}, have $${creditBalance.toFixed(2)}.`);
      return;
    }
    setPurchasing(addonKey);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.purchaseAddonWithCredits(addonKey, agent.id, period);
      if (res.success) {
        await loadStatuses();
        setExpandedKey(null);
        setSuccess(`${formatFeatureKey(addonKey)} activated with credits! $${res.data.amountDeducted.toFixed(2)} deducted, $${res.data.remainingBalance.toFixed(2)} remaining.`);
        setTimeout(() => setSuccess(null), 6000);
      } else {
        setError(res.error ?? 'Credit payment failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Credit payment failed');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  const hasSubscriptionAddon = PER_AGENT_ADDONS.some((a) => a.type === 'subscription');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-secondary)]">
          Per-agent upgrades for <strong className="text-[var(--text-primary)]">{agent.name}</strong>.
          {' '}Subscription add-ons renew for 30 days (or 365 days on annual); one-time purchases are permanent.
        </p>
        {hasSubscriptionAddon && (
          <div className="inline-flex items-center gap-1 p-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] shrink-0">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                billingPeriod === 'annual'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              Annual
              <span className="inline-flex items-center px-1 py-px rounded-full bg-green-500/15 text-green-400 text-[9px] font-bold leading-none">
                -15%
              </span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
          {success}
        </div>
      )}

      <div className="space-y-3">
        {PER_AGENT_ADDONS.map((addon) => {
          const status = statuses.get(addon.key);
          const isActive = !!status?.active;
          const isOneTime = addon.type === 'one_time';
          const isExpanded = expandedKey === addon.key;
          const isPurchasing = purchasing === addon.key;
          const Icon = ADDON_ICONS[addon.key] ?? ShieldCheck;
          // Map addon → tier flag. If this addon is already bundled into
          // the user's current tier we surface that instead of a Buy
          // button so nobody pays for redundant coverage.
          const includedByTier =
            (addon.key === 'addon.file_manager' && tierIncludes.fileManager)
            || (addon.key === 'addon.full_logs' && tierIncludes.fullLogs);

          return (
            <div
              key={addon.key}
              className={`rounded-xl border transition-all ${
                includedByTier
                  ? 'border-blue-500/30 bg-blue-500/[0.03]'
                  : isActive
                    ? 'border-green-500/30 bg-green-500/[0.03]'
                    : 'border-[var(--border-default)] hover:border-[var(--color-accent)]/30'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    includedByTier ? 'bg-blue-500/15'
                    : isActive ? 'bg-green-500/15'
                    : 'bg-[var(--bg-elevated)]'
                  }`}>
                    <Icon size={16} className={
                      includedByTier ? 'text-blue-400'
                      : isActive ? 'text-green-400'
                      : 'text-[var(--text-muted)]'
                    } />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{addon.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {(addon as typeof addon & { description?: string }).description ?? ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {includedByTier ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400">
                      <Check size={12} /> Included in your tier
                    </span>
                  ) : isActive ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-400">
                        <Check size={12} /> Active
                      </span>
                      {status?.expiresAt && (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          until {new Date(status.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {!isOneTime && (
                        <button
                          onClick={() => setExpandedKey(isExpanded ? null : addon.key)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border border-[var(--color-accent)]/30 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
                        >
                          <Clock size={11} /> Extend
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {(() => {
                        const displayPrice = computePrice(addon.usdPrice, !isOneTime);
                        const suffix = isOneTime
                          ? ' one-time'
                          : billingPeriod === 'annual' ? ' /year' : ' /30 days';
                        return (
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            ${displayPrice}
                            <span className="text-[10px] font-normal text-[var(--text-muted)]">
                              {suffix}
                            </span>
                          </span>
                        );
                      })()}
                      <button
                        onClick={() => setExpandedKey(isExpanded ? null : addon.key)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
                      >
                        Buy
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Payment rails (expanded) */}
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="px-4 pb-4 pt-1 border-t border-[var(--border-default)]"
                >
                  <p className="text-[11px] text-[var(--text-muted)] mb-3">
                    {isActive ? `Extend ${addon.name} for another 30 days. Days stack.` : `Unlock ${addon.name} for this agent.`}
                  </p>
                  <PaymentRailButtons
                    onPayWithSOL={() => handlePurchase(addon.key, 'sol')}
                    onPayWithUSDC={() => handlePurchase(addon.key, 'usdc')}
                    onPayWithHATCHER={() => handlePurchase(addon.key, 'hatch')}
                    onPayWithCard={() => handlePurchaseCard(addon.key)}
                    onPayWithCredits={() => handlePurchaseCredits(addon.key)}
                    creditBalance={creditBalance}
                    price={computePrice(addon.usdPrice, addon.type === 'subscription')}
                    loading={isPurchasing}
                  />
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmPaymentModal state={confirmState} onClose={closeConfirm} />
    </motion.div>
  );
}
