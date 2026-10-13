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
  const [error, setError] = useState('');
  const [linked, setLinked] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/auth/providers`, { credentials: 'include', signal: controller.signal })
      .then((response) => response.json())
      .then((data) => setAvailable(data.success && data.data?.google === true))
      .catch(() => {
        if (!controller.signal.aborted) setAvailable(false);
      });
    const code = new URLSearchParams(window.location.search).get('auth_error');
    if (code) setError(GOOGLE_AUTH_ERRORS[code] ?? GOOGLE_AUTH_ERRORS.google_failed);
    setLinked(new URLSearchParams(window.location.search).get('auth_success') === 'google_linked');
    return () => controller.abort();
  }, [apiBase]);
  if (!showUnavailable && available !== true && !error) return null;
  return (
    <div className="mb-5">
      <button
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
      </button>
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
