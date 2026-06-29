'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Payment, SolanaRecurringAuthorization, SolanaRecurringQuote, SolanaRecurringQuoteRequest } from '@/lib/api';
import { Link } from '@/i18n/routing';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/components/ui/EmptyState';
import { TIERS, TIER_ORDER, ADDONS } from '@hatcher/shared';
import type { UserTierKey, AddonKey } from '@hatcher/shared';
import { usePaymentDrivers } from '@/lib/payment-drivers';
import { ConfirmPaymentModal } from '@/components/payments/ConfirmPaymentModal';
import { formatFeatureKey } from '@/lib/feature-labels';
import { payWithSolanaX402 } from '@/lib/solana-x402-client';
import {
  cancelSolanaRecurringAuthorizationOnChain,
  setupSolanaRecurringAuthorization,
} from '@/lib/solana-recurring-payments';
import {
  createPendingCryptoSettlement,
  hasPendingCryptoSettlement,
  markPendingCryptoSettlementFailure,
  readPendingCryptoSettlements,
  removePendingCryptoSettlement,
  settlePendingCryptoPayment,
  shouldDropPendingCryptoSettlement,
  upsertPendingCryptoSettlement,
  type PendingCryptoSettlement,
  type PendingPaymentFlow,
  type PendingPaymentRail,
} from '@/lib/crypto-settlements';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle,
  ChevronDown,
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

const cardClass = 'card-solid';
const displayFont = { fontFamily: 'var(--font-display), system-ui, sans-serif' };
const HATCHER_PAYMENT_DISCOUNT_FACTOR = 0.9;
const priceForHatcherPayment = (usdPrice: number): number =>
  Math.round(usdPrice * HATCHER_PAYMENT_DISCOUNT_FACTOR * 100) / 100;
const AI_CREDITS_BY_TIER: Record<UserTierKey, number> = {
  free: 500,
  starter: 3000,
  pro: 15000,
  business: 40000,
  founding_member: 25000,
};

const TIER_RESOURCE_OVERRIDES: Record<UserTierKey, { includedAgents: number; cpuLimit: number; memoryMb: number; storageMb: number; autoSleep: boolean; autoSleepMinutes: number; fileManager: boolean; fullLogs: boolean }> = {
  free: { includedAgents: 1, cpuLimit: 1, memoryMb: 1024, storageMb: 2048, autoSleep: true, autoSleepMinutes: 720, fileManager: true, fullLogs: true },
  starter: { includedAgents: 1, cpuLimit: 1, memoryMb: 1536, storageMb: 10240, autoSleep: false, autoSleepMinutes: 0, fileManager: true, fullLogs: true },
  pro: { includedAgents: 3, cpuLimit: 1.5, memoryMb: 2048, storageMb: 25600, autoSleep: false, autoSleepMinutes: 0, fileManager: true, fullLogs: true },
  business: { includedAgents: 5, cpuLimit: 2, memoryMb: 3072, storageMb: 51200, autoSleep: false, autoSleepMinutes: 0, fileManager: true, fullLogs: true },
  founding_member: { includedAgents: 10, cpuLimit: 2, memoryMb: 4096, storageMb: 40960, autoSleep: false, autoSleepMinutes: 0, fileManager: true, fullLogs: true },
};

type RetiredAddonKey =
  | 'addon.always_on'
  | 'addon.messages.20'
  | 'addon.messages.50'
  | 'addon.messages.100'
  | 'addon.messages.200'
  | 'addon.searches.25'
  | 'addon.searches.50'
  | 'addon.file_manager'
  | 'addon.full_logs'
  | 'addon.extra_plugins';

type BillingAddonKey = Exclude<AddonKey, RetiredAddonKey>
  | 'addon.ai_credits.5000'
  | 'addon.ai_credits.10000'
  | 'addon.ai_credits.25000'
  | 'addon.ai_credits.50000';

type BillingAddon = {
  key: BillingAddonKey;
  name: string;
  description: string;
  usdPrice: number;
  type: 'subscription' | 'one_time';
  perAgent: boolean;
  extraAgents?: number;
  aiCredits?: number;
};

type AiCreditHistoryItem = {
  id: string;
  kind: string;
  provider: string;
  model: string | null;
  agentId?: string | null;
  agentName?: string | null;
  credits: number;
  providerCostUsd: string | number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  createdAt: string;
};

const AI_CREDIT_ADDONS: BillingAddon[] = [
  {
    key: 'addon.ai_credits.5000',
    name: '5,000 AI Credits',
    description: 'One-time top-up for hosted models and web search.',
    usdPrice: 7,
    type: 'one_time',
    perAgent: false,
    aiCredits: 5000,
  },
  {
    key: 'addon.ai_credits.10000',
    name: '10,000 AI Credits',
    description: 'One-time top-up for heavier model runs and research.',
    usdPrice: 13,
    type: 'one_time',
    perAgent: false,
    aiCredits: 10000,
  },
  {
    key: 'addon.ai_credits.25000',
    name: '25,000 AI Credits',
    description: 'One-time top-up for larger agent workloads.',
    usdPrice: 30,
    type: 'one_time',
    perAgent: false,
    aiCredits: 25000,
  },
  {
    key: 'addon.ai_credits.50000',
    name: '50,000 AI Credits',
    description: 'One-time top-up for high-volume hosted usage.',
    usdPrice: 60,
    type: 'one_time',
    perAgent: false,
    aiCredits: 50000,
  },
];

const VISIBLE_ADDONS: BillingAddon[] = [
  ...(ADDONS as unknown as BillingAddon[]).filter(
    (addon) => {
      const addonKey = addon.key as string;
      return !addonKey.startsWith('addon.messages.')
        && !addonKey.startsWith('addon.searches.')
        && addonKey !== 'addon.always_on'
        && addonKey !== 'addon.file_manager'
        && addonKey !== 'addon.full_logs'
        && addonKey !== 'addon.extra_plugins';
    },
  ),
  ...AI_CREDIT_ADDONS,
];

function findBillingAddon(addonKey: string | undefined): BillingAddon | undefined {
  if (!addonKey) return undefined;
  return VISIBLE_ADDONS.find((addon) => addon.key === addonKey);
}

/* ── Helpers ─────────────────────────────────────────────── */
function StatusBadge({ status }: { status: Payment['status'] }) {
  const styles: Record<Payment['status'], string> = {
    confirmed: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)]',
    pending: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning-border)] animate-pulse',
    failed: 'bg-[var(--color-destructive-bg)] text-[var(--color-destructive)] border border-[var(--color-destructive-border)]',
    refunded: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-default)]',
  };
  const dots: Record<Payment['status'], string> = {
    confirmed: 'bg-[var(--color-success)]',
    pending: 'bg-[var(--color-warning)]',
    failed: 'bg-[var(--color-destructive)]',
    refunded: 'bg-[var(--text-muted)]',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/* formatDate is now locale-aware — provided via useFormatter inside the page component */

/* ── Payment method modal ─────────────────────────────────── */
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  price: number;
  onPayWithSOL: () => void;
  onPayWithHATCHER: () => void;
  onPayWithKAUSA: () => void;
  onPayWithUSDC: () => void;
  onPayWithCryptoNow: () => void;
  onPayWithCard: () => void;
  loading: boolean;
  requiresAgent?: boolean;
  agents?: Array<{ id: string; name: string }>;
  selectedAgentId?: string | null;
  onSelectAgent?: (agentId: string) => void;
}

function PaymentMethodModal({ isOpen, onClose, title, price, onPayWithSOL, onPayWithHATCHER, onPayWithKAUSA, onPayWithUSDC, onPayWithCryptoNow, onPayWithCard, loading, requiresAgent, agents, selectedAgentId, onSelectAgent }: PaymentModalProps) {
  const t = useTranslations('dashboard.billing');
  const tc = useTranslations('dashboard.common');
  if (!isOpen) return null;
  const needsAgentSelection = requiresAgent && !selectedAgentId;
  const hatcherPrice = priceForHatcherPayment(price);
  const paymentIconShell = 'w-10 h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 text-[var(--text-primary)]';

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
          className="card-solid w-full max-w-md mx-4 max-h-[calc(100vh-2rem)] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
            <h3 className="font-semibold text-[var(--text-primary)]">{requiresAgent ? t('selectAgent') : t('choosePayment')}</h3>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 space-y-3">
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {title} — <span className="font-bold text-[var(--text-primary)]">${price}</span>
            </p>

            {/* Agent selector for future scoped addons */}
            {requiresAgent && (
              <div className="mb-4">
                <label className="block text-xs text-[var(--text-muted)] mb-2">{t('applyToAgent')}</label>
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
                    <p className="text-xs text-[var(--text-muted)] py-2">{t('noAgentsFound')}</p>
                  )}
                </div>
              </div>
            )}

            {/* Pay with SOL */}
            <button
              onClick={onPayWithSOL}
              disabled={loading || needsAgentSelection}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/[0.03] transition-all disabled:opacity-40"
            >
              <div className={paymentIconShell}>
                <span className="font-bold text-sm">SOL</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{t('payWithSol')}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{t('solDesc')}</p>
              </div>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)] ml-auto" />}
            </button>

            {/* Pay with $HATCHER */}
            <button
              onClick={onPayWithHATCHER}
              disabled={loading || needsAgentSelection}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-warning-border)] hover:bg-[var(--color-warning-bg)] transition-all disabled:opacity-40"
            >
              <div className={paymentIconShell}>
                <span className="font-extrabold text-[7px] tracking-tight">HATCHER</span>
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{t('payWithHatcher')}</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {t('hatcherDiscountDesc', { price: `$${hatcherPrice.toFixed(2)}` })}
                </p>
              </div>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)] ml-auto" />}
            </button>

            {/* Pay with $KAUSA */}
            <button
              onClick={onPayWithKAUSA}
              disabled={loading || needsAgentSelection}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--color-success-border)] hover:bg-[var(--color-success-bg)] transition-all disabled:opacity-40"
            >
              <div className={paymentIconShell}>
                <span className="font-extrabold text-[9px] tracking-tight">KAUSA</span>
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{t('payWithKausa')}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{t('kausaDesc')}</p>
              </div>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)] ml-auto" />}
            </button>

            {/* Pay with Solana USDC */}
            <button
              onClick={onPayWithUSDC}
              disabled={loading || needsAgentSelection}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/[0.03] transition-all disabled:opacity-40"
            >
              <div className={paymentIconShell}>
                <span className="font-bold text-[10px]">USDC</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{t('payWithUsdcSolana')}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{t('usdcSolanaDesc')}</p>
              </div>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)] ml-auto" />}
            </button>

            {/* Hosted SOL/USDC checkout via CryptoNow */}
            <button
              onClick={onPayWithCryptoNow}
              disabled={loading || needsAgentSelection}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/[0.03] transition-all disabled:opacity-40"
            >
              <div className={paymentIconShell}>
                <Wallet className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{t('payWithCryptoNow')}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{t('cryptnowDesc')}</p>
              </div>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)] ml-auto" />}
            </button>

            {/* Pay with Card */}
            <button
              onClick={onPayWithCard}
              disabled={loading || needsAgentSelection}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/[0.03] transition-all disabled:opacity-40"
            >
              <div className={paymentIconShell}>
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{t('payWithCard')}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{t('cardDesc')}</p>
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
  activeAddons: Array<{ id: string; key: string; name: string; expiresAt: string | null; agentId: string | null; agentName: string | null; type: string; perAgent: boolean; extraAgents?: number }>;
  agentLimit: number;
  agentCount: number;
  subscriptionExpiresAt?: string | null;
  hatchCredits?: number;
  aiCredits?: { balance: number; monthlyGrant: number; tier: string };
}

/* ── Page ─────────────────────────────────────────────────── */
export default function BillingPage() {
  const t  = useTranslations('dashboard.billing');
  const tc = useTranslations('dashboard.common');
  const tTiers = useTranslations('shared.tiers');
  const format = useFormatter();
  const formatDate = (dateStr: string) =>
    format.dateTime(new Date(dateStr), { year: 'numeric', month: 'short', day: 'numeric' });
  const formatUsageKind = (kind: string) =>
    kind.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  const formatTokenCount = (value?: number | null) =>
    typeof value === 'number' && value > 0 ? value.toLocaleString() : '0';
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const searchParams = useSearchParams();
  const solanaWallet = useWallet();
  const { connection: solanaConnection } = useConnection();
  const {
    confirmState, closeConfirm, driveSol, driveUsdc, driveHatch, driveKausa,
    openWalletModal, reconnect: reconnectWallet, disconnect: disconnectWallet,
    address: walletAddress, connected: walletConnected,
  } = usePaymentDrivers();

  const [accountData, setAccountData] = useState<AccountFeatures | null>(null);
  const [foundingInfo, setFoundingInfo] = useState<{ maxSlots: number; taken: number; remaining: number } | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [purchasingAddon, setPurchasingAddon] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [aiCreditBalance, setAiCreditBalance] = useState(0);
  // Cancel flow removed — all tiers are one-time purchases now, no
  // recurring subscription to cancel. Access simply expires at
  // `agentFeature.expiresAt`. Users who want early downgrade can wait
  // out the expiry or delete the account via Settings.
  const [openingPortal, setOpeningPortal] = useState(false);
  const [aiCreditHistory, setAiCreditHistory] = useState<AiCreditHistoryItem[]>([]);
  const [userAgents, setUserAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [recurringAuthorizations, setRecurringAuthorizations] = useState<SolanaRecurringAuthorization[]>([]);
  const [recurringMode, setRecurringMode] = useState<'tier' | 'ai_credits'>('ai_credits');
  const [recurringTierKey, setRecurringTierKey] = useState<UserTierKey>('starter');
  const [recurringAiCreditKey, setRecurringAiCreditKey] = useState<BillingAddonKey>('addon.ai_credits.5000');
  const [recurringQuote, setRecurringQuote] = useState<SolanaRecurringQuote | null>(null);
  const [recurringBusy, setRecurringBusy] = useState(false);
  const [recurringCancelId, setRecurringCancelId] = useState<string | null>(null);

  // Wallet pill dropdown state (Switch / Disconnect).
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const walletMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!walletMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(e.target as Node)) {
        setWalletMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [walletMenuOpen]);

  // Monthly / Annual billing toggle. Annual = 12 months × 85% (15% off).
  // The backend honors this on both /features/subscribe and
  // /features/addon (only for subscription-type addons — one-time
  // AI Credit packs ignore it).
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const annualDiscountFactor = 0.85; // 15% off
  // Convert a monthly USD price into the currently-selected billing period.
  const computePrice = useCallback((monthly: number, isSubscription: boolean) => {
    if (!isSubscription || billingPeriod === 'monthly') return monthly;
    return Math.round(monthly * 12 * annualDiscountFactor * 100) / 100;
  }, [billingPeriod]);

  // Payment method modal state
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    type: 'subscription' | 'addon';
    tierKey?: UserTierKey;
    addonKey?: BillingAddonKey;
    title: string;
    price: number;
  }>({ isOpen: false, type: 'subscription', title: '', price: 0 });
  const [paymentLoading, setPaymentLoading] = useState(false);


  const showSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 6000);
  }, []);

  /**
   * Wrap a caught error into a user-facing message, but swallow the
   * "Cancelled" sentinel that the payment drivers throw when the user
   * dismisses the Phantom popup or the confirm modal. Without this
   * guard, a normal cancel surfaced as a red "Cancelled" banner which
   * users reported as confusing.
   */
  const reportCatch = (err: unknown, fallback: string): void => {
    const msg = err instanceof Error ? err.message : fallback;
    if (msg === 'Cancelled') return;
    setError(msg);
  };

  const logCryptoPaymentIntent = (
    rail: 'sol' | 'hatch' | 'usdc' | 'kausa',
    flow: 'tier' | 'addon',
    targetKey: string,
    billingPeriod: 'monthly' | 'annual',
    amountUsd: number,
    agentId?: string,
    stage: 'clicked' | 'wallet_confirmed' = 'clicked',
    txSignature?: string,
  ): void => {
    void api.logCryptoPaymentIntent({
      rail,
      flow,
      targetKey,
      billingPeriod,
      amountUsd,
      agentId,
      source: 'billing_page',
      stage,
      txSignature,
    }).catch(() => {});
  };

  // Handle Stripe redirect success/cancel
  useEffect(() => {
    if (searchParams?.get('success') === 'true') {
      showSuccess(t('successPayment'));
      // Clean up URL params
      window.history.replaceState({}, '', '/dashboard/billing');
    }
    if (searchParams?.get('canceled') === 'true') {
      setError(t('canceledPayment'));
      window.history.replaceState({}, '', '/dashboard/billing');
    }
  }, [searchParams, showSuccess, t]);

  // Full reload after any payment — mirrors the initial-load fetches so
  // the page never shows stale data (credit balance, payment history,
  // founding slots, agent list). The only difference vs. the initial
  // load is that we don't flip the top-level `loading` spinner.
  const loadAccountData = useCallback(async () => {
    const [acctRes, balRes, payRes, histRes, catalogRes, agentsRes, recurringRes] = await Promise.all([
      api.getAccountFeatures(),
      api.getAiCreditBalance(),
      api.getPayments(),
      api.getAiCreditHistory(10),
      api.getTiersCatalog(),
      api.getMyAgents(),
      api.getSolanaRecurringAuthorizations(),
    ]);
    if (acctRes.success) setAccountData(acctRes.data as unknown as AccountFeatures);
    if (balRes.success) setAiCreditBalance(balRes.data.balance);
    if (payRes.success) setPayments(payRes.data.payments);
    if (histRes.success) setAiCreditHistory(histRes.data.usage);
    if (catalogRes.success) setFoundingInfo(catalogRes.data.founding);
    if (recurringRes.success) setRecurringAuthorizations(recurringRes.data.authorizations);
    if (agentsRes.success && agentsRes.data) {
      const agents = (agentsRes.data as unknown as Array<{ id: string; name: string }>);
      setUserAgents(agents.map(a => ({ id: a.id, name: a.name })));
    }
  }, []);

  const registerPendingCryptoPayment = (
    rail: PendingPaymentRail,
    flow: PendingPaymentFlow,
    targetKey: string,
    period: 'monthly' | 'annual',
    amountUsd: number,
    txSignature: string,
    agentId?: string,
  ): PendingCryptoSettlement => {
    const pending = createPendingCryptoSettlement({
      rail,
      flow,
      targetKey,
      billingPeriod: period,
      amountUsd,
      txSignature,
      ...(user?.id ? { userId: user.id } : {}),
      ...(agentId ? { agentId } : {}),
    });
    upsertPendingCryptoSettlement(pending);
    logCryptoPaymentIntent(rail, flow, targetKey, period, amountUsd, agentId, 'wallet_confirmed', txSignature);
    return pending;
  };

  const finalizePendingCryptoPayment = useCallback(async (
    pending: PendingCryptoSettlement,
    options: {
      successMessage?: string;
      pendingMessage?: string;
      suppressFailureMessage?: boolean;
    } = {},
  ): Promise<boolean> => {
    if (!hasPendingCryptoSettlement(pending.id, pending.userId)) {
      await loadAccountData();
      return true;
    }

    const result = await settlePendingCryptoPayment(pending);
    if (result.success) {
      removePendingCryptoSettlement(pending.id);
      await loadAccountData();
      if (options.successMessage) showSuccess(options.successMessage);
      return true;
    }

    if (shouldDropPendingCryptoSettlement(result.error)) {
      removePendingCryptoSettlement(pending.id);
      await loadAccountData();
      if (options.successMessage) showSuccess(options.successMessage);
      return true;
    }

    markPendingCryptoSettlementFailure(pending, result.error);
    if (!options.suppressFailureMessage) {
      if (/Transaction not found|timed out|Network error|Rate limit/i.test(result.error)) {
        showSuccess(options.pendingMessage ?? 'Payment submitted on-chain. Finalizing automatically.');
      } else {
        setError(result.error);
      }
    }
    return false;
  }, [loadAccountData, showSuccess]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    let cancelled = false;

    const retryPending = async () => {
      const pendingItems = readPendingCryptoSettlements(user.id);
      for (const pending of pendingItems) {
        if (cancelled) break;
        await finalizePendingCryptoPayment(pending, {
          successMessage: 'On-chain payment finalized. Billing has been updated.',
          suppressFailureMessage: true,
        });
      }
    };

    void retryPending();
    const interval = window.setInterval(() => void retryPending(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [finalizePendingCryptoPayment, isAuthenticated, user?.id]);

  // Initial load
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);

    Promise.all([
      api.getAccountFeatures(),
      api.getPayments(),
      api.getAiCreditBalance(),
      api.getAiCreditHistory(10),
      api.getMyAgents(),
      api.getTiersCatalog(),
      api.getSolanaRecurringAuthorizations(),
    ]).then(([acctRes, payRes, balRes, histRes, agentsRes, catalogRes, recurringRes]) => {
      if (acctRes.success) setAccountData(acctRes.data as unknown as AccountFeatures);
      if (payRes.success) setPayments(payRes.data.payments);
      if (balRes.success) setAiCreditBalance(balRes.data.balance);
      if (histRes.success) setAiCreditHistory(histRes.data.usage);
      if (agentsRes.success && agentsRes.data) {
        const agents = (agentsRes.data as unknown as Array<{ id: string; name: string }>);
        setUserAgents(agents.map(a => ({ id: a.id, name: a.name })));
      }
      if (catalogRes.success) setFoundingInfo(catalogRes.data.founding);
      if (recurringRes.success) setRecurringAuthorizations(recurringRes.data.authorizations);
      if (!acctRes.success) setError(acctRes.error ?? 'Failed to load account');
      setLoading(false);
    }).catch(() => {
      setError('Network error');
      setLoading(false);
    });
  }, [isAuthenticated]);

  useEffect(() => {
    setRecurringQuote(null);
  }, [recurringMode, recurringTierKey, recurringAiCreditKey]);

  const recurringQuotePayload = useCallback((): SolanaRecurringQuoteRequest => {
    if (recurringMode === 'tier') {
      return {
        kind: 'tier',
        key: recurringTierKey,
        billingPeriod: 'monthly',
        asset: 'usdc',
        allowancePeriods: 12,
      };
    }
    return {
      kind: 'addon',
      key: recurringAiCreditKey,
      billingPeriod: 'monthly',
      asset: 'usdc',
      allowancePeriods: 12,
    };
  }, [recurringAiCreditKey, recurringMode, recurringTierKey]);

  const loadRecurringQuote = useCallback(async (): Promise<SolanaRecurringQuote | null> => {
    setRecurringBusy(true);
    setError(null);
    try {
      const res = await api.getSolanaRecurringQuote(recurringQuotePayload());
      if (!res.success) {
        setError(res.error);
        return null;
      }
      setRecurringQuote(res.data);
      return res.data;
    } finally {
      setRecurringBusy(false);
    }
  }, [recurringQuotePayload]);

  const handleSetupRecurring = async () => {
    setRecurringBusy(true);
    setError(null);
    try {
      let quote = recurringQuote;
      if (!quote) {
        const res = await api.getSolanaRecurringQuote(recurringQuotePayload());
        if (!res.success) throw new Error(res.error);
        quote = res.data;
        setRecurringQuote(quote);
      }

      if (!solanaWallet.connected || !solanaWallet.publicKey) {
        openWalletModal();
        return;
      }

      const recordPayload = await setupSolanaRecurringAuthorization({
        wallet: solanaWallet,
        connection: solanaConnection,
        quote,
      });
      const recordRes = await api.recordSolanaRecurringSetup(recordPayload);
      if (!recordRes.success) throw new Error(recordRes.error);

      await loadAccountData();
      setRecurringQuote(null);
      showSuccess('Solana recurring authorization active.');
    } catch (err) {
      reportCatch(err, 'Solana recurring setup failed');
    } finally {
      setRecurringBusy(false);
    }
  };

  const handleCancelRecurring = async (authorization: SolanaRecurringAuthorization) => {
    setRecurringCancelId(authorization.id);
    setError(null);
    try {
      if (!solanaWallet.connected || !solanaWallet.publicKey) {
        openWalletModal();
        return;
      }
      const revocationTxSignature = await cancelSolanaRecurringAuthorizationOnChain({
        wallet: solanaWallet,
        connection: solanaConnection,
        authorization,
      });
      const res = await api.cancelSolanaRecurringAuthorization(authorization.id, {
        revocationTxSignature,
      });
      if (!res.success) throw new Error(res.error);
      await loadAccountData();
      showSuccess('USDC token approval revoked and monthly authorization cancelled.');
    } catch (err) {
      reportCatch(err, 'Solana recurring cancellation failed');
    } finally {
      setRecurringCancelId(null);
    }
  };

  const revocableRecurringAuthorizations = useMemo(
    () => recurringAuthorizations.filter((row) => row.status === 'active' || row.status === 'action_required'),
    [recurringAuthorizations],
  );
  const activeRecurringAuthorizationCount = useMemo(
    () => revocableRecurringAuthorizations.filter((row) => row.status === 'active').length,
    [revocableRecurringAuthorizations],
  );

  /* ── Open payment modal ────────────────────────────────── */
  const openSubscribeModal = (tierKey: UserTierKey, mode: 'upgrade' | 'renew' = 'upgrade') => {
    const tier = TIERS[tierKey];
    // Lifetime tiers ignore billingPeriod — price is always flat.
    const isLifetime = tierKey === 'founding_member';
    const price = isLifetime ? tier.usdPrice : computePrice(tier.usdPrice, true);
    setPaymentModal({
      isOpen: true,
      type: 'subscription',
      tierKey,
      title: mode === 'renew' ? `Extend ${tier.name}` : `Upgrade to ${tier.name}`,
      price,
    });
  };

  const openAddonModal = (
    addonKey: BillingAddonKey,
    opts: { presetAgentId?: string | null; mode?: 'buy' | 'renew' } = {},
  ) => {
    const addon = findBillingAddon(addonKey);
    setSelectedAgentId(opts.presetAgentId ?? null);
    // Subscription-type addons honor the monthly/annual toggle.
    // one_time addons always charge flat price.
    const isSubscription = addon?.type === 'subscription';
    const price = computePrice(addon?.usdPrice ?? 0, isSubscription);
    setPaymentModal({
      isOpen: true,
      type: 'addon',
      addonKey,
      title: opts.mode === 'renew'
        ? `Extend ${addon?.name ?? 'Add-on'}`
        : addon?.name ?? 'Add-on',
      price,
    });
  };


  // Lifetime tiers (founding_member) are always flat-priced — ignore the
  // monthly/annual toggle for them, and also skip sending billingPeriod
  // to the backend so the server can't accidentally charge 12× lifetime.
  const subscribePeriod = (tierKey: UserTierKey): 'monthly' | 'annual' =>
    tierKey === 'founding_member' ? 'monthly' : billingPeriod;
  const subscribePrice = (tierKey: UserTierKey): number => {
    const base = TIERS[tierKey].usdPrice;
    return tierKey === 'founding_member' ? base : computePrice(base, true);
  };

  /* ── Subscribe to a tier (SOL payment) ────────────────── */
  const handleSubscribeSOL = async () => {
    const tierKey = paymentModal.tierKey;
    if (!tierKey) return;
    const tierConfig = TIERS[tierKey];
    const period = subscribePeriod(tierKey);
    const price = subscribePrice(tierKey);
    setPaymentLoading(true);
    setSubscribing(tierKey);
    setError(null);
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    let pending: PendingCryptoSettlement | null = null;
    try {
      logCryptoPaymentIntent('sol', 'tier', tierKey, period, price);
      const txSignature = await driveSol(
        price,
        `Subscribe to ${tierConfig.name}${period === 'annual' ? ' (annual)' : ''}`,
        {
          onSignature: (signature) => {
            pending = registerPendingCryptoPayment('sol', 'tier', tierKey, period, price, signature);
          },
        },
      );
      pending = pending ?? registerPendingCryptoPayment('sol', 'tier', tierKey, period, price, txSignature);
      await finalizePendingCryptoPayment(pending, {
        successMessage: `Subscribed to ${tierConfig.name}!`,
        pendingMessage: 'Payment submitted on-chain. Tier activation will retry automatically.',
      });
    } catch (err) {
      if (pending) {
        await finalizePendingCryptoPayment(pending, {
          successMessage: `Subscribed to ${tierConfig.name}!`,
          pendingMessage: 'Payment submitted on-chain. Tier activation will retry automatically.',
        });
      } else {
        reportCatch(err, 'Subscription failed');
      }
    } finally {
      setSubscribing(null);
      setPaymentLoading(false);
    }
  };

  /* ── Subscribe to a tier (HATCHER token payment) ────────── */
  const handleSubscribeHATCHER = async () => {
    const tierKey = paymentModal.tierKey;
    if (!tierKey) return;
    const tierConfig = TIERS[tierKey];
    const period = subscribePeriod(tierKey);
    const price = priceForHatcherPayment(subscribePrice(tierKey));
    setPaymentLoading(true);
    setSubscribing(tierKey);
    setError(null);
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    let pending: PendingCryptoSettlement | null = null;
    try {
      logCryptoPaymentIntent('hatch', 'tier', tierKey, period, price);
      const txSignature = await driveHatch(
        price,
        `Subscribe to ${tierConfig.name}${period === 'annual' ? ' (annual)' : ''}`,
        {
          onSignature: (signature) => {
            pending = registerPendingCryptoPayment('hatch', 'tier', tierKey, period, price, signature);
          },
        },
      );
      pending = pending ?? registerPendingCryptoPayment('hatch', 'tier', tierKey, period, price, txSignature);
      await finalizePendingCryptoPayment(pending, {
        successMessage: `Subscribed to ${tierConfig.name} with $HATCHER!`,
        pendingMessage: 'Payment submitted on-chain. Tier activation will retry automatically.',
      });
    } catch (err) {
      if (pending) {
        await finalizePendingCryptoPayment(pending, {
          successMessage: `Subscribed to ${tierConfig.name} with $HATCHER!`,
          pendingMessage: 'Payment submitted on-chain. Tier activation will retry automatically.',
        });
      } else {
        reportCatch(err, 'Subscription failed');
      }
    } finally {
      setSubscribing(null);
      setPaymentLoading(false);
    }
  };

  /* ── Subscribe to a tier (KAUSA token payment) ──────────── */
  const handleSubscribeKAUSA = async () => {
    const tierKey = paymentModal.tierKey;
    if (!tierKey) return;
    const tierConfig = TIERS[tierKey];
    const period = subscribePeriod(tierKey);
    const price = subscribePrice(tierKey);
    setPaymentLoading(true);
    setSubscribing(tierKey);
    setError(null);
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    let pending: PendingCryptoSettlement | null = null;
    try {
      logCryptoPaymentIntent('kausa', 'tier', tierKey, period, price);
      const txSignature = await driveKausa(
        price,
        `Subscribe to ${tierConfig.name}${period === 'annual' ? ' (annual)' : ''}`,
        {
          onSignature: (signature) => {
            pending = registerPendingCryptoPayment('kausa', 'tier', tierKey, period, price, signature);
          },
        },
      );
      pending = pending ?? registerPendingCryptoPayment('kausa', 'tier', tierKey, period, price, txSignature);
      await finalizePendingCryptoPayment(pending, {
        successMessage: `Subscribed to ${tierConfig.name} with $KAUSA!`,
        pendingMessage: 'Payment submitted on-chain. Tier activation will retry automatically.',
      });
    } catch (err) {
      if (pending) {
        await finalizePendingCryptoPayment(pending, {
          successMessage: `Subscribed to ${tierConfig.name} with $KAUSA!`,
          pendingMessage: 'Payment submitted on-chain. Tier activation will retry automatically.',
        });
      } else {
        reportCatch(err, 'Subscription failed');
      }
    } finally {
      setSubscribing(null);
      setPaymentLoading(false);
    }
  };

  /* ── Subscribe to a tier (USDC payment) ─────────────────── */
  const handleSubscribeUSDC = async () => {
    const tierKey = paymentModal.tierKey;
    if (!tierKey) return;
    const tierConfig = TIERS[tierKey];
    const period = subscribePeriod(tierKey);
    const price = subscribePrice(tierKey);
    setPaymentLoading(true);
    setSubscribing(tierKey);
    setError(null);
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    let pending: PendingCryptoSettlement | null = null;
    try {
      logCryptoPaymentIntent('usdc', 'tier', tierKey, period, price);
      const result = await payWithSolanaX402(
        { kind: 'tier', key: tierKey, billingPeriod: period },
        driveUsdc,
        {
          onSignature: (signature) => {
            pending = registerPendingCryptoPayment('usdc', 'tier', tierKey, period, price, signature);
          },
        },
      );
      const settledPending = pending as PendingCryptoSettlement | null;
      if (settledPending) removePendingCryptoSettlement(settledPending.id);
      await loadAccountData();
      const credit = (result as { proratedAiCredits?: number; proratedCredit?: number }).proratedAiCredits ?? result.proratedCredit ?? 0;
      showSuccess(
        credit > 0
          ? `Subscribed to ${tierConfig.name} with USDC on Solana! ${credit.toLocaleString()} AI Credits added for your unused days.`
          : `Subscribed to ${tierConfig.name} with USDC on Solana!`,
      );
    } catch (err) {
      if (pending) {
        await finalizePendingCryptoPayment(pending, {
          successMessage: `Subscribed to ${tierConfig.name} with USDC on Solana!`,
          pendingMessage: 'Payment submitted on-chain. Tier activation will retry automatically.',
        });
      } else {
        reportCatch(err, 'Subscription failed');
      }
    } finally {
      setSubscribing(null);
      setPaymentLoading(false);
    }
  };

  /* ── Subscribe via Stripe Card checkout ─────────────────
     Opens a Stripe-hosted checkout session. User pays by card and the
     /stripe/webhook handler grants the tier on payment_intent.succeeded.
     All tiers are billed as one-time charges (monthly = 30d, annual = 365d,
     lifetime for founding). We never see the card number. */
  const handleSubscribeStripe = async () => {
    const tierKey = paymentModal.tierKey;
    if (!tierKey) return;
    const tierConfig = TIERS[tierKey];
    const period = subscribePeriod(tierKey);
    setPaymentLoading(true);
    setSubscribing(tierKey);
    setError(null);
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    try {
      const res = await api.stripeCheckoutTier(tierKey, period, `${window.location.origin}/dashboard/billing`);
      if (!res.success) {
        setError(res.error ?? 'Stripe checkout failed');
        setSubscribing(null);
        setPaymentLoading(false);
        return;
      }
      // Redirect the whole tab — Stripe-hosted checkout takes over.
      window.location.href = res.data.url;
    } catch (err) {
      reportCatch(err, `Stripe checkout for ${tierConfig.name} failed`);
      setSubscribing(null);
      setPaymentLoading(false);
    }
  };

  /* ── Subscribe via CryptoNow hosted SOL/USDC checkout ─── */
  const handleSubscribeCryptoNow = async () => {
    const tierKey = paymentModal.tierKey;
    if (!tierKey) return;
    const tierConfig = TIERS[tierKey];
    const period = subscribePeriod(tierKey);
    setPaymentLoading(true);
    setSubscribing(tierKey);
    setError(null);
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    try {
      const res = await api.cryptnowCheckout({
        kind: 'tier',
        key: tierKey,
        billingPeriod: period,
        coin: 'ALL',
        returnUrl: `${window.location.origin}/dashboard/billing`,
      });
      if (!res.success) {
        setError(res.error ?? 'CryptoNow checkout failed');
        setSubscribing(null);
        setPaymentLoading(false);
        return;
      }
      window.location.href = res.data.url;
    } catch (err) {
      reportCatch(err, `CryptoNow checkout for ${tierConfig.name} failed`);
      setSubscribing(null);
      setPaymentLoading(false);
    }
  };

  // Shared helper — subscription addons honor the annual toggle; one-time
  // one-time addons always charge flat price.
  const addonPeriod = (addonConfig: { type: string }): 'monthly' | 'annual' =>
    addonConfig.type === 'subscription' ? billingPeriod : 'monthly';
  const addonPrice = (addonConfig: { type: string; usdPrice: number }): number =>
    computePrice(addonConfig.usdPrice, addonConfig.type === 'subscription');

  /* ── Purchase add-on (SOL payment) ────────────────────── */
  const handlePurchaseAddonSOL = async () => {
    const addonKey = paymentModal.addonKey;
    if (!addonKey) return;
    const addonConfig = findBillingAddon(addonKey);
    if (!addonConfig) return;
    if (addonConfig.perAgent && !selectedAgentId) return;
    const period = addonPeriod(addonConfig);
    const price = addonPrice(addonConfig);
    setPaymentLoading(true);
    setPurchasingAddon(addonKey);
    setError(null);
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    let pending: PendingCryptoSettlement | null = null;
    try {
      logCryptoPaymentIntent('sol', 'addon', addonKey, period, price, selectedAgentId ?? undefined);
      const txSignature = await driveSol(
        price,
        `${addonConfig.name}${period === 'annual' ? ' (annual)' : ''}`,
        {
          onSignature: (signature) => {
            pending = registerPendingCryptoPayment('sol', 'addon', addonKey, period, price, signature, selectedAgentId ?? undefined);
          },
        },
      );
      pending = pending ?? registerPendingCryptoPayment('sol', 'addon', addonKey, period, price, txSignature, selectedAgentId ?? undefined);
      await finalizePendingCryptoPayment(pending, {
        successMessage: `${addonConfig.name} purchased!`,
        pendingMessage: 'Payment submitted on-chain. Add-on activation will retry automatically.',
      });
    } catch (err) {
      if (pending) {
        await finalizePendingCryptoPayment(pending, {
          successMessage: `${addonConfig.name} purchased!`,
          pendingMessage: 'Payment submitted on-chain. Add-on activation will retry automatically.',
        });
      } else {
        reportCatch(err, 'Purchase failed');
      }
    } finally {
      setPurchasingAddon(null);
      setPaymentLoading(false);
    }
  };

  /* ── Purchase add-on (HATCHER token payment) ──────────── */
  const handlePurchaseAddonHATCHER = async () => {
    const addonKey = paymentModal.addonKey;
    if (!addonKey) return;
    const addonConfig = findBillingAddon(addonKey);
    if (!addonConfig) return;
    if (addonConfig.perAgent && !selectedAgentId) return;
    const period = addonPeriod(addonConfig);
    const price = priceForHatcherPayment(addonPrice(addonConfig));
    setPaymentLoading(true);
    setPurchasingAddon(addonKey);
    setError(null);
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    let pending: PendingCryptoSettlement | null = null;
    try {
      logCryptoPaymentIntent('hatch', 'addon', addonKey, period, price, selectedAgentId ?? undefined);
      const txSignature = await driveHatch(
        price,
        `${addonConfig.name}${period === 'annual' ? ' (annual)' : ''}`,
        {
          onSignature: (signature) => {
            pending = registerPendingCryptoPayment('hatch', 'addon', addonKey, period, price, signature, selectedAgentId ?? undefined);
          },
        },
      );
      pending = pending ?? registerPendingCryptoPayment('hatch', 'addon', addonKey, period, price, txSignature, selectedAgentId ?? undefined);
      await finalizePendingCryptoPayment(pending, {
        successMessage: `${addonConfig.name} purchased with $HATCHER!`,
        pendingMessage: 'Payment submitted on-chain. Add-on activation will retry automatically.',
      });
    } catch (err) {
      if (pending) {
        await finalizePendingCryptoPayment(pending, {
          successMessage: `${addonConfig.name} purchased with $HATCHER!`,
          pendingMessage: 'Payment submitted on-chain. Add-on activation will retry automatically.',
        });
      } else {
        reportCatch(err, 'Purchase failed');
      }
    } finally {
      setPurchasingAddon(null);
      setPaymentLoading(false);
    }
  };

  /* ── Purchase add-on (KAUSA token payment) ─────────────── */
  const handlePurchaseAddonKAUSA = async () => {
    const addonKey = paymentModal.addonKey;
    if (!addonKey) return;
    const addonConfig = findBillingAddon(addonKey);
    if (!addonConfig) return;
    if (addonConfig.perAgent && !selectedAgentId) return;
    const period = addonPeriod(addonConfig);
    const price = addonPrice(addonConfig);
    setPaymentLoading(true);
    setPurchasingAddon(addonKey);
    setError(null);
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    let pending: PendingCryptoSettlement | null = null;
    try {
      logCryptoPaymentIntent('kausa', 'addon', addonKey, period, price, selectedAgentId ?? undefined);
      const txSignature = await driveKausa(
        price,
        `${addonConfig.name}${period === 'annual' ? ' (annual)' : ''}`,
        {
          onSignature: (signature) => {
            pending = registerPendingCryptoPayment('kausa', 'addon', addonKey, period, price, signature, selectedAgentId ?? undefined);
          },
        },
      );
      pending = pending ?? registerPendingCryptoPayment('kausa', 'addon', addonKey, period, price, txSignature, selectedAgentId ?? undefined);
      await finalizePendingCryptoPayment(pending, {
        successMessage: `${addonConfig.name} purchased with $KAUSA!`,
        pendingMessage: 'Payment submitted on-chain. Add-on activation will retry automatically.',
      });
    } catch (err) {
      if (pending) {
        await finalizePendingCryptoPayment(pending, {
          successMessage: `${addonConfig.name} purchased with $KAUSA!`,
          pendingMessage: 'Payment submitted on-chain. Add-on activation will retry automatically.',
        });
      } else {
        reportCatch(err, 'Purchase failed');
      }
    } finally {
      setPurchasingAddon(null);
      setPaymentLoading(false);
    }
  };

  /* ── Purchase add-on (USDC payment) ─────────────────────── */
  const handlePurchaseAddonUSDC = async () => {
    const addonKey = paymentModal.addonKey;
    if (!addonKey) return;
    const addonConfig = findBillingAddon(addonKey);
    if (!addonConfig) return;
    if (addonConfig.perAgent && !selectedAgentId) return;
    const period = addonPeriod(addonConfig);
    const price = addonPrice(addonConfig);
    setPaymentLoading(true);
    setPurchasingAddon(addonKey);
    setError(null);
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    let pending: PendingCryptoSettlement | null = null;
    try {
      logCryptoPaymentIntent('usdc', 'addon', addonKey, period, price, selectedAgentId ?? undefined);
      await payWithSolanaX402({
        kind: 'addon',
        key: addonKey,
        billingPeriod: period,
        ...(selectedAgentId ? { agentId: selectedAgentId } : {}),
      }, driveUsdc, {
        onSignature: (signature) => {
          pending = registerPendingCryptoPayment('usdc', 'addon', addonKey, period, price, signature, selectedAgentId ?? undefined);
        },
      });
      const settledPending = pending as PendingCryptoSettlement | null;
      if (settledPending) removePendingCryptoSettlement(settledPending.id);
      await loadAccountData();
      showSuccess(`${addonConfig.name} purchased with USDC on Solana!`);
    } catch (err) {
      if (pending) {
        await finalizePendingCryptoPayment(pending, {
          successMessage: `${addonConfig.name} purchased with USDC on Solana!`,
          pendingMessage: 'Payment submitted on-chain. Add-on activation will retry automatically.',
        });
      } else {
        reportCatch(err, 'Purchase failed');
      }
    } finally {
      setPurchasingAddon(null);
      setPaymentLoading(false);
    }
  };

  /* ── Purchase add-on via Stripe Card checkout ──────────── */
  const handlePurchaseAddonStripe = async () => {
    const addonKey = paymentModal.addonKey;
    if (!addonKey) return;
    const addonConfig = findBillingAddon(addonKey);
    if (!addonConfig) return;
    if (addonConfig.perAgent && !selectedAgentId) return;
    const period = addonPeriod(addonConfig);
    setPaymentLoading(true);
    setPurchasingAddon(addonKey);
    setError(null);
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    try {
      const res = await api.stripeCheckoutAddon(addonKey, selectedAgentId ?? undefined, period, `${window.location.origin}/dashboard/billing`);
      if (!res.success) {
        setError(res.error ?? 'Stripe checkout failed');
        setPurchasingAddon(null);
        setPaymentLoading(false);
        return;
      }
      window.location.href = res.data.url;
    } catch (err) {
      reportCatch(err, 'Stripe checkout failed');
      setPurchasingAddon(null);
      setPaymentLoading(false);
    }
  };

  /* ── Purchase add-on via CryptoNow hosted SOL/USDC checkout ─ */
  const handlePurchaseAddonCryptoNow = async () => {
    const addonKey = paymentModal.addonKey;
    if (!addonKey) return;
    const addonConfig = findBillingAddon(addonKey);
    if (!addonConfig) return;
    if (addonConfig.perAgent && !selectedAgentId) return;
    const period = addonPeriod(addonConfig);
    setPaymentLoading(true);
    setPurchasingAddon(addonKey);
    setError(null);
    setPaymentModal(prev => ({ ...prev, isOpen: false }));
    try {
      const res = await api.cryptnowCheckout({
        kind: 'addon',
        key: addonKey,
        billingPeriod: period,
        ...(selectedAgentId ? { agentId: selectedAgentId } : {}),
        coin: 'ALL',
        returnUrl: `${window.location.origin}/dashboard/billing`,
      });
      if (!res.success) {
        setError(res.error ?? 'CryptoNow checkout failed');
        setPurchasingAddon(null);
        setPaymentLoading(false);
        return;
      }
      window.location.href = res.data.url;
    } catch (err) {
      reportCatch(err, 'CryptoNow checkout failed');
      setPurchasingAddon(null);
      setPaymentLoading(false);
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
  const handlePurchaseAddon = async (addonKey: BillingAddonKey) => {
    openAddonModal(addonKey);
  };

  /* ── Loading / auth states ─────────────────────────────── */
  if (authLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)] mx-auto mb-4" />
        <p className="text-[var(--text-secondary)]">{tc('loading')}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Shield className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">{tc('signInRequired')}</h1>
        <p className="mb-6 text-[var(--text-secondary)]">{t('signInDescription')}</p>
        <Link href="/login" className="btn-primary">{tc('signIn')}</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)] mx-auto mb-4" />
        <p className="text-[var(--text-secondary)]">{t('loadingBilling')}</p>
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
        <Link href="/dashboard" className="hover:text-[var(--color-accent)] transition-colors duration-200">{t('breadcrumbDashboard')}</Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)]">{t('breadcrumbBilling')}</span>
      </motion.div>

      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <motion.div variants={itemVariants}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('eyebrow')}</p>
          <h1
            className="text-3xl font-bold tracking-tight text-[var(--text-primary)]"
            style={displayFont}
          >
            {t('heading')}
          </h1>
        </motion.div>

        {/* Wallet pill dropdown — connected state shows the address pill;
            clicking it toggles a menu with Switch + Disconnect. Disconnected
            state shows a single "Connect Wallet" button. Click-outside
            closes the menu via the effect above. */}
        <motion.div variants={itemVariants} className="relative" ref={walletMenuRef}>
          {walletConnected && walletAddress ? (
            <>
              <button
                type="button"
                onClick={() => setWalletMenuOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-success-bg)] border border-[var(--color-success-border)] text-[var(--color-success)] text-xs font-semibold hover:bg-[var(--bg-hover)] transition-colors"
                aria-expanded={walletMenuOpen}
                aria-haspopup="menu"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                {walletAddress.slice(0, 4)}…{walletAddress.slice(-4)}
                <ChevronDown className={`w-3 h-3 transition-transform ${walletMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {walletMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card-solid)] shadow-lg overflow-hidden z-20"
                >
                  <div className="px-3 py-2 border-b border-[var(--border-default)]">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                      {t('connectedWallet')}
                    </p>
                    <p className="text-[11px] font-mono text-[var(--text-secondary)] truncate mt-0.5">
                      {walletAddress}
                    </p>
                  </div>
                  <button
                    onClick={() => { setWalletMenuOpen(false); void reconnectWallet(); }}
                    className="w-full text-left px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] transition-colors flex items-center gap-2"
                    role="menuitem"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {t('switchWallet')}
                  </button>
                  <button
                    onClick={() => { setWalletMenuOpen(false); void disconnectWallet(); }}
                    className="w-full text-left px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--color-destructive-bg)] hover:text-[var(--color-destructive)] transition-colors flex items-center gap-2"
                    role="menuitem"
                    title="Forget this wallet in the dApp. To fully revoke access, remove the site from Phantom → Settings → Trusted Apps."
                  >
                    <X className="w-3.5 h-3.5" />
                    {t('disconnect')}
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={openWalletModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--bg-base)] text-xs font-semibold transition-colors"
            >
              <Wallet className="w-3.5 h-3.5" />
              {t('connectWallet')}
            </button>
          )}
        </motion.div>
      </div>

      <motion.div
        variants={itemVariants}
        className="mb-6 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-4 py-3 text-sm text-[var(--text-secondary)]"
      >
        <div className="flex items-start gap-3">
          <Diamond className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
          <div>
            <p className="font-semibold text-[var(--text-primary)]">{t('hatcherDiscountTitle')}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">{t('hatcherDiscountBody')}</p>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="mb-6 p-4 rounded-xl border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] text-sm text-[var(--color-destructive)]">
          {error}
        </motion.div>
      )}

      {/* ── AI Credits Balance Card ───────────────────────── */}
      <motion.div className={`mb-8 ${cardClass}`} variants={itemVariants}>
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[var(--color-info)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">AI Credits</h2>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
	            <div>
	              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-[var(--text-primary)] tabular-nums" style={{ fontFamily: 'var(--font-mono, "JetBrains Mono"), monospace' }}>
	                  {format.number(aiCreditBalance)}
	                </span>
	                <span className="text-sm text-[var(--text-muted)]">credits</span>
	              </div>
	              <p className="text-xs text-[var(--text-muted)] mt-1">
	                Used by hosted LLMs, web search, research, extract, and crawl tools. Not refundable and not usable for plan payments.
	              </p>
	            </div>
	          </div>

	          {/* Recent AI credit usage */}
	          <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
	            <div className="mb-3 flex items-center justify-between gap-3">
	              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">Recent AI usage</p>
	              <Link href="/dashboard/analytics" className="text-xs text-[var(--color-accent)] hover:underline">
	                Full analytics
	              </Link>
	            </div>
	            {aiCreditHistory.length > 0 ? (
	              <div className="space-y-2">
	                {aiCreditHistory.slice(0, 10).map((tx) => (
	                  <div key={tx.id} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2">
	                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
	                      <div className="min-w-0">
	                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-[var(--color-info-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-info)]">
	                            {formatUsageKind(tx.kind)}
	                          </span>
	                          <span className="truncate text-xs font-medium text-[var(--text-primary)]">
	                            {[tx.provider, tx.model].filter(Boolean).join(' / ') || 'Hosted usage'}
	                          </span>
	                        </div>
	                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]">
	                          <span>{formatDate(tx.createdAt)}</span>
	                          {(tx.inputTokens || tx.outputTokens) ? (
	                            <span>
	                              in {formatTokenCount(tx.inputTokens)} / out {formatTokenCount(tx.outputTokens)} tokens
	                            </span>
	                          ) : null}
	                          {tx.agentName ? (
	                            <span>{tx.agentName}</span>
	                          ) : tx.agentId ? (
	                            <span className="font-mono">agent {tx.agentId.slice(0, 8)}...</span>
	                          ) : null}
	                        </div>
	                      </div>
	                      <span
                        className="text-sm font-semibold tabular-nums text-[var(--color-destructive)] sm:text-right"
	                        style={{ fontFamily: 'var(--font-mono, "JetBrains Mono"), monospace' }}
	                      >
	                        -{tx.credits.toLocaleString()} AI
	                      </span>
	                    </div>
	                  </div>
	                ))}
	              </div>
	            ) : (
	              <div className="rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-4 text-sm text-[var(--text-muted)]">
	                No hosted AI usage yet. Hosted model calls, web search, research, extract, and crawl actions will appear here.
	              </div>
	            )}
	          </div>
        </div>
      </motion.div>

      {/* ── Solana Recurring Billing ──────────────────────── */}
      <motion.div className={`mb-8 ${cardClass}`} variants={itemVariants}>
        <div className="px-4 sm:px-6 py-4 flex flex-col gap-1 border-b border-[var(--border-default)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--color-accent)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Solana recurring billing</h2>
          </div>
	          <span className="text-[11px] font-medium text-[var(--text-muted)]">USDC only</span>
        </div>
        <div className="p-4 sm:p-6 space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Target</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'ai_credits' as const, label: 'AI Credits' },
                  { key: 'tier' as const, label: 'Tier renewal' },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setRecurringMode(option.key)}
                    className={`h-10 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                      recurringMode === option.key
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--color-accent)]/40'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {recurringMode === 'tier' ? 'Plan' : 'Top-up'}
              </label>
              {recurringMode === 'tier' ? (
                <select
                  value={recurringTierKey}
                  onChange={(event) => setRecurringTierKey(event.target.value as UserTierKey)}
                  className="h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)]"
                >
                  {TIER_ORDER.filter((key) => key !== 'free' && key !== 'founding_member').map((key) => (
                    <option key={key} value={key}>{TIERS[key].name}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={recurringAiCreditKey}
                  onChange={(event) => setRecurringAiCreditKey(event.target.value as BillingAddonKey)}
                  className="h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)]"
                >
                  {AI_CREDIT_ADDONS.map((addon) => (
                    <option key={addon.key} value={addon.key}>{addon.name}</option>
                  ))}
                </select>
              )}
            </div>

	            <div>
	              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Asset</p>
	              <div className="flex h-10 items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 lg:w-48">
	                <span className="text-sm font-semibold text-[var(--text-primary)]">USDC</span>
	                <span className="text-[11px] text-[var(--text-muted)]">fixed USD</span>
	              </div>
	            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3">
            {recurringQuote ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{recurringQuote.description}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {recurringQuote.amountPerPeriodHuman.toLocaleString(undefined, { maximumFractionDigits: 9 })} {recurringQuote.asset.symbol} monthly · expires {formatDate(recurringQuote.expiresAt)}
                  </p>
	                  <p className="mt-1 text-xs text-[var(--text-muted)]">Recurring billing is limited to USDC so the monthly dollar amount stays stable.</p>
	                  <p className="mt-1 text-xs text-[var(--text-muted)]">
	                    Phantom may show an unlimited USDC approval. The subscriptions program enforces this monthly limit, and cancel signs an on-chain revocation that clears the token approval.
	                  </p>
                </div>
                <span className="text-lg font-bold tabular-nums text-[var(--text-primary)]">${recurringQuote.amountUsd}</span>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                Preview the monthly USDC allowance before opening your wallet. Phantom will show a broad token approval; Hatcher records the monthly limit on-chain and cancel revokes the approval.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-[var(--text-muted)]">
              {revocableRecurringAuthorizations.length > 0
                ? `${activeRecurringAuthorizationCount} active authorization${activeRecurringAuthorizationCount === 1 ? '' : 's'}`
                : 'No active recurring authorizations'}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void loadRecurringQuote()}
                disabled={recurringBusy}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] px-4 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--color-accent)]/40 disabled:opacity-50"
              >
                {recurringBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Receipt className="h-3.5 w-3.5" />}
                Preview
              </button>
              <button
                type="button"
                onClick={() => void handleSetupRecurring()}
                disabled={recurringBusy}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 text-xs font-semibold text-[var(--bg-base)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
              >
                {recurringBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
                Set up monthly
              </button>
            </div>
          </div>

          {revocableRecurringAuthorizations.length > 0 && (
            <div className="space-y-2 border-t border-[var(--border-default)] pt-4">
              {revocableRecurringAuthorizations.slice(0, 4).map((row) => (
	                <div key={row.id} className="flex flex-col gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
	                  <div className="min-w-0">
	                    <p className="font-semibold text-[var(--text-primary)] truncate">{formatFeatureKey(row.featureKey)}</p>
	                    <p className="mt-0.5 text-[var(--text-muted)]">
	                      {Number(row.amountPerPeriod).toLocaleString(undefined, { maximumFractionDigits: 9 })} {row.asset.toUpperCase()} · next {row.nextChargeAt ? formatDate(row.nextChargeAt) : 'paused'}
	                    </p>
	                    {(row.status === 'active' || row.status === 'action_required') && (
	                      <p className="mt-0.5 text-[var(--text-muted)]">
	                        Cancel signs a wallet transaction that revokes the USDC token approval. Because USDC approval is shared per wallet, this disables all active USDC monthly authorizations for this wallet.
	                      </p>
	                    )}
	                  </div>
	                  <div className="flex shrink-0 items-center gap-2">
	                    <span className={`w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
	                      row.status === 'active'
	                        ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
	                        : 'border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-muted)]'
	                    }`}>
	                      {row.status}
	                    </span>
	                    {(row.status === 'active' || row.status === 'action_required') && (
	                      <button
	                        type="button"
	                        onClick={() => void handleCancelRecurring(row)}
	                        disabled={recurringCancelId === row.id}
	                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-default)] px-2.5 text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--color-destructive)] hover:text-[var(--color-destructive)] disabled:opacity-50"
	                      >
	                        {recurringCancelId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
	                        Revoke monthly
	                      </button>
	                    )}
	                  </div>
	                </div>
	              ))}
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
                  <Crown className="w-7 h-7 text-[var(--color-accent)]" />
                ) : currentTier === 'pro' ? (
                  <Crown className="w-7 h-7 text-[var(--color-accent)]" />
                ) : currentTier === 'business' ? (
                  <Crown className="w-7 h-7 text-[var(--color-accent)]" />
                ) : currentTier === 'starter' ? (
                  <Zap className="w-7 h-7 text-[var(--color-accent)]" />
                ) : (
                  <Rocket className="w-7 h-7 text-[var(--color-info)]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">{tTiers(`${currentTier as 'free' | 'starter' | 'pro' | 'business' | 'founding_member'}.name`)}</h2>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    currentTier === 'free'
                      ? 'text-[var(--color-success)] bg-[var(--color-success-bg)] border border-[var(--color-success-border)]'
                      : 'text-[var(--color-accent)] bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20'
                  }`}>
                    {currentTier === 'free' ? t('freeTier') : t('active')}
                  </span>
                </div>
	                <p className="text-sm text-[var(--text-muted)]">
	                {tierConfig.usdPrice === 0 ? t('noCharge') : currentTier === 'founding_member' ? `$${tierConfig.usdPrice} ${t('lifetimePrice')}` : `$${tierConfig.usdPrice} ${t('monthSuffix')}`}
	                  {` -- ${(accountData?.aiCredits?.monthlyGrant ?? AI_CREDITS_BY_TIER[currentTier]).toLocaleString()} AI Credits/month`}
	                </p>
                {accountData?.subscriptionExpiresAt && (() => {
                  const expires = new Date(accountData.subscriptionExpiresAt);
                  const daysLeft = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isExpiring = daysLeft <= 7 && daysLeft > 0;
                  const isExpired = daysLeft <= 0;
                  return (
                    <div className="mt-2 space-y-2">
                      <div className={`flex items-center gap-1.5 text-xs ${isExpired ? 'text-[var(--color-destructive)]' : isExpiring ? 'text-[var(--color-warning)]' : 'text-[var(--text-muted)]'}`}>
                        <Clock className="w-3 h-3" />
                        {isExpired
                          ? t('planExpired')
                          : isExpiring
                            ? (daysLeft > 1 ? t('planExpiringPlural', { days: daysLeft }) : t('planExpiring', { days: daysLeft }))
                            : t('planActiveUntil', { date: formatDate(accountData.subscriptionExpiresAt) })}
                      </div>
                      {(isExpiring || isExpired) && (
                        <button
                          onClick={() => handleSubscribe(currentTier)}
                          disabled={subscribing !== null}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--bg-base)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors"
                        >
                          {subscribing === currentTier ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                          {t('renewFor', { price: tierConfig.usdPrice })}
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Subscription management for paid users.
                Founding Member is lifetime → nothing to renew; all other
                paid tiers get a one-click Renew that stacks another 30
                days on the current expiry (backend handles extension via
                the subscribe handler's isRenewal branch). The legacy
                Stripe-style "Manage Billing" button was retired —
                payments are one-shot on-chain, there's no portal to
                manage. */}
            {currentTier !== 'free' && currentTier !== 'founding_member' && (() => {
              // Hard-compute the annual price here rather than via
              // `computePrice(…, true)` — that helper returns monthly when
              // the global toggle is on 'monthly', which would make this
              // button show $19.99 and then jump to $203.90 after the
              // click flipped the toggle. We always want the annual cost
              // on the annual button.
              const tierMonthly = TIERS[currentTier].usdPrice;
              const tierAnnual = Math.round(tierMonthly * 12 * annualDiscountFactor * 100) / 100;
              return (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:flex-wrap mt-4 pt-4 border-t border-[var(--border-default)]">
                  <button
                    onClick={() => {
                      setBillingPeriod('monthly');
                      openSubscribeModal(currentTier as UserTierKey, 'renew');
                    }}
                    title={`Buy another 30 days of ${TIERS[currentTier].name}. Days stack on top of the current expiry.`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--bg-base)] transition-colors"
                  >
                    <Clock className="w-3 h-3" />
                    {t('extend30Days', { price: tierMonthly })}
                  </button>
                  <button
                    onClick={() => {
                      setBillingPeriod('annual');
                      openSubscribeModal(currentTier as UserTierKey, 'renew');
                    }}
                    title={`Buy a full year of ${TIERS[currentTier].name} at 15% off. Days stack on top of the current expiry.`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--color-accent-border)] bg-[var(--color-accent-bg)] text-[var(--color-accent)] transition-all hover:opacity-85"
                  >
                    <Clock className="w-3 h-3" />
                    {t('upgradeAnnual', { price: tierAnnual })}
                    <span className="inline-flex items-center px-1 py-px rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] text-[9px] font-bold leading-none">
                      -15%
                    </span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      </motion.div>

      {/* ── Agent Usage ───────────────────────────────────── */}
      <motion.div className={`mb-8 ${cardClass}`} variants={itemVariants}>
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--color-accent)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">{t('agentUsage')}</h2>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[var(--text-secondary)]">
              {t('agentsOf', { count: agentCount, limit: agentLimit })}
            </span>
            <span className={`text-xs ${agentCount > agentLimit ? 'text-[var(--color-destructive)]' : 'text-[var(--text-muted)]'}`}>
              {agentCount > agentLimit
                ? t('agentsOver', { over: agentCount - agentLimit })
                : (agentLimit - agentCount !== 1
                  ? t('slotsRemainingPlural', { slots: agentLimit - agentCount })
                  : t('slotsRemaining', { slots: agentLimit - agentCount }))}
            </span>
          </div>
          <div className="w-full h-2.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((agentCount / agentLimit) * 100, 100)}%`,
                background: agentCount >= agentLimit
                  ? 'var(--color-destructive)'
                  : 'var(--action)',
              }}
            />
          </div>

          {/* Active add-ons — each current subscription-type addon
              (agents.3 / agents.10) gets an Extend button
              that reopens the payment modal in "renew" mode, preserving
              the agent context for scoped addons so the buyer never
              has to re-pick the agent. one_time addons are skipped. */}
          {activeAddons.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium mb-2">{t('activeAddons')}</p>
              <div className="space-y-2">
                {activeAddons.map((addon) => {
                  const catalogAddon = findBillingAddon(addon.key);
                  const isRenewable = addon.type === 'subscription' && Boolean(catalogAddon);
                  return (
                    <div key={addon.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                        <span className="text-[var(--text-secondary)] truncate">
                          {addon.name}
                          {addon.perAgent && addon.agentName && (
                            <span className="text-[var(--text-muted)] ml-1">· {addon.agentName}</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {addon.expiresAt && (
                          <span className="text-xs text-[var(--text-muted)]">
                            {t('expires', { date: formatDate(addon.expiresAt) })}
                          </span>
                        )}
                        {isRenewable && (
                          <button
                            onClick={() => catalogAddon && openAddonModal(catalogAddon.key, {
                              presetAgentId: addon.agentId ?? null,
                              mode: 'renew',
                            })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-[var(--color-accent)]/30 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
                            title="Buy another 30 days. Days stack on top of the current expiry."
                          >
                            <Clock className="w-3 h-3" />
                            {t('extend')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Need more agent slots? */}
          <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
            <a href="#addons" className="text-xs text-[var(--color-accent)] hover:text-[#fed7aa] transition-colors flex items-center gap-1">
              <Plus className="w-3 h-3" />
              Need more agent slots? Add extra capacity
            </a>
          </div>
        </div>
      </motion.div>

      {/* ── Upgrade Tier ─────────────────────────────────── */}
      {currentTier !== 'founding_member' && (
        <motion.div className={`mb-8 ${cardClass}`} variants={itemVariants}>
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-[var(--border-default)]">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-[var(--color-accent)]" />
              <h2 className="font-semibold text-[var(--text-primary)]">{t('upgradeSection')}</h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Monthly / Annual toggle — drives pricing on both tier
                  cards below AND the Add-ons section further down so
                  the whole page switches in sync. */}
              <div className="inline-flex items-center gap-1 p-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                    billingPeriod === 'monthly'
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {t('monthly')}
                </button>
                <button
                  onClick={() => setBillingPeriod('annual')}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                    billingPeriod === 'annual'
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {t('annual')}
                  <span className="inline-flex items-center px-1 py-px rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] text-[9px] font-bold leading-none">
                    -15%
                  </span>
                </button>
              </div>
              <Link href="/pricing" className="text-xs text-[var(--color-accent)] hover:text-[#fed7aa] transition-colors duration-200">
                Compare plans &rarr;
              </Link>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              {TIER_ORDER.filter(k => k !== 'free' && TIER_ORDER.indexOf(k) > TIER_ORDER.indexOf(currentTier)).map((tierKey) => {
                const tier = TIERS[tierKey];
                const tierResources = TIER_RESOURCE_OVERRIDES[tierKey];
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-[var(--text-primary)]">{tier.name}</h3>
                        {tierKey === 'pro' && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--color-accent)] text-[var(--bg-base)] font-bold uppercase tracking-wider">
                            Popular
                          </span>
                        )}
                        {tierKey === 'founding_member' && foundingInfo && (
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            foundingInfo.remaining === 0
                              ? 'bg-[var(--color-destructive-bg)] text-[var(--color-destructive)] border border-[var(--color-destructive-border)]'
                              : foundingInfo.remaining <= 3
                                ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning-border)] animate-pulse'
                                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-default)]'
                          }`}>
                            {foundingInfo.remaining === 0
                              ? t('foundingSoldOut')
                              : t('foundingSlots', { remaining: foundingInfo.remaining, max: foundingInfo.maxSlots })}
                          </span>
                        )}
                      </div>
                      {(() => {
                        const isLifetime = tierKey === 'founding_member';
                        const monthly = tier.usdPrice;
                        const displayPrice = isLifetime ? monthly : (billingPeriod === 'annual' ? computePrice(monthly, true) : monthly);
                        const hatcherPrice = priceForHatcherPayment(displayPrice);
                        const suffix = isLifetime
                          ? t('lifetimePrice')
                          : billingPeriod === 'annual'
                            ? t('annualSuffix')
                            : t('monthSuffix');
                        return (
                          <div className="flex flex-col items-end">
                            <span className="text-xl font-extrabold text-[var(--text-primary)]">
                              ${displayPrice}
                              <span className="text-xs text-[var(--text-muted)] font-normal"> {suffix}</span>
                            </span>
                            {!isLifetime && billingPeriod === 'annual' && (
                              <span className="text-[10px] text-[var(--color-success)] font-semibold">
                                Save ${(monthly * 12 - displayPrice).toFixed(2)}/yr
                              </span>
                            )}
                            <span className="text-[10px] text-[var(--color-warning)] font-semibold">
                              {t('hatcherDiscountDesc', { price: `$${hatcherPrice.toFixed(2)}` })}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="space-y-1.5 mb-4">
	                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
	                        <Check className="w-3 h-3 text-[var(--color-accent)]" />
                        {tierResources.includedAgents} agent{tierResources.includedAgents > 1 ? 's' : ''}, {AI_CREDITS_BY_TIER[tierKey].toLocaleString()} AI Credits/month
	                      </p>
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-[var(--color-accent)]" />
                        {tierResources.cpuLimit} CPU, {tierResources.memoryMb >= 1024 ? `${tierResources.memoryMb / 1024} GB` : `${tierResources.memoryMb} MB`} RAM, {tierResources.storageMb >= 1024 ? `${tierResources.storageMb / 1024} GB` : `${tierResources.storageMb} MB`} storage
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-[var(--color-accent)]" />
                        File Manager + Full Logs included
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-[var(--color-accent)]" />
                        {tierResources.autoSleep ? `Sleeps after ${tierResources.autoSleepMinutes / 60}h idle` : 'Always active'}
                      </p>
                    </div>
                    {(() => {
                      const foundingSoldOut = tierKey === 'founding_member' && foundingInfo?.remaining === 0;
                      return (
                        <button
                          onClick={() => handleSubscribe(tierKey)}
                          disabled={isSubscribing || subscribing !== null || foundingSoldOut}
                          className="w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-[var(--bg-base)]"
                          style={{
                            background: foundingSoldOut ? 'var(--bg-elevated)' : 'var(--color-accent)',
                            boxShadow: foundingSoldOut ? 'none' : '0 4px 16px var(--accent-glow)',
                          }}
                        >
                          {isSubscribing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {tc('loading')}
                            </>
                          ) : foundingSoldOut ? (
                            <>{t('foundingSoldOut')}</>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" />
                              Upgrade to {tier.name}
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Account Add-ons ─────────────────────────────── */}
      <motion.div id="addons" className={`mb-8 ${cardClass}`} variants={itemVariants}>
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[var(--color-accent)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">{t('accountAddons')}</h2>
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">Stackable · shared across all agents</span>
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          {/* Grouped by category for readability. */}
          {([
            { label: 'AI Credits', keys: ['addon.ai_credits.5000', 'addon.ai_credits.10000', 'addon.ai_credits.25000', 'addon.ai_credits.50000'] },
            { label: 'Extra Agents', keys: ['addon.agents.1', 'addon.agents.3', 'addon.agents.5', 'addon.agents.10'] },
          ] as const).map((group) => {
            const groupAddons = group.keys
              .map((k) => findBillingAddon(k))
              .filter((a): a is BillingAddon => Boolean(a));
            if (groupAddons.length === 0) return null;

            return (
              <div key={group.label}>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-2">
                  {group.label}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {groupAddons.map((addon) => {
                    const isBuying = purchasingAddon === addon.key;
                    const isSub = addon.type === 'subscription';
                    const displayPrice = isSub && billingPeriod === 'annual'
                      ? computePrice(addon.usdPrice, true)
                      : addon.usdPrice;
                    const hatcherPrice = priceForHatcherPayment(displayPrice);
                    const suffix = addon.type === 'one_time'
                      ? t('oneTimeSuffix')
                      : billingPeriod === 'annual' ? t('annualSuffix') : t('monthSuffix');

                    return (
                      <div
                        key={addon.key}
                        className="p-4 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-accent)]/30 transition-all flex flex-col min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-2 min-w-0">
                          {addon.aiCredits ? (
                            <Zap className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                          ) : (
                            <Users className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                          )}
                          <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{addon.name}</span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-1">
                          <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                            ${displayPrice}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">{suffix}</span>
                        </div>
                        {isSub && billingPeriod === 'annual' && (
                          <p className="text-[10px] text-[var(--color-success)] font-semibold mb-2">
                            Save ${(addon.usdPrice * 12 - displayPrice).toFixed(2)}/yr
                          </p>
                        )}
                        <p className="text-[10px] text-[var(--color-warning)] font-semibold mb-2">
                          {t('hatcherDiscountDesc', { price: `$${hatcherPrice.toFixed(2)}` })}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mb-3 flex-1">
                          {addon.description}
                        </p>
                        <button
                          onClick={() => handlePurchaseAddon(addon.key)}
                          disabled={isBuying || purchasingAddon !== null}
                          className="w-full inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-[var(--color-accent)]/30 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] transition-all disabled:opacity-40 font-semibold"
                        >
                          {isBuying ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Purchasing...
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              Buy for ${displayPrice}
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Payment History ──────────────────────────────── */}
      <motion.div className={`overflow-hidden ${cardClass}`} variants={itemVariants}>
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[var(--text-muted)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">{t('paymentHistory')}</h2>
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
            title={t('noPaymentsYet')}
            description={t('noPaymentsDesc')}
            actionLabel={t('manageBilling')}
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

      {/* Pre-sign review modal — shared across billing + agent unlocks. */}
      <ConfirmPaymentModal state={confirmState} onClose={closeConfirm} />

      {/* Payment method modal */}
      <PaymentMethodModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
        title={paymentModal.title}
        price={paymentModal.price}
        onPayWithSOL={paymentModal.type === 'subscription' ? handleSubscribeSOL : handlePurchaseAddonSOL}
        onPayWithHATCHER={paymentModal.type === 'subscription' ? handleSubscribeHATCHER : handlePurchaseAddonHATCHER}
        onPayWithKAUSA={paymentModal.type === 'subscription' ? handleSubscribeKAUSA : handlePurchaseAddonKAUSA}
        onPayWithUSDC={paymentModal.type === 'subscription' ? handleSubscribeUSDC : handlePurchaseAddonUSDC}
        onPayWithCryptoNow={paymentModal.type === 'subscription' ? handleSubscribeCryptoNow : handlePurchaseAddonCryptoNow}
        onPayWithCard={paymentModal.type === 'subscription' ? handleSubscribeStripe : handlePurchaseAddonStripe}
        loading={paymentLoading}
        requiresAgent={paymentModal.type === 'addon' && findBillingAddon(paymentModal.addonKey)?.perAgent}
        agents={userAgents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={setSelectedAgentId}
      />

      {/* Success toast */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 card-solid px-5 py-3 border-l-4 border-[var(--color-success)] shadow-lg max-w-[calc(100vw-2rem)]"
        >
          <p className="text-sm text-[var(--color-success)]">{successMsg}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
