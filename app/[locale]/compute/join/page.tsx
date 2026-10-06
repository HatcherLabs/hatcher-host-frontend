'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Cpu, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type ActivationState = 'waiting' | 'activating' | 'active' | 'error';

function ComputeInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const token = searchParams.get('token')?.trim() ?? '';
  const returnPath = `/compute/join?token=${encodeURIComponent(token)}`;
  const attempted = useRef(false);
  const [state, setState] = useState<ActivationState>('waiting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated || attempted.current) return;
    attempted.current = true;
    setState('activating');

    void (async () => {
      let accessStatus: string | null = null;
      let activationError: string | null = null;

      if (token) {
        const redeemResult = await api.redeemComputeBetaInvitation(token);
        if (redeemResult.success) {
          accessStatus = redeemResult.data.status;
        } else {
          activationError = redeemResult.error;
          const accessResult = await api.getComputeBetaAccess();
          if (accessResult.success) accessStatus = accessResult.data.status;
        }
      } else {
        const accessResult = await api.getComputeBetaAccess();
        if (accessResult.success) accessStatus = accessResult.data.status;
        else activationError = accessResult.error;
      }

      // A one-time link may already have been redeemed in another tab or on a
      // previous visit. In that case the access endpoint is authoritative and
      // lets the user recover without seeing a misleading token error.
      if (!accessStatus || !['onboarding', 'active'].includes(accessStatus)) {
        setError(activationError ?? (token
          ? 'This invitation is no longer active.'
          : 'This invitation link is incomplete. Reopen the full link from your invitation email.'));
        setState('error');
        return;
      }

      setState('active');
      window.history.replaceState({}, '', window.location.pathname);
      window.setTimeout(() => router.replace('/dashboard/compute'), 700);
    })();
  }, [isAuthenticated, isLoading, router, token]);

  if (isLoading) return <InvitationCard state="activating" />;
  if (!isAuthenticated) {
    return (
      <InvitationCard
        state={token ? 'waiting' : 'error'}
        error={token ? null : 'This invitation link is incomplete. Reopen the full link from your invitation email, or sign in to check whether access is already active.'}
      >
        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
          {token
            ? 'Sign in with the exact email address that received the invitation. If you do not have a Hatcher account yet, create one with that same address and verify it first.'
            : 'If you already activated the beta, signing in will take you to the Compute dashboard.'}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href={`/login?return=${encodeURIComponent(token ? returnPath : '/dashboard/compute')}`} className="btn-primary inline-flex min-h-11 items-center justify-center px-5">
            {token ? 'Sign in to activate' : 'Sign in to continue'}
          </Link>
          {token ? (
            <Link href={`/register?return=${encodeURIComponent(returnPath)}`} className="btn-secondary inline-flex min-h-11 items-center justify-center px-5">
              Create account
            </Link>
          ) : null}
        </div>
      </InvitationCard>
    );
  }
  return (
    <InvitationCard state={state} error={error}>
      {state === 'active' ? (
        <div className="mt-6">
          <button type="button" className="btn-primary min-h-11 px-5" onClick={() => router.replace('/dashboard/compute')}>
            Open Compute dashboard
          </button>
          <p className="mt-3 text-xs text-[var(--text-muted)]">Opening your dashboard automatically…</p>
        </div>
      ) : null}
    </InvitationCard>
  );
}

function InvitationCard({
  state,
  error,
  children,
}: {
  state: ActivationState;
  error?: string | null;
  children?: React.ReactNode;
}) {
  const content = {
    waiting: { icon: <ShieldCheck className="h-7 w-7" />, eyebrow: 'Closed beta invitation', title: 'Activate Hatcher Compute access' },
    activating: { icon: <Loader2 className="h-7 w-7 animate-spin" />, eyebrow: 'Checking invitation', title: 'Activating your access…' },
    active: { icon: <CheckCircle2 className="h-7 w-7" />, eyebrow: 'Access activated', title: 'Welcome to Hatcher Compute' },
    error: { icon: <TriangleAlert className="h-7 w-7" />, eyebrow: 'Activation failed', title: 'We could not activate this invitation' },
  }[state];
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg-base)] px-4 py-16 text-[var(--text-primary)]">
      <section className="card w-full max-w-xl p-7 sm:p-10">
        <div className="mb-7 flex items-center justify-between">
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--color-accent)]">{content.icon}</div>
          <Cpu className="h-5 w-5 text-[var(--text-muted)]" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">{content.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{content.title}</h1>
        {state === 'active' ? <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">Your role has been attached to this verified Hatcher account. Provider access starts in onboarding mode; builder access is active immediately.</p> : null}
        {state === 'error' ? <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error ?? 'The link may be expired, already used, or associated with another email address.'}</p> : null}
        {children}
        <p className="mt-8 border-t border-[var(--border-default)] pt-5 text-xs leading-5 text-[var(--text-muted)]">The initial beta uses simulated payments and synthetic workloads. Activating access does not promise USDC earnings.</p>
      </section>
    </main>
  );
}

export default function ComputeInvitationPage() {
  return <Suspense fallback={<InvitationCard state="activating" />}><ComputeInvitationContent /></Suspense>;
}
