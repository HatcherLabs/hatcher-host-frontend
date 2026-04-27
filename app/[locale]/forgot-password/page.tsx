'use client';

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/v3/AuthShell';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgotPassword');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await api.forgotPassword(email);
    setLoading(false);
    if (res.success) {
      setSent(true);
    } else {
      setError(res.error ?? t('genericError'));
    }
  };

  if (sent) {
    return (
      <AuthShell title={t('successHeading')}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            {t.rich('successBody', {
              email,
              bold: (chunks) => <strong className="text-[var(--text-primary)]">{chunks}</strong>,
            })}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:underline"
          >
            <ArrowLeft size={14} />
            {t('successBackLink')}
          </Link>
        </div>
      </AuthShell>
    );
  }

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
          <Mail className="w-6 h-6 text-[var(--accent)]" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            {t('emailLabel')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="off"
            spellCheck={false}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            required
            autoFocus
            className="w-full h-10 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-[var(--accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30 placeholder:text-[var(--text-muted)] transition-colors"
            placeholder={t('emailPlaceholder')}
          />
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
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
