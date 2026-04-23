// ============================================================
// Admin Affiliate Tab — Phase V
// ============================================================
// Hosts three sub-views (Applications / Affiliates / Payouts).
// Each sub-view is a self-contained table + slide-over detail +
// action modal. Kept in one file because the three share types,
// labels, and formatters; splitting would fragment without help.
//
// Sub-tab state is URL-bound via `?sub=<key>` on the parent
// admin tab so refresh doesn't reset mid-investigation.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { UserCheck, Users, DollarSign, Check, X, Snowflake, Sun, AlertTriangle, ExternalLink, RefreshCw, ChevronRight, Copy } from 'lucide-react';

type SubView = 'applications' | 'affiliates' | 'payouts';
type AppStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

// Concrete local types — duplicates the shape from lib/api/methods.ts.
// We can't infer them cleanly via `typeof api.adminX` because the
// return is a discriminated union and TS narrows to `never` on
// naive conditional extraction. Re-declaring keeps the component
// self-contained and easy to read.

type PlatformType = 'x' | 'youtube' | 'telegram' | 'discord' | 'other';

type ApplicationPlatform = {
  type: PlatformType;
  handle: string;
  audienceSize: number | null;
  url: string | null;
};

type ApplicationRow = {
  id: string;
  userId: string;
  userEmail: string;
  username: string;
  platforms: ApplicationPlatform[];
  payoutMode: 'CASH_ONLY' | 'CREDITS_ONLY' | 'HYBRID';
  pitch: string;
  desiredSlug: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
};

type ApplicationDetail = {
  application: {
    id: string;
    userId: string;
    platforms: ApplicationPlatform[];
    pitch: string;
    payoutMode: 'CASH_ONLY' | 'CREDITS_ONLY' | 'HYBRID';
    payoutAddress: string | null;
    desiredSlug: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewedBy: string | null;
    reviewedAt: string | null;
    reviewNotes: string | null;
    createdAt: string;
    user: {
      id: string;
      email: string;
      username: string;
      tier: string;
      createdAt: string;
      emailVerified: boolean;
      walletAddress: string | null;
    };
  };
  existingAffiliate: {
    id: string;
    referralCode: string;
    payoutMode: string;
    isActive: boolean;
    isFrozen: boolean;
    totalReferrals: number;
    createdAt: string;
  } | null;
  priorApplications: Array<{
    id: string;
    status: string;
    createdAt: string;
    reviewedAt: string | null;
    reviewNotes: string | null;
  }>;
};

type AffiliateRow = {
  id: string;
  referralCode: string;
  userId: string;
  userEmail: string;
  userUsername: string;
  payoutMode: 'CASH_ONLY' | 'CREDITS_ONLY' | 'HYBRID';
  isActive: boolean;
  isFrozen: boolean;
  frozenReason: string | null;
  totalReferrals: number;
  totalPaidRefs: number;
  lifetimeEarnedCashUsd: number;
  lifetimeEarnedCredits: number;
  payableCashUsd: number;
  payableCredits: number;
  createdAt: string;
};

type PendingRow = {
  affiliateId: string;
  referralCode: string;
  userEmail: string;
  payoutMode: 'CASH_ONLY' | 'CREDITS_ONLY' | 'HYBRID';
  payoutAddress: string | null;
  isFrozen: boolean;
  payableCashUsd: number;
  payableCredits: number;
  commissionCount: number;
  oldestPayableAt: string | null;
};

type AffiliateDetail = {
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
    user: {
      id: string;
      email: string;
      username: string;
      tier: string;
      createdAt: string;
      emailVerified: boolean;
      walletAddress: string | null;
    };
  };
  referrals: Array<{
    id: string;
    referredAt: string;
    referredEmail: string;
    referredTier: string | null;
    isFlagged: boolean;
    flagReason: string | null;
  }>;
  commissions: Array<{
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
  }>;
  payouts: Array<{
    id: string;
    processedAt: string;
    processedBy: string;
    cashAmountUsd: number;
    cashTxHash: string | null;
    cashCurrency: string | null;
    creditsAmount: number;
    creditsAppliedAt: string | null;
    adminNote: string;
    commissionCount: number;
  }>;
  stats: {
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
};

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function timeAgo(d: string | Date): string {
  const t = typeof d === 'string' ? new Date(d).getTime() : d.getTime();
  const diff = Date.now() - t;
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  const mins = Math.floor(diff / 60000);
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

export default function AffiliateTab() {
  // ── Sub-view selector with URL-param persistence ────────────
  const [sub, setSub] = useState<SubView>(() => {
    if (typeof window === 'undefined') return 'applications';
    const params = new URLSearchParams(window.location.search);
    const s = params.get('sub');
    if (s === 'affiliates' || s === 'payouts' || s === 'applications') return s;
    return 'applications';
  });

  const changeSub = useCallback((next: SubView) => {
    setSub(next);
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'affiliate');
    params.set('sub', next);
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', url);
  }, []);

  return (
    <div className="space-y-4">
      {/* Inner tab switcher */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[rgba(46,43,74,0.3)] w-fit">
        {([
          { key: 'applications' as const, label: 'Applications', Icon: UserCheck },
          { key: 'affiliates' as const, label: 'Affiliates', Icon: Users },
          { key: 'payouts' as const, label: 'Payouts', Icon: DollarSign },
        ]).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => changeSub(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              sub === key
                ? 'text-[var(--text-primary)] bg-[var(--color-accent)]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {sub === 'applications' && <ApplicationsView />}
      {sub === 'affiliates' && <AffiliatesView />}
      {sub === 'payouts' && <PayoutsView />}
    </div>
  );
}

// ============================================================
// Applications sub-view
// ============================================================

function ApplicationsView() {
  const [status, setStatus] = useState<AppStatus>('PENDING');
  const [rows, setRows] = useState<ApplicationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApplicationRow | null>(null);
  const [expandPitch, setExpandPitch] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.adminListAffiliateApplications({
      status: status === 'ALL' ? undefined : status,
      limit: 50,
    });
    setLoading(false);
    if (res.success) setRows(res.data.applications as ApplicationRow[]);
    else {
      setError(res.error);
      setRows([]);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              status === s
                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {s}
          </button>
        ))}
        <button onClick={load} disabled={loading} className="btn-secondary text-xs px-3 py-1.5 ml-auto flex items-center gap-1.5">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
        {rows == null ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState message="No applications match this filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-primary)]/40 bg-[var(--bg-tertiary)]/30">
                  <th className="text-left font-semibold py-2.5 px-3">Submitted</th>
                  <th className="text-left font-semibold py-2.5 px-3">User</th>
                  <th className="text-left font-semibold py-2.5 px-3">Platform</th>
                  <th className="text-left font-semibold py-2.5 px-3">Audience</th>
                  <th className="text-left font-semibold py-2.5 px-3">Payout</th>
                  <th className="text-left font-semibold py-2.5 px-3">Status</th>
                  <th className="text-left font-semibold py-2.5 px-3">Pitch</th>
                  <th className="py-2.5 px-3 w-0"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  // First platform gets the table cell; extra ones show as
                  // a +N badge with a tooltip listing them all. `|| null`
                  // is defensive — backend should always return at least 1.
                  const first = r.platforms[0];
                  const extra = r.platforms.length - 1;
                  const totalAudience = r.platforms.reduce(
                    (s, p) => s + (p.audienceSize ?? 0),
                    0,
                  );
                  const tooltip = r.platforms
                    .map((p) => `${p.type} · ${p.handle}`)
                    .join('\n');
                  return (
                  <tr key={r.id} className="border-b border-[var(--border-primary)]/20 hover:bg-[var(--bg-card)]/40">
                    <td className="py-2 px-3 text-[var(--text-muted)] whitespace-nowrap">{timeAgo(r.createdAt)}</td>
                    <td className="py-2 px-3 text-[var(--text-primary)]">{r.userEmail}</td>
                    <td className="py-2 px-3 text-[var(--text-primary)]" title={tooltip}>
                      {first ? (
                        <>
                          <span className="font-mono text-[var(--color-accent)]">{first.type}</span>
                          {' · '}
                          {first.handle}
                        </>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                      {extra > 0 && (
                        <span
                          className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[10px] font-medium"
                          title={tooltip}
                        >
                          +{extra}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-[var(--text-muted)]">
                      {totalAudience > 0 ? totalAudience.toLocaleString() : '—'}
                    </td>
                    <td className="py-2 px-3 text-[var(--text-muted)]">{r.payoutMode}</td>
                    <td className="py-2 px-3"><StatusPill status={r.status} /></td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => setExpandPitch(expandPitch === r.id ? null : r.id)}
                        className="text-left text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        <span className={expandPitch === r.id ? 'whitespace-pre-wrap' : 'truncate block max-w-xs'}>
                          {r.pitch}
                        </span>
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => setSelected(r)}
                        className="text-[var(--color-accent)] hover:underline text-xs flex items-center gap-1"
                      >
                        Review <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <ApplicationPanel
          id={selected.id}
          onClose={() => setSelected(null)}
          onActionComplete={() => {
            setSelected(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function ApplicationPanel({ id, onClose, onActionComplete }: { id: string; onClose: () => void; onActionComplete: () => void }) {
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectNotes, setRejectNotes] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [overrideSlug, setOverrideSlug] = useState('');
  const [mode, setMode] = useState<'view' | 'approve' | 'reject'>('view');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await api.adminGetAffiliateApplication(id);
      if (cancelled) return;
      setLoading(false);
      if (res.success) setDetail(res.data as NonNullable<typeof detail>);
      else setError(res.error);
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function handleApprove() {
    setSubmitting(true);
    const slugInput = overrideSlug.trim().toLowerCase();
    const res = await api.adminApproveAffiliateApplication(id, {
      notes: approveNotes.trim() || undefined,
      overrideSlug: slugInput || undefined,
    });
    setSubmitting(false);
    if (res.success) {
      setToast(`Approved — code: ${res.data.affiliate.referralCode}`);
      setTimeout(onActionComplete, 900);
    } else setError(res.error);
  }

  async function handleReject() {
    if (rejectNotes.trim().length < 10) {
      setError('Rejection notes must be at least 10 characters');
      return;
    }
    setSubmitting(true);
    const res = await api.adminRejectAffiliateApplication(id, rejectNotes.trim());
    setSubmitting(false);
    if (res.success) {
      setToast('Rejected');
      setTimeout(onActionComplete, 700);
    } else setError(res.error);
  }

  return (
    <SlideOver title="Affiliate application" onClose={onClose}>
      {loading && <div className="text-center py-8 text-[var(--text-muted)] text-sm">Loading…</div>}

      {error && <ErrorBanner message={error} />}

      {detail && !loading && (
        <div className="space-y-5">
          <section>
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">User</h3>
            <div className="text-sm text-[var(--text-primary)]">{detail.application.user.email}</div>
            <div className="text-xs text-[var(--text-muted)]">
              {detail.application.user.username} · tier: {detail.application.user.tier} · joined {new Date(detail.application.user.createdAt).toLocaleDateString()}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Platforms ({detail.application.platforms.length})
            </h3>
            <ul className="space-y-1.5">
              {detail.application.platforms.map((p, i) => (
                <li
                  key={i}
                  className="text-xs p-2 rounded bg-[var(--bg-card)] border border-[var(--border-primary)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--text-primary)]">
                      <span className="font-mono text-[var(--color-accent)] uppercase">{p.type}</span>
                      {' · '}
                      {p.handle}
                    </span>
                    {/* `!= null` (loose) so undefined also skips — older
                        applications stored in JSONB sometimes omit the
                        field entirely instead of setting it to null. */}
                    {p.audienceSize != null && (
                      <span className="text-[var(--text-muted)]">
                        {p.audienceSize.toLocaleString()} followers
                      </span>
                    )}
                  </div>
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 text-[var(--color-accent)] hover:underline flex items-center gap-1 break-all text-[10px]"
                    >
                      {p.url} <ExternalLink size={10} />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="grid grid-cols-2 gap-2 text-xs">
            <DataCell label="Payout mode" value={detail.application.payoutMode} />
            <DataCell
              label="Payout address"
              value={detail.application.payoutAddress ? `${detail.application.payoutAddress.slice(0, 8)}…${detail.application.payoutAddress.slice(-6)}` : '—'}
            />
          </section>

          {detail.application.desiredSlug && (
            <section className="p-3 rounded-lg bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20">
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
                User requested slug
              </div>
              <div className="text-sm text-[var(--text-primary)] font-mono">
                {detail.application.desiredSlug}
                <span className="ml-2 text-xs text-[var(--text-muted)]">
                  → hatcher.host/r/{detail.application.desiredSlug}
                </span>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Pitch</h3>
            <div className="text-sm text-[var(--text-primary)] bg-[var(--bg-card)] rounded-lg p-3 whitespace-pre-wrap border border-[var(--border-primary)]">
              {detail.application.pitch}
            </div>
          </section>

          {detail.existingAffiliate && (
            <section className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="text-xs text-amber-400 font-semibold mb-1">User is already an affiliate</div>
              <div className="text-xs text-[var(--text-muted)]">
                Code: <code className="font-mono text-[var(--text-primary)]">{detail.existingAffiliate.referralCode}</code> · {detail.existingAffiliate.isActive ? 'active' : 'inactive'}
                {detail.existingAffiliate.isFrozen && ' · frozen'}
              </div>
            </section>
          )}

          {detail.priorApplications.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Prior applications</h3>
              <div className="space-y-1.5">
                {detail.priorApplications.map((p) => (
                  <div key={p.id} className="text-xs p-2 rounded bg-[var(--bg-card)] border border-[var(--border-primary)]">
                    <StatusPill status={p.status as 'PENDING' | 'APPROVED' | 'REJECTED'} /> · {timeAgo(p.createdAt)}
                    {p.reviewNotes && <div className="mt-1 text-[var(--text-muted)]">{p.reviewNotes}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {detail.application.status === 'PENDING' && (
            <section className="space-y-2 pt-4 border-t border-[var(--border-primary)]">
              {mode === 'view' && (
                <div className="flex gap-2">
                  <button onClick={() => setMode('approve')} className="flex-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center gap-1.5">
                    <Check size={14} /> Approve
                  </button>
                  <button onClick={() => setMode('reject')} className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center gap-1.5">
                    <X size={14} /> Reject
                  </button>
                </div>
              )}

              {mode === 'approve' && (
                <div className="space-y-2">
                  <label className="text-xs text-[var(--text-muted)]">Override slug (optional)</label>
                  <div className="flex items-stretch rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] focus-within:border-[var(--color-accent)] transition-colors">
                    <span className="inline-flex items-center px-2.5 text-[11px] font-mono text-[var(--text-muted)] border-r border-[var(--border-primary)] select-none">
                      hatcher.host/r/
                    </span>
                    <input
                      type="text"
                      value={overrideSlug}
                      onChange={(e) =>
                        setOverrideSlug(e.target.value.replace(/\s+/g, ''))
                      }
                      onBlur={() => setOverrideSlug((s) => s.trim().toLowerCase())}
                      className="flex-1 bg-transparent px-2.5 py-2 text-sm text-[var(--text-primary)] font-mono focus:outline-none placeholder:text-[var(--text-muted)]"
                      placeholder="Leave blank to use user's desired or auto-generate"
                      maxLength={30}
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                    />
                  </div>
                  {detail.application.desiredSlug && !overrideSlug.trim() && (
                    <div className="text-[10px] text-[var(--text-muted)]">
                      Will attempt user&apos;s requested slug:{' '}
                      <code className="font-mono text-[var(--text-primary)]">
                        {detail.application.desiredSlug}
                      </code>
                    </div>
                  )}

                  <label className="text-xs text-[var(--text-muted)] mt-2 block">Internal notes (optional)</label>
                  <textarea
                    value={approveNotes}
                    onChange={(e) => setApproveNotes(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)]"
                    placeholder="e.g. Solid YouTube channel, 12k subs…"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleApprove} disabled={submitting} className="flex-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-lg px-4 py-2 text-sm font-medium">
                      {submitting ? 'Approving…' : 'Confirm approve'}
                    </button>
                    <button onClick={() => setMode('view')} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                  </div>
                </div>
              )}

              {mode === 'reject' && (
                <div className="space-y-2">
                  <label className="text-xs text-[var(--text-muted)]">Rejection notes (visible to applicant, min 10 chars)</label>
                  <textarea
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)]"
                    placeholder="e.g. Audience too small. Reapply once you have 5k+ followers."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={submitting || rejectNotes.trim().length < 10}
                      className="flex-1 bg-red-500/20 border border-red-500/40 text-red-300 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40"
                    >
                      {submitting ? 'Rejecting…' : 'Confirm reject'}
                    </button>
                    <button onClick={() => setMode('view')} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </section>
          )}

          {toast && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">{toast}</div>
          )}
        </div>
      )}
    </SlideOver>
  );
}

// ============================================================
// Affiliates sub-view
// ============================================================

function AffiliatesView() {
  const [status, setStatus] = useState<'active' | 'frozen' | 'all'>('active');
  const [rows, setRows] = useState<AffiliateRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await api.adminListAffiliates({ status, limit: 50 });
    if (res.success) setRows(res.data.affiliates as AffiliateRow[]);
    else {
      setError(res.error);
      setRows([]);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {(['active', 'frozen', 'all'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
              status === s
                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {s}
          </button>
        ))}
        <button onClick={load} className="btn-secondary text-xs px-3 py-1.5 ml-auto flex items-center gap-1.5">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
        {rows == null ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState message="No affiliates match this filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-primary)]/40 bg-[var(--bg-tertiary)]/30">
                  <th className="text-left font-semibold py-2.5 px-3">Code</th>
                  <th className="text-left font-semibold py-2.5 px-3">User</th>
                  <th className="text-left font-semibold py-2.5 px-3">Status</th>
                  <th className="text-right font-semibold py-2.5 px-3">Referrals</th>
                  <th className="text-right font-semibold py-2.5 px-3">Paid refs</th>
                  <th className="text-right font-semibold py-2.5 px-3">Payable</th>
                  <th className="text-right font-semibold py-2.5 px-3">Lifetime</th>
                  <th className="text-left font-semibold py-2.5 px-3">Joined</th>
                  <th className="py-2.5 px-3 w-0"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--border-primary)]/20 hover:bg-[var(--bg-card)]/40">
                    <td className="py-2 px-3">
                      <code className="font-mono text-[var(--color-accent)]">{a.referralCode}</code>
                    </td>
                    <td className="py-2 px-3 text-[var(--text-primary)]">{a.userEmail}</td>
                    <td className="py-2 px-3">
                      {a.isFrozen ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">frozen</span>
                      ) : a.isActive ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">active</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--text-muted)]/10 text-[var(--text-muted)]">inactive</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--text-primary)]">{a.totalReferrals}</td>
                    <td className="py-2 px-3 text-right text-[var(--text-primary)]">{a.totalPaidRefs}</td>
                    <td className="py-2 px-3 text-right text-[var(--text-primary)]">
                      {formatUsd(a.payableCashUsd + a.payableCredits)}
                      {(a.payableCashUsd > 0 || a.payableCredits > 0) && (
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {formatUsd(a.payableCashUsd)}$ · {formatUsd(a.payableCredits)}c
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--text-muted)]">{formatUsd(a.lifetimeEarnedCashUsd + a.lifetimeEarnedCredits)}</td>
                    <td className="py-2 px-3 text-[var(--text-muted)] whitespace-nowrap">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => setSelectedId(a.id)}
                        className="text-[var(--color-accent)] hover:underline text-xs flex items-center gap-1"
                      >
                        Open <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <AffiliateDetailPanel
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdate={() => {
            void load();
          }}
        />
      )}
    </div>
  );
}

function AffiliateDetailPanel({ id, onClose, onUpdate }: { id: string; onClose: () => void; onUpdate: () => void }) {
  const [detail, setDetail] = useState<AffiliateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [freezeMode, setFreezeMode] = useState(false);
  const [freezeReason, setFreezeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.adminGetAffiliate(id);
    setLoading(false);
    if (res.success) setDetail(res.data as AffiliateDetail);
    else setError(res.error);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleFreeze() {
    if (freezeReason.trim().length < 5) {
      setError('Reason must be at least 5 characters');
      return;
    }
    setSubmitting(true);
    const res = await api.adminFreezeAffiliate(id, freezeReason.trim());
    setSubmitting(false);
    if (res.success) {
      setFreezeMode(false);
      setFreezeReason('');
      await load();
      onUpdate();
    } else setError(res.error);
  }

  async function handleUnfreeze() {
    setSubmitting(true);
    const res = await api.adminUnfreezeAffiliate(id);
    setSubmitting(false);
    if (res.success) {
      await load();
      onUpdate();
    } else setError(res.error);
  }

  return (
    <SlideOver title="Affiliate" onClose={onClose}>
      {loading && <div className="text-center py-8 text-[var(--text-muted)] text-sm">Loading…</div>}
      {error && <ErrorBanner message={error} />}

      {detail && !loading && (
        <div className="space-y-5">
          <section>
            <div className="flex items-center gap-2 mb-2">
              <code className="font-mono text-[var(--color-accent)] text-base">{detail.affiliate.referralCode}</code>
              {detail.affiliate.isFrozen ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">frozen</span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">active</span>
              )}
            </div>
            <div className="text-sm text-[var(--text-primary)]">{detail.affiliate.user.email}</div>
            <div className="text-xs text-[var(--text-muted)]">
              {detail.affiliate.user.username} · tier: {detail.affiliate.user.tier} · joined {new Date(detail.affiliate.user.createdAt).toLocaleDateString()}
            </div>
            {detail.affiliate.frozenReason && (
              <div className="mt-2 text-xs text-red-400 p-2 rounded bg-red-500/5 border border-red-500/20">
                <AlertTriangle size={12} className="inline mr-1" />
                {detail.affiliate.frozenReason}
              </div>
            )}
          </section>

          <section className="grid grid-cols-2 gap-2 text-xs">
            <DataCell label="Referrals" value={String(detail.stats.totalReferrals)} />
            <DataCell label="Paid referrals" value={String(detail.stats.paidReferrals)} />
            <DataCell label="Payable" value={`${formatUsd(detail.stats.payable.cashUsd)}$ · ${formatUsd(detail.stats.payable.credits)}c`} />
            <DataCell label="Lifetime earned" value={`${formatUsd(detail.stats.lifetime.cashUsdEarned)}$ · ${formatUsd(detail.stats.lifetime.creditsEarned)}c`} />
            <DataCell label="Paid out" value={`${formatUsd(detail.stats.lifetime.cashUsdPaidOut)}$ · ${formatUsd(detail.stats.lifetime.creditsPaidOut)}c`} />
            <DataCell label="Payout mode" value={detail.affiliate.payoutMode} />
          </section>

          {/* Freeze / Unfreeze */}
          <section className="pt-4 border-t border-[var(--border-primary)]">
            {!freezeMode && !detail.affiliate.isFrozen && (
              <button
                onClick={() => setFreezeMode(true)}
                className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg px-4 py-2 text-sm font-medium"
              >
                <Snowflake size={14} /> Freeze affiliate
              </button>
            )}
            {!freezeMode && detail.affiliate.isFrozen && (
              <button
                onClick={handleUnfreeze}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-lg px-4 py-2 text-sm font-medium"
              >
                <Sun size={14} /> {submitting ? 'Unfreezing…' : 'Unfreeze affiliate'}
              </button>
            )}
            {freezeMode && (
              <div className="space-y-2">
                <label className="text-xs text-[var(--text-muted)]">Reason (min 5 chars, shown to affiliate)</label>
                <textarea
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)]"
                  placeholder="Suspicious referral pattern"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleFreeze}
                    disabled={submitting || freezeReason.trim().length < 5}
                    className="flex-1 bg-red-500/20 border border-red-500/40 text-red-300 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40"
                  >
                    {submitting ? 'Freezing…' : 'Confirm freeze'}
                  </button>
                  <button onClick={() => setFreezeMode(false)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                </div>
              </div>
            )}
          </section>

          {/* Referrals */}
          <section>
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Referrals ({detail.referrals.length})</h3>
            {detail.referrals.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)]">No referrals yet.</div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {detail.referrals.map((r) => (
                  <div
                    key={r.id}
                    className={`text-xs p-2 rounded border ${
                      r.isFlagged ? 'bg-amber-500/5 border-amber-500/30' : 'bg-[var(--bg-card)] border-[var(--border-primary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-primary)]">{r.referredEmail}</span>
                      <span className="text-[var(--text-muted)]">{timeAgo(r.referredAt)}</span>
                    </div>
                    {r.referredTier && <div className="text-[10px] text-[var(--text-muted)]">tier: {r.referredTier}</div>}
                    {r.isFlagged && (
                      <div className="text-[10px] text-amber-400 mt-1">
                        <AlertTriangle size={10} className="inline mr-0.5" /> {r.flagReason ?? 'flagged'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Commissions */}
          <section>
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Commissions ({detail.commissions.length})</h3>
            {detail.commissions.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)]">No commissions yet.</div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {detail.commissions.map((c) => (
                  <div key={c.id} className="text-xs p-2 rounded bg-[var(--bg-card)] border border-[var(--border-primary)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-primary)]">{formatUsd(c.cashAmountUsd)}$ · {formatUsd(c.creditsAmount)}c</span>
                      <StatusPill status={c.status} />
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {c.sourceType} · {timeAgo(c.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Payouts */}
          <section>
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Payouts ({detail.payouts.length})</h3>
            {detail.payouts.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)]">No payouts yet.</div>
            ) : (
              <div className="space-y-1">
                {detail.payouts.map((p) => (
                  <div key={p.id} className="text-xs p-2 rounded bg-[var(--bg-card)] border border-[var(--border-primary)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-primary)]">
                        {formatUsd(p.cashAmountUsd)}$ · {formatUsd(p.creditsAmount)}c
                      </span>
                      <span className="text-[var(--text-muted)]">{timeAgo(p.processedAt)}</span>
                    </div>
                    {p.cashTxHash && (
                      <div className="text-[10px] text-[var(--text-muted)] font-mono break-all mt-0.5">
                        {p.cashCurrency} · {p.cashTxHash}
                      </div>
                    )}
                    {p.adminNote && <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{p.adminNote}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </SlideOver>
  );
}

// ============================================================
// Payouts sub-view
// ============================================================

function PayoutsView() {
  const [tab, setTab] = useState<'pending' | 'history'>('pending');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[rgba(46,43,74,0.3)] w-fit">
        {(['pending', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${
              tab === t
                ? 'text-[var(--text-primary)] bg-[var(--color-accent)]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'pending' && <PayoutsPending />}
      {tab === 'history' && <PayoutsHistory />}
    </div>
  );
}

function PayoutsPending() {
  const [rows, setRows] = useState<PendingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<PendingRow | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await api.adminListPendingPayouts();
    if (res.success) setRows(res.data.pending as PendingRow[]);
    else {
      setError(res.error);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-[var(--text-muted)]">
          {rows ? `${rows.length} affiliate${rows.length === 1 ? '' : 's'} with payable balance` : 'Loading…'}
        </div>
        <button onClick={load} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
        {rows == null ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState message="No pending payouts." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-primary)]/40 bg-[var(--bg-tertiary)]/30">
                  <th className="text-left font-semibold py-2.5 px-3">Code</th>
                  <th className="text-left font-semibold py-2.5 px-3">User</th>
                  <th className="text-left font-semibold py-2.5 px-3">Mode</th>
                  <th className="text-right font-semibold py-2.5 px-3">Cash</th>
                  <th className="text-right font-semibold py-2.5 px-3">Credits</th>
                  <th className="text-right font-semibold py-2.5 px-3">#</th>
                  <th className="text-left font-semibold py-2.5 px-3">Oldest</th>
                  <th className="py-2.5 px-3 w-0"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.affiliateId} className="border-b border-[var(--border-primary)]/20 hover:bg-[var(--bg-card)]/40">
                    <td className="py-2 px-3"><code className="font-mono text-[var(--color-accent)]">{r.referralCode}</code></td>
                    <td className="py-2 px-3 text-[var(--text-primary)]">{r.userEmail}</td>
                    <td className="py-2 px-3 text-[var(--text-muted)]">{r.payoutMode}</td>
                    <td className="py-2 px-3 text-right text-[var(--text-primary)]">{formatUsd(r.payableCashUsd)}</td>
                    <td className="py-2 px-3 text-right text-[var(--text-primary)]">{formatUsd(r.payableCredits)}</td>
                    <td className="py-2 px-3 text-right text-[var(--text-muted)]">{r.commissionCount}</td>
                    <td className="py-2 px-3 text-[var(--text-muted)]">{r.oldestPayableAt ? timeAgo(r.oldestPayableAt) : '—'}</td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => setProcessing(r)}
                        disabled={r.isFrozen}
                        className="text-[var(--color-accent)] hover:underline disabled:opacity-30 text-xs flex items-center gap-1"
                        title={r.isFrozen ? 'Affiliate is frozen' : 'Process payout'}
                      >
                        Pay <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {processing && (
        <PayoutModal
          row={processing}
          onClose={() => setProcessing(null)}
          onDone={() => {
            setProcessing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function PayoutModal({ row, onClose, onDone }: { row: PendingRow; onClose: () => void; onDone: () => void }) {
  const [detail, setDetail] = useState<AffiliateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  // Commissions eligible for this payout: status PAYABLE, not already
  // attached to a payout. We default all to checked.
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [txHash, setTxHash] = useState('');
  const [currency, setCurrency] = useState<'SOL' | 'USDC' | 'HATCHER'>('USDC');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await api.adminGetAffiliate(row.affiliateId);
      if (cancelled) return;
      setLoading(false);
      if (res.success) {
        const d = res.data as AffiliateDetail;
        setDetail(d);
        const eligible = d.commissions.filter((c) => c.status === 'PAYABLE' && !c.payoutId);
        setChecked(new Set(eligible.map((c) => c.id)));
      } else {
        setError(res.error);
      }
    })();
    return () => { cancelled = true; };
  }, [row.affiliateId]);

  const eligible = useMemo(
    () => detail?.commissions.filter((c) => c.status === 'PAYABLE' && !c.payoutId) ?? [],
    [detail],
  );
  const selected = useMemo(() => eligible.filter((c) => checked.has(c.id)), [eligible, checked]);
  const totalCash = selected.reduce((s, c) => s + c.cashAmountUsd, 0);
  const totalCredits = selected.reduce((s, c) => s + c.creditsAmount, 0);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    setError(null);
    if (selected.length === 0) {
      setError('Select at least one commission');
      return;
    }
    if (totalCash > 0 && !txHash.trim()) {
      setError('Transaction hash required for cash payouts');
      return;
    }
    setSubmitting(true);
    const res = await api.adminProcessAffiliatePayout(row.affiliateId, {
      commissionIds: selected.map((c) => c.id),
      cashTxHash: totalCash > 0 ? txHash.trim() : undefined,
      cashCurrency: totalCash > 0 ? currency : undefined,
      adminNote: note.trim() || undefined,
    });
    setSubmitting(false);
    if (res.success) {
      onDone();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal onClose={onClose} title={`Pay ${row.referralCode}`}>
      {loading && <div className="text-center py-8 text-[var(--text-muted)] text-sm">Loading…</div>}
      {error && <ErrorBanner message={error} />}

      {detail && !loading && (
        <div className="space-y-4">
          <div className="text-xs text-[var(--text-muted)]">
            {row.userEmail} · mode: <code className="font-mono text-[var(--text-primary)]">{row.payoutMode}</code>
            {detail.affiliate.payoutAddress && (
              <> · <button
                onClick={() => navigator.clipboard.writeText(detail.affiliate.payoutAddress ?? '')}
                className="font-mono hover:text-[var(--color-accent)] inline-flex items-center gap-1"
                title="Copy address"
              >
                {detail.affiliate.payoutAddress.slice(0, 8)}…{detail.affiliate.payoutAddress.slice(-6)} <Copy size={10} />
              </button></>
            )}
          </div>

          <section>
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Eligible commissions ({eligible.length})</div>
            {eligible.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)] p-3 rounded bg-[var(--bg-card)]">No payable commissions.</div>
            ) : (
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1 border border-[var(--border-primary)] rounded-lg">
                {eligible.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-[var(--bg-card)]/60 cursor-pointer border-b border-[var(--border-primary)]/30 last:border-b-0">
                    <input
                      type="checkbox"
                      checked={checked.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="accent-[var(--color-accent)]"
                    />
                    <div className="flex-1 text-xs">
                      <div className="text-[var(--text-primary)]">
                        {formatUsd(c.cashAmountUsd)}$ · {formatUsd(c.creditsAmount)}c
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {c.sourceType} · {timeAgo(c.createdAt)}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)]">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[var(--text-muted)]">Cash</div>
                <div className="text-[var(--text-primary)] font-semibold text-base">{formatUsd(totalCash)}</div>
              </div>
              <div>
                <div className="text-[var(--text-muted)]">Credits</div>
                <div className="text-[var(--text-primary)] font-semibold text-base">{formatUsd(totalCredits)}</div>
              </div>
            </div>
          </section>

          {totalCash > 0 && (
            <section className="space-y-2">
              <div>
                <label className="text-xs text-[var(--text-muted)]">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as typeof currency)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)]"
                >
                  <option value="USDC">USDC</option>
                  <option value="SOL">SOL</option>
                  <option value="HATCHER">HATCHER</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)]">Transaction hash</label>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)] font-mono"
                  placeholder="5xK…"
                />
              </div>
            </section>
          )}

          <div>
            <label className="text-xs text-[var(--text-muted)]">Admin note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={2000}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)]"
              placeholder="April batch"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || selected.length === 0 || (totalCash > 0 && !txHash.trim())}
              className="flex-1 bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/40 text-[var(--color-accent)] rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              {submitting ? 'Processing…' : `Process payout — ${formatUsd(totalCash + totalCredits)}`}
            </button>
            <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

type HistoryRow = {
  payoutId: string;
  processedAt: string;
  affiliateCode: string;
  cashAmountUsd: number;
  creditsAmount: number;
  cashTxHash: string | null;
  cashCurrency: string | null;
  adminNote: string;
};

function PayoutsHistory() {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    (async () => {
      // No dedicated "all payouts" admin endpoint — pull via the
      // affiliates list and drill into each. Limit to first 50
      // affiliates to keep this page cheap; typical ops flow is
      // drill-in from the Affiliates tab for deeper history.
      const listRes = await api.adminListAffiliates({ status: 'all', limit: 50 });
      if (!listRes.success) {
        setError(listRes.error);
        setRows([]);
        return;
      }
      const affs = listRes.data.affiliates;
      const results: HistoryRow[] = [];
      // Fetch detail pages sequentially — admin panel, low request
      // count. Parallelizing 50 detail fetches risks rate-limiting
      // and gives no material UX win.
      for (const a of affs) {
        const dRes = await api.adminGetAffiliate(a.id);
        if (!dRes.success) continue;
        for (const p of dRes.data.payouts) {
          results.push({
            payoutId: p.id,
            processedAt: p.processedAt,
            affiliateCode: dRes.data.affiliate.referralCode,
            cashAmountUsd: p.cashAmountUsd,
            creditsAmount: p.creditsAmount,
            cashTxHash: p.cashTxHash,
            cashCurrency: p.cashCurrency,
            adminNote: p.adminNote,
          });
        }
      }
      results.sort((x, y) => new Date(y.processedAt).getTime() - new Date(x.processedAt).getTime());
      setRows(results.slice(0, 100));
    })();
  }, []);

  return (
    <div className="space-y-3">
      {error && <ErrorBanner message={error} />}
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
        {rows == null ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState message="No payouts recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-primary)]/40 bg-[var(--bg-tertiary)]/30">
                  <th className="text-left font-semibold py-2.5 px-3">Date</th>
                  <th className="text-left font-semibold py-2.5 px-3">Affiliate</th>
                  <th className="text-right font-semibold py-2.5 px-3">Cash</th>
                  <th className="text-right font-semibold py-2.5 px-3">Credits</th>
                  <th className="text-left font-semibold py-2.5 px-3">Tx</th>
                  <th className="text-left font-semibold py-2.5 px-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.payoutId} className="border-b border-[var(--border-primary)]/20 hover:bg-[var(--bg-card)]/40">
                    <td className="py-2 px-3 text-[var(--text-muted)] whitespace-nowrap">{new Date(r.processedAt).toLocaleString()}</td>
                    <td className="py-2 px-3"><code className="font-mono text-[var(--color-accent)]">{r.affiliateCode}</code></td>
                    <td className="py-2 px-3 text-right text-[var(--text-primary)]">{formatUsd(r.cashAmountUsd)}</td>
                    <td className="py-2 px-3 text-right text-[var(--text-primary)]">{formatUsd(r.creditsAmount)}</td>
                    <td className="py-2 px-3 text-[var(--text-muted)] font-mono text-[10px]">
                      {r.cashTxHash ? `${r.cashCurrency} · ${r.cashTxHash.slice(0, 10)}…` : '—'}
                    </td>
                    <td className="py-2 px-3 text-[var(--text-muted)]">{r.adminNote || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="text-[10px] text-[var(--text-muted)] text-center">
        History aggregated across first 50 affiliates, capped at 100 rows.
      </div>
    </div>
  );
}

// ============================================================
// Shared UI primitives (local to this tab)
// ============================================================

function StatusPill({ status }: { status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAYABLE' | 'PAID' | 'VOIDED' | string }) {
  const cls =
    status === 'APPROVED' || status === 'PAID' || status === 'PAYABLE'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : status === 'REJECTED' || status === 'VOIDED'
        ? 'bg-red-500/10 text-red-400 border-red-500/20'
        : status === 'PENDING'
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          : 'bg-[var(--text-muted)]/10 text-[var(--text-muted)]';
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>{status}</span>;
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-primary)]">
      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</div>
      <div className="text-[var(--text-primary)] font-medium mt-0.5">{value}</div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
      <AlertTriangle size={14} />
      {message}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      <div className="h-5 rounded shimmer" />
      <div className="h-5 rounded w-5/6 shimmer" />
      <div className="h-5 rounded w-3/4 shimmer" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="p-6 text-xs text-[var(--text-muted)] text-center">{message}</div>;
}

function SlideOver({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-full sm:max-w-xl bg-[var(--bg-elevated)] border-l border-[var(--border-default)] h-full overflow-y-auto shadow-2xl">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">✕</button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
