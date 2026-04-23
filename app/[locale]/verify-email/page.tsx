'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { setToken } from '@/lib/api/core';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';

export default function VerifyEmailPage() {
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
        // Store the fresh token (emailVerified=true) so subsequent API calls work immediately
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] px-4">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-[var(--color-accent)] mx-auto" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('loadingHeading')}</h1>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('successHeading')}</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {t('successBody')}
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-[#8b5cf6] text-white hover:bg-[#7c3aed] transition-colors"
            >
              {t('successCta')}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('errorHeading')}</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {message || t('errorBody')}
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-[#8b5cf6] text-white hover:bg-[#7c3aed] transition-colors"
            >
              {t('errorCta')}
            </Link>
          </div>
        )}

        {status === 'no-token' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('noTokenHeading')}</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {t('noTokenBody')}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {t('noTokenHint')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
