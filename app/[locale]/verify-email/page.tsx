'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { setToken } from '@/lib/api/core';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { AuthShell } from '@/components/auth/v3/AuthShell';

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const t = useTranslations('auth.verifyEmail');
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
        if (res.data?.accessToken) setToken(res.data.accessToken);
        setStatus('success');
      } else {
        setStatus('error');
        setMessage(res.error ?? t('errorBody'));
      }
    }).catch(() => {
      setStatus('error');
      setMessage(t('errorBody'));
    });
  }, [token, t]);

  if (status === 'loading') {
    return (
      <AuthShell title={t('loadingHeading')}>
        <div className="flex justify-center py-6">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--accent)]" />
        </div>
      </AuthShell>
    );
  }

  if (status === 'success') {
    return (
      <AuthShell title={t('successHeading')} subtitle={t('successBody')}>
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-lg text-sm font-medium text-[var(--bg-base)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors"
        >
          {t('successCta')}
        </Link>
      </AuthShell>
    );
  }

  if (status === 'error') {
    return (
      <AuthShell title={t('errorHeading')} subtitle={message || t('errorBody')}>
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-lg text-sm font-medium text-[var(--bg-base)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors"
        >
          {t('errorCta')}
        </Link>
      </AuthShell>
    );
  }

  // no-token
  return (
    <AuthShell title={t('noTokenHeading')} subtitle={t('noTokenBody')}>
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Mail className="w-8 h-8 text-amber-400" />
        </div>
      </div>
      <p className="text-xs text-[var(--text-muted)] text-center">
        {t('noTokenHint')}
      </p>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <AuthShell title="Loading…">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      </AuthShell>
    }>
      <VerifyEmailInner />
    </Suspense>
  );
}
