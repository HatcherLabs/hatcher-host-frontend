'use client';

import { useState, Suspense } from 'react';
import { Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { Lock, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { AuthShell } from '@/components/auth/v3/AuthShell';

function ResetForm() {
  const searchParams = useSearchParams();
  const t = useTranslations('auth.resetPassword');
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <AuthShell title={t('invalidHeading')} subtitle={t('invalidBody')}>
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
        </div>
        <div className="text-center">
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:underline"
          >
            {t('invalidCta')}
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell title={t('successHeading')} subtitle={t('successBody')}>
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-lg text-sm font-medium text-[var(--bg-base)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors"
        >
          {t('successCta')}
        </Link>
      </AuthShell>
    );
  }

  const passwordsMatch = password === confirm;
  const passwordValid = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch || !passwordValid) return;
    setError(null);
    setLoading(true);
    const res = await api.resetPassword(token, password);
    setLoading(false);
    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error ?? t('genericError'));
    }
  };

  return (
    <AuthShell
      title={t('heading')}
      subtitle={t('subheading')}
      foot={
        <Link href="/login" className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors inline-flex items-center gap-1">
          <ArrowLeft size={12} />
          {t('backToLogin')}
        </Link>
      }
    >
      <div className="flex justify-center mb-6">
        <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
          <Lock className="w-6 h-6 text-[var(--accent)]" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            {t('newPasswordLabel')}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            required
            minLength={8}
            autoFocus
            className="w-full h-10 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-[var(--accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30 placeholder:text-[var(--text-muted)] transition-colors"
            placeholder={t('newPasswordPlaceholder')}
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            {t('confirmPasswordLabel')}
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(null); }}
            required
            className={`w-full h-10 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border focus:outline-none focus:ring-1 placeholder:text-[var(--text-muted)] transition-colors ${
              confirm && !passwordsMatch
                ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30'
                : 'border-[var(--border-default)] focus:border-[var(--accent)]/50 focus:ring-[var(--accent)]/30'
            }`}
            placeholder={t('confirmPasswordPlaceholder')}
          />
          {confirm && !passwordsMatch && (
            <p className="text-[10px] text-red-400 mt-1">{t('passwordMismatch')}</p>
          )}
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !passwordValid || !passwordsMatch}
          className="w-full h-10 rounded-lg text-sm font-medium text-[var(--bg-base)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-[var(--bg-base)]/30 border-t-[var(--bg-base)] rounded-full animate-spin" />
              {t('submitLoading')}
            </>
          ) : (
            t('submit')
          )}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <AuthShell title="Loading…">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
        </div>
      </AuthShell>
    }>
      <ResetForm />
    </Suspense>
  );
}
