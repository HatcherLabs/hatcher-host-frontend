'use client';

// ============================================================
// /dashboard/affiliate — self-service affiliate dashboard
// ============================================================
// Phase IV. Fetches /affiliate/me up front; a 403 ("Not an active
// affiliate") redirects the user to /affiliate/apply so the flow
// never crashes on non-affiliates. On 200 we render the full
// dashboard: share link, 4 stat cards, referrals / commissions /
// payouts tables, and a read-only settings panel.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  Clock,
  Wallet,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ExternalLink,
  Flag,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';

// ─── Types ───────────────────────────────────────────────────
type AffiliateMe = {
  affiliate: {
    id: string;
    referralCode: string;
    payoutMode: 'CASH_ONLY' | 'CREDITS_ONLY' | 'HYBRID';
    payoutAddress: string | null;
    isActive: boolean;
    isFrozen: boolean;
    frozenReason: string | null;
    totalReferrals: number;
    totalPaidRefs: number;
    lifetimeEarnedCashUsd: number;
    lifetimeEarnedCredits: number;
    createdAt: string;
  };
  shareLink: string;
};

type Stats = {
  totalReferrals: number;
  paidReferrals: number;
  pending: { cashUsd: number; credits: number };
  payable: { cashUsd: number; credits: number };
  paid: { cashUsd: number; credits: number };
  voided: { count: number };
  lifetime: {
    cashUsdEarned: number;
    creditsEarned: number;
    cashUsdPaidOut: number;
    creditsPaidOut: number;
  };
};

type Referral = {
  id: string;
  referredAt: string;
  maskedEmail: string;
  isPaid: boolean;
  tier: string | null;
  isFlagged: boolean;
  flagReason: string | null;
};

type Commission = {
  id: string;
  createdAt: string;
  sourceType: 'SUBSCRIPTION' | 'FOUNDING_MEMBER';
  sourceAmountUsd: number;
  cashAmountUsd: number;
  creditsAmount: number;
  status: 'PENDING' | 'PAYABLE' | 'PAID' | 'VOIDED';
  payableAt: string;
  paidOutAt: string | null;
  payoutId: string | null;
};

type Payout = {
  id: string;
  processedAt: string;
  cashAmountUsd: number;
  cashTxHash: string | null;
  cashCurrency: string | null;
  creditsAmount: number;
  creditsAppliedAt: string | null;
  adminNote: string;
  commissionCount: number;
};

// ─── Helpers ─────────────────────────────────────────────────
function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtCredits(n: number): string {
  // Strip trailing ".00" to keep credits lines compact — round-number
  // credits are the common case, decimals happen only on prorated
  // refunds and upgrade credits.
  const s = n.toFixed(2);
  return s.endsWith('.00') ? s.slice(0, -3) : s;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function payoutModeLabel(mode: AffiliateMe['affiliate']['payoutMode']): string {
  switch (mode) {
    case 'CASH_ONLY': return 'Cash only (20%)';
    case 'CREDITS_ONLY': return 'Credits only (40%)';
    case 'HYBRID': return 'Hybrid (15% cash + 25% credits)';
  }
}

function sourceLabel(s: Commission['sourceType']): string {
  return s === 'FOUNDING_MEMBER' ? 'Founding Member' : 'Subscription';
}

// ─── Stat Card (mirrors admin panel style) ───────────────────
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-5"
      style={{
        background: 'var(--bg-elevated)',
        borderColor: highlight ? iconColor : 'var(--border-default)',
        boxShadow: highlight ? `0 0 0 1px ${iconColor}20` : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.08em] font-semibold mb-2 text-[var(--text-muted)]">
            {label}
          </p>
          <p className="text-xl sm:text-2xl leading-tight font-bold text-[var(--text-primary)] break-words">
            {value}
          </p>
          {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${iconColor}18` }}
        >
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Copy Button (client) ────────────────────────────────────
function CopyButton({ value }: { value: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy — please copy manually');
    }
  }, [value, toast]);

  return (
    <button
      onClick={onCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
      style={{
        background: copied ? 'var(--color-accent)' : 'var(--bg-card)',
        color: copied ? 'white' : 'var(--text-primary)',
        borderColor: copied ? 'var(--color-accent)' : 'var(--border-default)',
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ─── Share actions ───────────────────────────────────────────
function ShareActions({ shareLink }: { shareLink: string }) {
  const text = `I'm hosting my AI agents on Hatcher — join via my link and we both get credits.`;
  const xUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareLink)}`;
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(text)}`;

  return (
    <div className="flex items-center gap-2 text-xs">
      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-2.5 py-1 rounded-md border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--color-accent)]/40 transition-colors"
      >
        Share on X
      </a>
      <a
        href={tgUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-2.5 py-1 rounded-md border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--color-accent)]/40 transition-colors"
      >
        Telegram
      </a>
    </div>
  );
}

// ─── Status badge ────────────────────────────────────────────
function StatusBadge({ status }: { status: Commission['status'] }) {
  const style: Record<Commission['status'], { bg: string; color: string; label: string }> = {
    PENDING: { bg: 'rgba(245,158,11,0.10)', color: '#f59e0b', label: 'Pending' },
    PAYABLE: { bg: 'rgba(34,197,94,0.10)', color: '#22c55e', label: 'Payable' },
    PAID: { bg: 'rgba(59,130,246,0.10)', color: '#60a5fa', label: 'Paid' },
    VOIDED: { bg: 'rgba(239,68,68,0.10)', color: '#f87171', label: 'Voided' },
  };
  const s = style[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// ─── Paginated Table shell ───────────────────────────────────
function TableShell({
  title,
  children,
  empty,
  isEmpty,
  loading,
  onLoadMore,
  hasMore,
}: {
  title: string;
  children: React.ReactNode;
  empty: string;
  isEmpty: boolean;
  loading: boolean;
  onLoadMore?: () => void;
  hasMore: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border mb-6"
      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
    >
      <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      {loading ? (
        <div className="p-6 text-center text-xs text-[var(--text-muted)]">Loading…</div>
      ) : isEmpty ? (
        <div className="p-10 text-center">
          <p className="text-sm text-[var(--text-muted)]">{empty}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">{children}</div>
          {hasMore && onLoadMore && (
            <div className="px-5 py-3 border-t border-[var(--border-default)] text-center">
              <button
                onClick={onLoadMore}
                className="text-xs text-[var(--color-accent)] hover:underline"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function AffiliateDashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [me, setMe] = useState<AffiliateMe | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [refsCursor, setRefsCursor] = useState<string | null>(null);
  const [refsLoading, setRefsLoading] = useState(true);

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [comCursor, setComCursor] = useState<string | null>(null);
  const [comLoading, setComLoading] = useState(true);

  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payCursor, setPayCursor] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 403 → /affiliate/apply. Every other error goes to a banner so the
  // dashboard can still partially render (stats may load even if one
  // list endpoint blips).
  const gateByAffiliate = useCallback(async () => {
    const res = await api.getAffiliateMe();
    if (!res.success) {
      if (res.error === 'Not an active affiliate') {
        router.replace('/affiliate/apply?reason=not-active');
        return null;
      }
      setError(res.error);
      return null;
    }
    setMe(res.data);
    return res.data;
  }, [router]);

  const loadStats = useCallback(async () => {
    const r = await api.getAffiliateStats();
    if (r.success) setStats(r.data);
  }, []);

  const loadReferrals = useCallback(async (cursor?: string) => {
    setRefsLoading(true);
    const r = await api.getAffiliateReferrals({ limit: 20, cursor });
    if (r.success) {
      setReferrals((prev) => (cursor ? [...prev, ...r.data.referrals] : r.data.referrals));
      setRefsCursor(r.data.nextCursor);
    }
    setRefsLoading(false);
  }, []);

  const loadCommissions = useCallback(async (cursor?: string) => {
    setComLoading(true);
    const r = await api.getAffiliateCommissions({ limit: 20, cursor });
    if (r.success) {
      setCommissions((prev) => (cursor ? [...prev, ...r.data.commissions] : r.data.commissions));
      setComCursor(r.data.nextCursor);
    }
    setComLoading(false);
  }, []);

  const loadPayouts = useCallback(async (cursor?: string) => {
    setPayLoading(true);
    const r = await api.getAffiliatePayouts({ limit: 20, cursor });
    if (r.success) {
      setPayouts((prev) => (cursor ? [...prev, ...r.data.payouts] : r.data.payouts));
      setPayCursor(r.data.nextCursor);
    }
    setPayLoading(false);
  }, []);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    const gated = await gateByAffiliate();
    if (!gated) {
      setLoading(false); setRefreshing(false);
      return;
    }
    await Promise.all([
      loadStats(),
      loadReferrals(),
      loadCommissions(),
      loadPayouts(),
    ]);
    setLoading(false);
    setRefreshing(false);
  }, [gateByAffiliate, loadStats, loadReferrals, loadCommissions, loadPayouts]);

  useEffect(() => {
    if (isAuthenticated) loadAll();
  }, [isAuthenticated, loadAll]);

  // ─── Loading / auth / error ─────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--border-default)] border-t-[var(--text-muted)] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Shield className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">Sign In Required</h1>
        <p className="mb-6 text-[var(--text-secondary)]">Sign in to view your affiliate dashboard.</p>
        <Link href="/login" className="btn-primary">Sign In</Link>
      </div>
    );
  }

  const aff = me?.affiliate;
  const payableHighlight = (stats?.payable.cashUsd ?? 0) > 0 || (stats?.payable.credits ?? 0) > 0;

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/agents"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Dashboard</p>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'Sora, sans-serif' }}>
                Affiliate Dashboard
              </h1>
              {aff && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Code <span className="font-mono text-[var(--text-primary)]">{aff.referralCode}</span>
                  <span className="mx-2">·</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[var(--border-default)] text-[10px] font-semibold uppercase tracking-wider">
                    {aff.payoutMode.replace('_', ' ')}
                  </span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => loadAll(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </motion.div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 mb-6 text-sm text-red-400">
            {error}
          </div>
        )}

        {aff?.isFrozen && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 mb-6 text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-400">Account frozen</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {aff.frozenReason ?? 'Contact support for details.'}
              </p>
            </div>
          </div>
        )}

        {/* Referral Link Card */}
        {loading ? (
          <div className="rounded-2xl border p-6 mb-6 h-24 animate-pulse" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }} />
        ) : me ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border p-5 sm:p-6 mb-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-card) 100%)',
              borderColor: 'var(--border-default)',
            }}
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--text-muted)] mb-1.5">
                  Your Referral Link
                </p>
                <p className="font-mono text-base sm:text-lg font-semibold text-[var(--text-primary)] break-all">
                  {me.shareLink.replace(/^https?:\/\//, '')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <CopyButton value={me.shareLink} />
                <ShareActions shareLink={me.shareLink} />
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-3">
              New signups via this link are attributed to you for life.
            </p>
          </motion.div>
        ) : null}

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {loading || !stats ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border p-5 h-28 animate-pulse" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }} />
            ))
          ) : (
            <>
              <StatCard
                label="Total Referrals"
                value={stats.totalReferrals.toString()}
                sub={`${stats.paidReferrals} paid`}
                icon={Users}
                iconColor="var(--color-accent)"
              />
              <StatCard
                label="Pending (30d hold)"
                value={`${fmtUsd(stats.pending.cashUsd)} + ${fmtCredits(stats.pending.credits)} cr`}
                icon={Clock}
                iconColor="#f59e0b"
              />
              <StatCard
                label="Payable Now"
                value={`${fmtUsd(stats.payable.cashUsd)} + ${fmtCredits(stats.payable.credits)} cr`}
                icon={Wallet}
                iconColor="#22c55e"
                highlight={payableHighlight}
              />
              <StatCard
                label="Lifetime Earned"
                value={`${fmtUsd(stats.lifetime.cashUsdEarned)} + ${fmtCredits(stats.lifetime.creditsEarned)} cr`}
                sub={`${fmtUsd(stats.lifetime.cashUsdPaidOut)} paid out`}
                icon={TrendingUp}
                iconColor="#60a5fa"
              />
            </>
          )}
        </div>

        {/* Referrals Table */}
        <TableShell
          title="Referrals"
          empty="No referrals yet. Share your link!"
          isEmpty={referrals.length === 0}
          loading={refsLoading && referrals.length === 0}
          onLoadMore={refsCursor ? () => loadReferrals(refsCursor) : undefined}
          hasMore={!!refsCursor}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-default)]">
                <th className="text-left font-semibold px-5 py-3">Signup</th>
                <th className="text-left font-semibold px-5 py-3">Email</th>
                <th className="text-left font-semibold px-5 py-3">Status</th>
                <th className="text-left font-semibold px-5 py-3">Tier</th>
                <th className="text-left font-semibold px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border-default)]/60 last:border-0 hover:bg-[var(--bg-card)]/40 transition-colors">
                  <td className="px-5 py-3 text-xs text-[var(--text-muted)]">{fmtDate(r.referredAt)}</td>
                  <td className="px-5 py-3 font-mono text-xs text-[var(--text-primary)]">{r.maskedEmail}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${r.isPaid ? 'text-green-400' : 'text-[var(--text-muted)]'}`}
                      style={{ background: r.isPaid ? 'rgba(34,197,94,0.10)' : 'var(--bg-card)' }}
                    >
                      {r.isPaid ? 'Paid' : 'Free'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--text-primary)] capitalize">{r.tier ?? '—'}</td>
                  <td className="px-5 py-3">
                    {r.isFlagged && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-red-400" title={r.flagReason ?? 'Flagged'}>
                        <Flag size={11} /> Flagged
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>

        {/* Commissions Table */}
        <TableShell
          title="Commissions"
          empty="No commissions yet."
          isEmpty={commissions.length === 0}
          loading={comLoading && commissions.length === 0}
          onLoadMore={comCursor ? () => loadCommissions(comCursor) : undefined}
          hasMore={!!comCursor}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-default)]">
                <th className="text-left font-semibold px-5 py-3">Date</th>
                <th className="text-left font-semibold px-5 py-3">Source</th>
                <th className="text-left font-semibold px-5 py-3">Amount</th>
                <th className="text-left font-semibold px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id} className="border-b border-[var(--border-default)]/60 last:border-0 hover:bg-[var(--bg-card)]/40 transition-colors">
                  <td className="px-5 py-3 text-xs text-[var(--text-muted)]">{fmtDate(c.createdAt)}</td>
                  <td className="px-5 py-3 text-xs text-[var(--text-primary)]">{sourceLabel(c.sourceType)}</td>
                  <td className="px-5 py-3 text-xs text-[var(--text-primary)] font-medium">
                    {fmtUsd(c.cashAmountUsd)}{c.creditsAmount > 0 && <span className="text-[var(--text-muted)]"> + {fmtCredits(c.creditsAmount)} cr</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={c.status} />
                      {c.status === 'PENDING' && (
                        <span className="text-[10px] text-[var(--text-muted)]">until {fmtDate(c.payableAt)}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>

        {/* Payouts Table */}
        <TableShell
          title="Payouts"
          empty="No payouts yet."
          isEmpty={payouts.length === 0}
          loading={payLoading && payouts.length === 0}
          onLoadMore={payCursor ? () => loadPayouts(payCursor) : undefined}
          hasMore={!!payCursor}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-default)]">
                <th className="text-left font-semibold px-5 py-3">Date</th>
                <th className="text-left font-semibold px-5 py-3">Cash</th>
                <th className="text-left font-semibold px-5 py-3">Credits</th>
                <th className="text-left font-semibold px-5 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-[var(--border-default)]/60 last:border-0 hover:bg-[var(--bg-card)]/40 transition-colors">
                  <td className="px-5 py-3 text-xs text-[var(--text-muted)]">{fmtDate(p.processedAt)}</td>
                  <td className="px-5 py-3 text-xs text-[var(--text-primary)]">
                    {p.cashAmountUsd > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fmtUsd(p.cashAmountUsd)} {p.cashCurrency ?? ''}</span>
                        {p.cashTxHash && (
                          <a
                            href={`https://solscan.io/tx/${p.cashTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-[var(--color-accent)] hover:underline inline-flex items-center gap-0.5"
                          >
                            tx <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    ) : <span className="text-[var(--text-muted)]">—</span>}
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--text-primary)]">
                    {p.creditsAmount > 0 ? `${fmtCredits(p.creditsAmount)} cr` : <span className="text-[var(--text-muted)]">—</span>}
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--text-muted)]">{p.adminNote || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>

        {/* Settings Panel */}
        {aff && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border p-5 sm:p-6"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={16} className="text-[var(--text-muted)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Payout Settings</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Mode</p>
                <p className="text-sm text-[var(--text-primary)]">{payoutModeLabel(aff.payoutMode)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Payout Address</p>
                <p className="text-xs font-mono text-[var(--text-primary)] break-all">
                  {aff.payoutAddress ?? <span className="text-[var(--text-muted)]">Credits only — no address</span>}
                </p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-4">
              Need to change payout preferences? <Link href="/support" className="text-[var(--color-accent)] hover:underline">Contact support</Link>.
            </p>
          </motion.div>
        )}
      </div>
    </main>
  );
}
