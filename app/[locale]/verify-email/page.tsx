'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { setToken } from '@/lib/api/core';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-token'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    api.verifyEmail(token).then((res) => {
      if (res.success) {
        // Store the fresh token (emailVerified=true) so subsequent API calls work immediately
        if (res.data?.accessToken) setToken(res.data.accessToken);
        setStatus('success');
      } else {
        setStatus('error');
        setMessage(res.error ?? 'Verification failed');
      }
    }).catch(() => {
      setStatus('error');
      setMessage('Verification failed. Please try again.');
    });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] px-4">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-[var(--color-accent)] mx-auto" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Verifying your email...</h1>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Email Verified!</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Your account is now active. You can start creating agents.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-[#8b5cf6] text-white hover:bg-[#7c3aed] transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Verification Failed</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {message || 'The verification link is invalid or has expired.'}
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-[#8b5cf6] text-white hover:bg-[#7c3aed] transition-colors"
            >
              Go to Login
            </Link>
          </div>
        )}

        {status === 'no-token' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Check Your Email</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              We sent a verification link to your email. Click the link to activate your account.
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Didn&apos;t receive it? Check your spam folder or try logging in to resend.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
