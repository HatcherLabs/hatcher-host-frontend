'use client';

// ============================================================
// /affiliate/apply — affiliate application form
// ============================================================
// Four states:
//   1. not logged in              → redirect to /login?next=/affiliate/apply
//   2. APPROVED application       → redirect to /dashboard/affiliate
//   3. PENDING application        → read-only recap + "we'll review soon"
//   4. REJECTED or no application → form
//
// Form validation mirrors the server-side Zod schema in
// apps/api/src/routes/affiliate.ts so bad input fails client-side
// first. The SOL address regex + slug rules are copied (not shared)
// — Phase I didn't bump @hatcherlabs/shared for a single regex and
// we're not starting now.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Wallet,
  Coins,
  Sparkles,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

// Copy of the server regex (kept in sync manually — see file header).
const SOL_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Slug rules (mirror backend):
//   - 3–30 chars
//   - lowercase letters, digits, hyphens
//   - cannot start or end with a hyphen
//   - cannot appear in RESERVED_SLUGS
const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const RESERVED_SLUGS = new Set<string>([
  'admin', 'api', 'app', 'auth', 'affiliate', 'affiliates',
  'dashboard', 'docs', 'help', 'login', 'logout', 'register', 'signup',
  'pricing', 'r', 'robots', 'sitemap', 'settings', 'status', 'support',
  'terms', 'privacy', 'cookies', 'impressum',
  'cristian', 'hatcher', 'hatcherlabs', 'claude', 'anthropic',
  'test', 'demo', 'example',
]);

const MAX_PLATFORMS = 5;

type PlatformType = 'x' | 'youtube' | 'telegram' | 'discord' | 'other';
type PayoutMode = 'CASH_ONLY' | 'CREDITS_ONLY' | 'HYBRID';

type PlatformEntry = {
  type: PlatformType;
  handle: string;
  audienceSize: string; // kept as string so empty = optional
  url: string;
};

type ApplicationPlatform = {
  type: PlatformType;
  handle: string;
  audienceSize: number | null;
  url: string | null;
};

type Application = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  platforms: ApplicationPlatform[];
  pitch: string;
  payoutMode: PayoutMode;
  payoutAddress: string | null;
  desiredSlug: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
};

const PLATFORM_OPTIONS: Array<{ value: PlatformType; label: string }> = [
  { value: 'x', label: 'X (Twitter)' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'discord', label: 'Discord' },
  { value: 'other', label: 'Other' },
];

const PAYOUT_OPTIONS: Array<{
  value: PayoutMode;
  label: string;
  breakdown: string;
  icon: typeof Wallet;
  accent: string;
}> = [
  {
    value: 'CASH_ONLY',
    label: 'Cash Only',
    breakdown: '20% recurring, paid in SOL / USDC / $HATCHER',
    icon: Wallet,
    accent: '#22c55e',
  },
  {
    value: 'CREDITS_ONLY',
    label: 'Credits Only',
    breakdown: '40% recurring, paid as Hatcher credits',
    icon: Coins,
    accent: 'var(--color-accent)',
  },
  {
    value: 'HYBRID',
    label: 'Hybrid',
    breakdown: '15% cash + 25% credits (40% total)',
    icon: Sparkles,
    accent: '#8b5cf6',
  },
];

// ============================================================
// Slug validation — returns null if valid, else a specific reason.
function validateSlug(raw: string): string | null {
  const slug = raw.trim().toLowerCase();
  if (slug.length === 0) return null; // optional
  if (slug.length < 3) return 'Too short — min 3 characters';
  if (slug.length > 30) return 'Too long — max 30 characters';
  if (!SLUG_RE.test(slug)) return 'Only a–z, 0–9, and hyphens (cannot start/end with -)';
  if (RESERVED_SLUGS.has(slug)) return 'That slug is reserved — pick another';
  return null;
}

// ============================================================

export default function AffiliateApplyPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [loadingApplication, setLoadingApplication] = useState(true);
  const [application, setApplication] = useState<Application | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ─── Redirect: not logged in ───────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/affiliate/apply');
    }
  }, [authLoading, isAuthenticated, router]);

  // ─── Fetch existing application ────────────────────────────
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getMyAffiliateApplication();
        if (cancelled) return;
        if (res.success) {
          setApplication(res.data.application);
        } else {
          setLoadError(res.error || 'Could not load application state');
        }
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoadingApplication(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  // ─── Redirect: already approved → dashboard ────────────────
  useEffect(() => {
    if (application?.status === 'APPROVED') {
      router.replace('/dashboard/affiliate');
    }
  }, [application?.status, router]);

  // ─── Render ───────────────────────────────────────────────
  if (authLoading || loadingApplication) {
    return (
      <CenteredMessage>
        <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      </CenteredMessage>
    );
  }

  if (!isAuthenticated) {
    // Redirect effect fired; render nothing while navigation happens.
    return null;
  }

  if (loadError) {
    return (
      <CenteredMessage>
        <AlertCircle className="w-5 h-5 text-red-400" />
        <p className="text-sm text-[var(--text-secondary)]">{loadError}</p>
      </CenteredMessage>
    );
  }

  if (application?.status === 'APPROVED') {
    return null; // redirecting
  }

  if (application?.status === 'PENDING') {
    return <PendingRecap application={application} />;
  }

  // REJECTED or no application → show form. Feed the rejection notes
  // into the form state so the user knows why their last attempt was
  // declined before they retry.
  return <ApplyForm previousApplication={application} onSubmitted={setApplication} />;
}

// ============================================================
// Pending state — read-only recap
// ============================================================
function PendingRecap({ application }: { application: Application }) {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-12 sm:pt-16 pb-20">
      <BackLink />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 sm:p-8"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/30 flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#f59e0b]" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Application submitted
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              Under review — we&apos;ll be in touch.
            </h1>
          </div>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Expected review time: <strong className="text-[var(--text-primary)]">3–5 days</strong>.
          You&apos;ll get an email the moment a decision lands.
        </p>

        <dl className="space-y-4 text-sm border-t border-[var(--border-default)] pt-5">
          <Row label="Submitted">{new Date(application.createdAt).toLocaleString()}</Row>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-2">
              Platforms
            </p>
            <ul className="space-y-2">
              {application.platforms.map((p, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[var(--text-primary)]">
                      <span className="text-[var(--color-accent)] font-mono text-xs uppercase mr-2">
                        {PLATFORM_OPTIONS.find((o) => o.value === p.type)?.label ?? p.type}
                      </span>
                      {p.handle}
                    </span>
                    {p.audienceSize !== null && (
                      <span className="text-xs text-[var(--text-muted)]">
                        {p.audienceSize.toLocaleString()} followers
                      </span>
                    )}
                  </div>
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-xs text-[var(--color-accent)] hover:underline break-all"
                    >
                      {p.url}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {application.desiredSlug && (
            <Row label="Requested slug">
              <span className="font-mono text-xs">
                {application.desiredSlug}
              </span>
              <span className="block text-xs text-[var(--text-muted)] mt-0.5">
                preview: hatcher.host/r/{application.desiredSlug}
              </span>
            </Row>
          )}

          <Row label="Payout mode">
            {PAYOUT_OPTIONS.find((p) => p.value === application.payoutMode)?.label ??
              application.payoutMode}
          </Row>
          {application.payoutAddress && (
            <Row label="Payout address">
              <span className="font-mono text-xs break-all">{application.payoutAddress}</span>
            </Row>
          )}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-1.5">
              Pitch
            </p>
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
              {application.pitch}
            </p>
          </div>
        </dl>
      </motion.div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="text-[var(--text-primary)] sm:text-right">{children}</dd>
    </div>
  );
}

// ============================================================
// Form state
// ============================================================
type FormState = {
  platforms: PlatformEntry[];
  desiredSlug: string;
  pitch: string;
  payoutMode: PayoutMode;
  payoutAddress: string;
};

type FieldErrors = {
  platforms?: string; // generic list-level error
  platformHandles?: string[]; // per-row handle errors
  platformAudience?: string[]; // per-row audience errors
  platformUrl?: string[]; // per-row url errors
  desiredSlug?: string;
  pitch?: string;
  payoutAddress?: string;
};

function makeEmptyPlatform(): PlatformEntry {
  return { type: 'x', handle: '', audienceSize: '', url: '' };
}

function ApplyForm({
  previousApplication,
  onSubmitted,
}: {
  previousApplication: Application | null;
  onSubmitted: (app: Application) => void;
}) {
  const wasRejected = previousApplication?.status === 'REJECTED';

  // Seed the form from the previous (rejected) submission so users don't
  // have to retype everything. Rejection notes are surfaced above the form.
  const [form, setForm] = useState<FormState>(() => ({
    platforms:
      previousApplication && previousApplication.platforms.length > 0
        ? previousApplication.platforms.map((p) => ({
            type: p.type,
            handle: p.handle,
            audienceSize: p.audienceSize?.toString() ?? '',
            url: p.url ?? '',
          }))
        : [makeEmptyPlatform()],
    desiredSlug: previousApplication?.desiredSlug ?? '',
    pitch: previousApplication?.pitch ?? '',
    payoutMode: previousApplication?.payoutMode ?? 'CASH_ONLY',
    payoutAddress: previousApplication?.payoutAddress ?? '',
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const needsPayoutAddress = form.payoutMode !== 'CREDITS_ONLY';

  const pitchLen = form.pitch.trim().length;
  const pitchCountClass = useMemo(() => {
    if (pitchLen === 0) return 'text-[var(--text-muted)]';
    if (pitchLen < 50) return 'text-[#f59e0b]';
    if (pitchLen > 2000) return 'text-red-400';
    return 'text-[#22c55e]';
  }, [pitchLen]);

  // Slug: live validation + preview. The slug is lowercased on blur
  // (not on each keystroke) so users can type naturally — we still
  // strip whitespace immediately and lowercase before submit.
  const slugTrimmed = form.desiredSlug.trim().toLowerCase();
  const slugError = useMemo(() => validateSlug(form.desiredSlug), [form.desiredSlug]);

  // ── Platform list helpers ──
  function updatePlatform(idx: number, patch: Partial<PlatformEntry>) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));
  }
  function addPlatform() {
    setForm((f) =>
      f.platforms.length >= MAX_PLATFORMS
        ? f
        : { ...f, platforms: [...f.platforms, makeEmptyPlatform()] },
    );
  }
  function removePlatform(idx: number) {
    setForm((f) =>
      f.platforms.length <= 1
        ? f
        : { ...f, platforms: f.platforms.filter((_, i) => i !== idx) },
    );
  }

  const validate = useCallback((): FieldErrors => {
    const next: FieldErrors = {};
    const handleErrs: string[] = [];
    const audienceErrs: string[] = [];
    const urlErrs: string[] = [];
    let anyPlatformErr = false;

    if (form.platforms.length === 0) {
      next.platforms = 'Add at least one platform';
    }
    if (form.platforms.length > MAX_PLATFORMS) {
      next.platforms = `Max ${MAX_PLATFORMS} platforms`;
    }

    form.platforms.forEach((p, i) => {
      const h = p.handle.trim();
      if (!h) {
        handleErrs[i] = 'Required';
        anyPlatformErr = true;
      } else if (h.length > 100) {
        handleErrs[i] = 'Max 100 characters';
        anyPlatformErr = true;
      }

      if (p.audienceSize.trim() && !/^\d+$/.test(p.audienceSize.trim())) {
        audienceErrs[i] = 'Must be a whole number';
        anyPlatformErr = true;
      }

      if (p.url.trim()) {
        try {
          new URL(p.url.trim());
        } catch {
          urlErrs[i] = 'Must be a valid URL';
          anyPlatformErr = true;
        }
      }
    });

    if (anyPlatformErr) {
      next.platformHandles = handleErrs;
      next.platformAudience = audienceErrs;
      next.platformUrl = urlErrs;
    }

    // Desired slug (optional)
    const slugErr = validateSlug(form.desiredSlug);
    if (slugErr) next.desiredSlug = slugErr;

    const pitch = form.pitch.trim();
    if (pitch.length < 50) next.pitch = 'Pitch must be at least 50 characters';
    else if (pitch.length > 2000) next.pitch = 'Pitch must be at most 2000 characters';

    if (needsPayoutAddress) {
      const addr = form.payoutAddress.trim();
      if (!addr) next.payoutAddress = 'Required for CASH_ONLY and HYBRID';
      else if (!SOL_ADDRESS_RE.test(addr))
        next.payoutAddress = 'Must be a valid Solana base58 address (32–44 chars)';
    }

    return next;
  }, [form, needsPayoutAddress]);

  const hasErrors = (e: FieldErrors): boolean => {
    if (e.platforms || e.desiredSlug || e.pitch || e.payoutAddress) return true;
    if (e.platformHandles?.some(Boolean)) return true;
    if (e.platformAudience?.some(Boolean)) return true;
    if (e.platformUrl?.some(Boolean)) return true;
    return false;
  };

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return; // hard stop on double-submit
      setSubmitError(null);
      const validationErrors = validate();
      setErrors(validationErrors);
      if (hasErrors(validationErrors)) return;

      const desiredSlugFinal = form.desiredSlug.trim().toLowerCase();

      const platformsPayload = form.platforms.map((p) => {
        const payload: {
          type: PlatformType;
          handle: string;
          audienceSize?: number;
          url?: string;
        } = {
          type: p.type,
          handle: p.handle.trim(),
        };
        if (p.audienceSize.trim()) payload.audienceSize = Number(p.audienceSize.trim());
        if (p.url.trim()) payload.url = p.url.trim();
        return payload;
      });

      setSubmitting(true);
      try {
        const res = await api.submitAffiliateApplication({
          platforms: platformsPayload,
          pitch: form.pitch.trim(),
          payoutMode: form.payoutMode,
          payoutAddress: needsPayoutAddress ? form.payoutAddress.trim() : undefined,
          desiredSlug: desiredSlugFinal || undefined,
        });

        if (res.success) {
          setSuccess(true);
          onSubmitted({
            id: res.data.application.id,
            status: res.data.application.status,
            platforms: platformsPayload.map((p) => ({
              type: p.type,
              handle: p.handle,
              audienceSize: p.audienceSize ?? null,
              url: p.url ?? null,
            })),
            pitch: form.pitch.trim(),
            payoutMode: form.payoutMode,
            payoutAddress: needsPayoutAddress ? form.payoutAddress.trim() : null,
            desiredSlug: desiredSlugFinal || null,
            createdAt: res.data.application.createdAt,
            reviewedAt: null,
            reviewNotes: null,
          });
        } else {
          // Map known server errors to the appropriate field.
          const msg = res.error || 'Could not submit application';
          if (/slug/i.test(msg) && /taken/i.test(msg)) {
            setErrors((prev) => ({ ...prev, desiredSlug: msg }));
          } else if (/slug/i.test(msg)) {
            setErrors((prev) => ({ ...prev, desiredSlug: msg }));
          } else {
            setSubmitError(msg);
          }
        }
      } catch (err) {
        setSubmitError((err as Error).message);
      } finally {
        setSubmitting(false);
      }
    },
    [form, needsPayoutAddress, onSubmitted, submitting, validate],
  );

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-12 sm:pt-16 pb-20">
        <BackLink />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--bg-card)] p-8 text-center"
        >
          <div className="mx-auto mb-4 w-14 h-14 rounded-xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center">
            <Check className="w-7 h-7 text-[var(--color-accent)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            Application submitted.
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto mb-6">
            We&apos;ll review within <strong>3–5 days</strong> and email you the result. In the meantime
            feel free to spec out what you&apos;ll share once you&apos;re approved.
          </p>
          <Link
            href="/affiliate"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-[var(--border-hover)] text-[var(--text-primary)] text-sm font-semibold hover:bg-[var(--bg-hover)] transition-colors"
          >
            Back to Affiliate Program
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-12 sm:pt-16 pb-20">
      <BackLink />

      <div className="mb-8">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Apply to Hatcher Affiliates
        </p>
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
        >
          Tell us about you.
        </h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)] max-w-xl leading-relaxed">
          A few details about your platforms and audience. We review every application manually — be
          honest, be specific.
        </p>
      </div>

      {wasRejected && previousApplication?.reviewNotes && (
        <div className="mb-6 rounded-xl border border-red-400/30 bg-red-400/[0.04] p-4">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-red-400 mb-1">
                Previous application rejected
              </p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {previousApplication.reviewNotes}
              </p>
            </div>
          </div>
        </div>
      )}

      {submitError && (
        <div className="mb-6 rounded-xl border border-red-400/30 bg-red-400/[0.04] p-4">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[var(--text-secondary)]">{submitError}</p>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-8">
        {/* ───────────── Platforms ───────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Your platforms <span className="text-red-400">*</span>
            </h2>
            <span className="text-[11px] text-[var(--text-muted)]">
              {form.platforms.length} / {MAX_PLATFORMS}
            </span>
          </div>

          <div className="space-y-3">
            {form.platforms.map((p, idx) => {
              const handleErr = errors.platformHandles?.[idx];
              const audienceErr = errors.platformAudience?.[idx];
              const urlErr = errors.platformUrl?.[idx];
              const showRemove = form.platforms.length > 1;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]/40 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                      Platform {idx + 1}
                    </span>
                    {showRemove && (
                      <button
                        type="button"
                        onClick={() => removePlatform(idx)}
                        className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
                        aria-label={`Remove platform ${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Platform type" required>
                      <select
                        value={p.type}
                        onChange={(e) =>
                          updatePlatform(idx, { type: e.target.value as PlatformType })
                        }
                        // color-scheme: dark tells the browser to render the
                        // native <option> popup using dark UA styles. Without
                        // this, Chrome + Firefox on dark theme render open
                        // dropdowns with white-on-white options. Keep the
                        // explicit bg/text on the select itself too.
                        style={{ colorScheme: 'dark' }}
                        className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] [color-scheme:dark]"
                      >
                        {PLATFORM_OPTIONS.map((opt) => (
                          <option
                            key={opt.value}
                            value={opt.value}
                            className="bg-[var(--bg-card)] text-[var(--text-primary)]"
                          >
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Handle" required error={handleErr}>
                      <input
                        type="text"
                        value={p.handle}
                        onChange={(e) => updatePlatform(idx, { handle: e.target.value })}
                        placeholder="@hatcher"
                        className="input"
                        maxLength={100}
                        required
                      />
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        e.g. @hatcher, @solana, /channel/xyz
                      </p>
                    </Field>

                    <Field label="Audience size (optional)" error={audienceErr}>
                      <input
                        type="number"
                        min={0}
                        value={p.audienceSize}
                        onChange={(e) => updatePlatform(idx, { audienceSize: e.target.value })}
                        placeholder="e.g. 12000"
                        className="input"
                      />
                    </Field>

                    <Field label="URL (optional)" error={urlErr}>
                      <input
                        type="url"
                        value={p.url}
                        onChange={(e) => updatePlatform(idx, { url: e.target.value })}
                        placeholder="https://x.com/hatcher"
                        className="input"
                      />
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>

          {errors.platforms && (
            <p className="mt-2 text-xs text-red-400">{errors.platforms}</p>
          )}

          <button
            type="button"
            onClick={addPlatform}
            disabled={form.platforms.length >= MAX_PLATFORMS}
            className="mt-3 inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-dashed border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add another platform
          </button>
        </section>

        {/* ───────────── Desired slug ───────────── */}
        <Field label="Custom referral link (optional)" error={errors.desiredSlug}>
          <div className="flex items-stretch rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] focus-within:border-[var(--color-accent)] transition-colors">
            <span className="inline-flex items-center px-3 text-xs font-mono text-[var(--text-muted)] border-r border-[var(--border-default)] select-none">
              hatcher.host/r/
            </span>
            <input
              type="text"
              value={form.desiredSlug}
              onChange={(e) =>
                // Strip whitespace immediately; lowercase on blur for UX.
                setForm({ ...form, desiredSlug: e.target.value.replace(/\s+/g, '') })
              }
              onBlur={() =>
                setForm((f) => ({ ...f, desiredSlug: f.desiredSlug.trim().toLowerCase() }))
              }
              placeholder="yourname"
              className="flex-1 bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)]"
              maxLength={30}
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>
          {/* Live preview / status */}
          {(() => {
            if (errors.desiredSlug) return null; // field-level error takes over
            if (slugTrimmed.length === 0) {
              return (
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                  Leave blank for an auto-generated code
                </p>
              );
            }
            if (slugError) {
              return <p className="mt-1.5 text-xs text-red-400">{slugError}</p>;
            }
            return (
              <p className="mt-1.5 text-xs text-[#22c55e]">
                Your link will be hatcher.host/r/{slugTrimmed}
              </p>
            );
          })()}
        </Field>

        {/* ───────────── Pitch ───────────── */}
        <Field label="Pitch" error={errors.pitch} required>
          <textarea
            value={form.pitch}
            onChange={(e) => setForm({ ...form, pitch: e.target.value })}
            placeholder="Why do you want to partner with Hatcher? What kind of content or audience will you reach?"
            className="input min-h-[140px] resize-y"
            maxLength={2000}
            required
          />
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">50–2000 characters</span>
            <span className={`tabular-nums font-medium ${pitchCountClass}`}>
              {pitchLen} / 2000
            </span>
          </div>
        </Field>

        {/* ───────────── Payout mode ───────────── */}
        <fieldset>
          <legend className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-3">
            Payout mode <span className="text-red-400">*</span>
          </legend>
          <div className="space-y-2.5">
            {PAYOUT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = form.payoutMode === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                    selected
                      ? 'border-[var(--color-accent)] bg-[var(--bg-card)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-card)]/40 hover:border-[var(--border-hover)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="payoutMode"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setForm({ ...form, payoutMode: opt.value })}
                    className="sr-only"
                  />
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `color-mix(in oklab, ${opt.accent} 15%, transparent)`,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: opt.accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {opt.label}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">{opt.breakdown}</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      selected
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                        : 'border-[var(--border-default)]'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

        {needsPayoutAddress && (
          <Field
            label="SOL wallet address (base58, 32–44 chars)"
            error={errors.payoutAddress}
            required
          >
            <input
              type="text"
              value={form.payoutAddress}
              onChange={(e) => setForm({ ...form, payoutAddress: e.target.value })}
              placeholder="e.g. 21L6VVRAuxk87sXggz8exhPCm1w4qWyKEs6SDauyyRAW"
              className="input font-mono text-xs"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              required
            />
          </Field>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 h-11 px-6 rounded-md bg-[var(--text-primary)] text-[var(--bg-base)] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              Submit application
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Inline styles local to this page — keeps the input class short
          without polluting global.css. If other forms adopt the same
          pattern we'll promote these to a shared utility. */}
      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          font-size: 14px;
          transition: border-color 0.15s ease;
        }
        :global(.input:focus) {
          outline: none;
          border-color: var(--color-accent);
        }
        :global(.input::placeholder) {
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          {label}
          {required && <span className="text-red-400"> *</span>}
        </span>
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/affiliate"
      className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Affiliate Program
    </Link>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-4">
      {children}
    </div>
  );
}
