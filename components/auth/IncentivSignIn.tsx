'use client';

import { useEffect, useRef, useState } from 'react';
import { Wallet } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { clearToken } from '@/lib/api';
import { ensureBrowserAdmission } from '@/lib/browser-admission';
import { sanitizeLocalReturnPath } from '@/lib/safe-redirect';
import { clearTerminalCredentialMounts } from '@/lib/terminal-credentials';
import { useTranslations } from 'next-intl';

type Resolver = InstanceType<typeof import('@incentiv/dapp-sdk')['IncentivResolver']>;
type Sdk = typeof import('@incentiv/dapp-sdk');
type Challenge = { challengeId: string; message: string; address: string; expiresAt: string };
const PORTAL = 'https://portal.incentiv.io';
async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(API_URL + path, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || 'Wallet sign-in failed. Please try again.');
  return result.data as T;
}

export function IncentivSignIn({ returnPath = '/dashboard' }: { returnPath?: string }) {
  const t = useTranslations('incentivLogin');
  const [enabled, setEnabled] = useState(false);
  const [sdk, setSdk] = useState<Sdk | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const resolver = useRef<Resolver | null>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(API_URL + '/auth/incentiv/config', { credentials: 'include', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(async result => {
        if (!result?.success || !result.data.enabled || controller.signal.aborted) return;
        setEnabled(true);
        // Load only when the provider is enabled; never execute the SDK during SSR.
        const loaded = await import('@incentiv/dapp-sdk');
        if (!controller.signal.aborted) setSdk(loaded);
      })
      .catch(() => { if (!controller.signal.aborted) setError(t('unavailable')); });
    return () => controller.abort();
  }, [t]);

  async function connect() {
    if (!sdk || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      // Open directly from the click: awaiting network/security checks first
      // would lose browser user activation and block the Portal popup.
      const address = await sdk.IncentivResolver.getAccountAddress(PORTAL);
      if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error(t('connectionFailed'));
      await ensureBrowserAdmission('oauth');
      const next = await post<Challenge>('/auth/incentiv/challenge', { address });
      resolver.current = new sdk.IncentivResolver(PORTAL);
      setChallenge(next);
    } catch (cause) {
      setChallenge(null);
      setError(cause instanceof Error ? cause.message : t('failed'));
    } finally { inFlight.current = false; setBusy(false); }
  }
  async function sign() {
    if (!challenge || !resolver.current || inFlight.current) return;
    if (Date.parse(challenge.expiresAt) <= Date.now()) {
      setChallenge(null); setError(t('expired')); return;
    }
    inFlight.current = true; setBusy(true); setError('');
    try {
      // Resolver returns the same structured signature + owner as
      // IncentivSigner.signMessageDetailed, without a browser RPC provider.
      const proof = await resolver.current.signMessage(challenge.message);
      await post('/auth/incentiv/verify', {
        challengeId: challenge.challengeId, signature: proof.signature, owner: proof.owner,
      });
      clearTerminalCredentialMounts();
      clearToken(); // Remove any stale bearer token; the new session is httpOnly.
      window.location.assign(sanitizeLocalReturnPath(returnPath));
    } catch (cause) {
      setChallenge(null);
      setError(cause instanceof Error ? cause.message : t('failed'));
    } finally { inFlight.current = false; setBusy(false); }
  }
  if (!enabled) return null;
  return (
    <div className="mb-4 space-y-2">
      <button type="button" disabled={!sdk || busy}
        onClick={() => void (challenge ? sign() : connect())}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50">
        <Wallet size={16} aria-hidden="true" />
        {busy ? t('waiting') : !sdk ? t('loading') : challenge ? t('sign') : t('continue')}
      </button>
      <p className="text-xs text-[var(--text-muted)]" aria-live="polite">
        {challenge ? t('connected', { address: challenge.address.slice(0, 6) + '…' + challenge.address.slice(-4) }) : t('description')}
      </p>
      {challenge && !busy && <button type="button" onClick={() => { setChallenge(null); setError(''); }}
        className="text-xs text-[var(--text-secondary)] underline">{t('change')}</button>}
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
