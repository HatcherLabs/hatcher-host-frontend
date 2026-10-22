'use client';

import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/config';
import { GOOGLE_AUTH_ERRORS } from '@/lib/google-auth';

export function GoogleSignIn({
  returnPath = '/dashboard',
  apiBase = API_URL,
  intent = 'login',
  showUnavailable = false,
  onBeforeRedirect,
}: {
  returnPath?: string;
  apiBase?: string;
  intent?: 'login' | 'link';
  showUnavailable?: boolean;
  onBeforeRedirect?: () => void;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [error, setError] = useState('');
  const [linked, setLinked] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/auth/providers`, { credentials: 'include', signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        setAvailable(data.success && data.data?.google === true);
        setAppleAvailable(intent === 'login' && data.success && data.data?.apple === true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setAvailable(false);
      });
    const code = new URLSearchParams(window.location.search).get('auth_error');
    if (code) setError(code.startsWith('apple_')
      ? ({ apple_unavailable: 'Apple sign-in is not available yet.', apple_link_required: 'Sign in to your existing Hatcher account and link Apple in the app.', apple_account_mismatch: 'This Apple account is connected to a different Hatcher account.' }[code] ?? 'Apple sign-in could not be completed. Please try again.')
      : GOOGLE_AUTH_ERRORS[code] ?? GOOGLE_AUTH_ERRORS.google_failed);
    setLinked(new URLSearchParams(window.location.search).get('auth_success') === 'google_linked');
    return () => controller.abort();
  }, [apiBase, intent]);
  if (!showUnavailable && available !== true && !appleAvailable && !error) return null;
  return (
    <div className="mb-5">
      {(available === true || showUnavailable) && <button
        type="button"
        disabled={available !== true}
        className="w-full flex items-center justify-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => {
          onBeforeRedirect?.();
          window.location.assign(
            `${apiBase}/auth/google/start?return=${encodeURIComponent(returnPath)}&intent=${intent}`,
          );
        }}
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.7 4.7 0 0 1-2 3v2.5h3.3c1.9-1.8 3-4.3 3-7.4Z"
          />
          <path
            fill="#34A853"
            d="M12 22c2.7 0 5-.9 6.8-2.4l-3.3-2.5c-.9.6-2.1 1-3.5 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22Z"
          />
          <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-4V7.4H3a10 10 0 0 0 0 9.2L6.4 14Z" />
          <path
            fill="#EA4335"
            d="M12 5.9c1.5 0 2.9.5 3.9 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.4L6.4 10A6 6 0 0 1 12 5.9Z"
          />
        </svg>
        {intent === 'link' ? 'Connect Google' : 'Continue with Google'}
      </button>}
      {appleAvailable && <button type="button"
        className="mt-3 flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
        onClick={() => {
          onBeforeRedirect?.();
          window.location.assign(`${apiBase}/auth/apple/web/start?return=${encodeURIComponent(returnPath)}`);
        }}>
        <svg aria-hidden="true" width="18" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 12.54c.03 3.2 2.82 4.27 2.85 4.28-.02.08-.45 1.52-1.48 3.01-.9 1.29-1.83 2.58-3.29 2.61-1.43.03-1.89-.84-3.53-.84-1.64 0-2.15.81-3.5.87-1.41.05-2.48-1.4-3.38-2.69C2.88 17.14 1.47 12.32 3.36 9.07a5.24 5.24 0 0 1 4.44-2.68c1.39-.03 2.7.93 3.54.93.85 0 2.43-1.15 4.09-.98.7.03 2.65.28 3.9 2.1-.1.06-2.33 1.35-2.28 4.1ZM14.37 4.6c.75-.9 1.25-2.16 1.11-3.41-1.08.04-2.39.72-3.16 1.62-.7.8-1.32 2.08-1.16 3.3 1.2.09 2.43-.61 3.21-1.51Z" /></svg> Continue with Apple
      </button>}
      {available === false && showUnavailable ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Google sign-in is being set up. Email is available.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--color-destructive)]">
          {error}
        </p>
      ) : null}
      {linked && intent === 'link' ? (
        <p role="status" className="mt-3 text-sm text-[var(--color-success)]">
          Google is connected to your Hatcher account.
        </p>
      ) : null}
      {intent === 'login' ? (
        <p className="mt-4 text-center text-xs text-[var(--text-muted)]">or continue with email</p>
      ) : null}
    </div>
  );
}
