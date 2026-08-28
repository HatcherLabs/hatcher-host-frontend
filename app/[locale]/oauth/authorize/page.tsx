'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, ExternalLink, Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { api, type OperatorAuthorizationRequest } from '@/lib/api';
import styles from './authorize.module.css';

const SCOPE_COPY: Record<string, { title: string; description: string }> = {
  'hatcher:read': { title: 'View agents and usage', description: 'Read owned agent status, safe metadata, and API usage.' },
  'hatcher:chat': { title: 'Request agent conversations', description: 'Create exact-message approval requests before an agent is contacted.' },
  'hatcher:lifecycle': { title: 'Request lifecycle changes', description: 'Request start, stop, or restart actions. Every action still needs your approval.' },
};

export default function OperatorAuthorizePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [request, setRequest] = useState<OperatorAuthorizationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'approve' | 'deny' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const query = useMemo(() => searchParams.toString(), [searchParams]);
  const returnPath = `/oauth/authorize${query ? `?${query}` : ''}`;

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    const response = await api.getOperatorAuthorizationRequest(query);
    if (response.success) setRequest(response.data);
    else setError(response.error ?? 'This authorization request is invalid or expired.');
    setLoading(false);
  }, [isAuthenticated, query]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?return=${encodeURIComponent(returnPath)}`);
      return;
    }
    void load();
  }, [authLoading, isAuthenticated, load, returnPath, router]);

  const decide = async (decision: 'approve' | 'deny') => {
    setBusy(decision);
    setError(null);
    const body = Object.fromEntries(searchParams.entries());
    const response = await api.decideOperatorAuthorization({ ...body, decision });
    if (!response.success) {
      setError(response.error ?? 'Could not complete authorization.');
      setBusy(null);
      return;
    }
    window.location.assign(response.data.redirectUrl);
  };

  if (authLoading || loading || (!request && !error)) {
    return <main className={styles.page}><div className={styles.loading}><Loader2 size={22} /> Verifying secure connection…</div></main>;
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <div className={styles.mark}><ShieldCheck size={24} /></div>
          <div>
            <span>Hatcher Operator</span>
            <h1>{request ? `Connect ${request.client.name}` : 'Connection unavailable'}</h1>
            <p>Authorize a remote AI client without sharing your password or Hatcher API key.</p>
          </div>
        </header>

        {error ? (
          <div className={styles.error}><ShieldX size={18} /><div><strong>Authorization failed</strong><p>{error}</p></div></div>
        ) : request ? (
          <>
            <div className={styles.account}>
              <span>Hatcher account</span>
              <strong>{request.account.email}</strong>
              <small>{request.account.emailVerified ? 'Verified account' : 'Email verification required'}</small>
            </div>

            <div className={styles.permissions}>
              <h2>Requested access</h2>
              {request.scopes.map((scope) => {
                const copy = SCOPE_COPY[scope] ?? { title: scope, description: 'Access requested by this client.' };
                return <div className={styles.permission} key={scope}><Check size={15} /><div><strong>{copy.title}</strong><p>{copy.description}</p></div></div>;
              })}
            </div>

            <div className={styles.safety}>
              <ShieldCheck size={16} />
              <p>Chat and runtime changes never execute at authorization time. Each exact payload appears in Action approvals and expires if you do not approve it.</p>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.deny} onClick={() => void decide('deny')} disabled={busy !== null}>
                {busy === 'deny' ? <Loader2 size={15} /> : <ShieldX size={15} />} Deny
              </button>
              <button type="button" className={styles.approve} onClick={() => void decide('approve')} disabled={busy !== null || !request.account.emailVerified}>
                {busy === 'approve' ? <Loader2 size={15} /> : <ShieldCheck size={15} />} Authorize
              </button>
            </div>

            <footer><ExternalLink size={12} /> After approval, you will return to <span>{new URL(request.redirectUri).hostname || 'the requesting app'}</span>.</footer>
          </>
        ) : null}
      </section>
    </main>
  );
}
