'use client';

import { IncentivSignIn } from './IncentivSignIn';
import { useAuth } from '@/lib/auth-context';
import { Link } from '@/i18n/routing';

export function IncentivPreview({ returnPath = "/incentiv-preview" }: { returnPath?: string }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  return (
    <main className="mx-auto w-full max-w-lg px-6 py-16">
      <h1 className="mb-4 text-3xl font-semibold text-[var(--text-primary)]">Sign in with Incentiv</h1>
      <p className="mb-8 text-sm leading-6 text-[var(--text-secondary)]">
        Connect your Incentiv wallet and approve a sign-in message. No email, password, transaction, or gas is required.
      </p>
      {isLoading ? <p role="status">Checking your Hatcher session…</p> : isAuthenticated && user ? (
        <section className="space-y-4 rounded-xl border border-[var(--border-default)] p-5" aria-label="Hatcher session">
          <h2 className="font-semibold">Your Hatcher session is active</h2>
          <p className="text-sm">Signed in as {user.username}.</p>
          <Link href="/dashboard" className="block text-sm text-[var(--accent)] underline">Open Hatcher</Link>
          <button type="button" onClick={() => void logout()} className="text-sm underline">Sign out</button>
        </section>
      ) : <IncentivSignIn returnPath={returnPath} />}
      <p className="mt-6 text-xs leading-5 text-[var(--text-muted)]">
        Choose a plan, agent upgrade or credits in <Link href="/dashboard/billing" className="underline">Hatcher billing</Link> and pay with USDC on Incentiv Mainnet. Agents can use the <a href="https://api.hatcher.host/payments/incentiv-x402" className="underline">x402 checkout guide</a>.
      </p>
    </main>
  );
}
