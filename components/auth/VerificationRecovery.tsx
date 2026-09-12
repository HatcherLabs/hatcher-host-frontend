'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';

/** Recovery is always offered, without revealing whether an email has an account. */
export function VerificationRecovery() {
  const t = useTranslations('auth.verifyEmail');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'accepted' | 'error'>('idle');
  const submitting = useRef(false);

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setStatus('sending');
    try {
      const result = await api.resendVerification(email.trim().toLowerCase());
      setStatus(result.success ? 'accepted' : 'error');
    } catch {
      setStatus('error');
    } finally {
      submitting.current = false;
    }
  }

  return (
    <div className="space-y-4 mt-6">
      <form onSubmit={resend} className="space-y-3">
        <label htmlFor="verification-email" className="block text-xs font-medium text-[var(--text-secondary)]">
          {t('recoveryEmailLabel')}
        </label>
        <input
          id="verification-email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          value={email}
          disabled={status === 'sending'}
          onChange={(event) => { setEmail(event.target.value); setStatus('idle'); }}
          className="w-full h-10 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <button type="submit" disabled={status === 'sending'} className="w-full min-h-10 px-3 py-2 rounded-lg text-sm font-medium text-[var(--bg-base)] bg-[var(--accent)] disabled:opacity-50">
          {t(status === 'sending' ? 'recoverySending' : 'recoveryResend')}
        </button>
        {status === 'accepted' ? <p role="status" className="text-sm text-[var(--text-secondary)]">{t('recoveryAccepted')}</p> : null}
        {status === 'error' ? <p role="alert" className="text-sm text-red-400">{t('recoveryError')}</p> : null}
      </form>
      <div className="flex flex-wrap justify-center gap-4 text-sm text-[var(--accent)]">
        <Link href="/login">{t('recoveryLogin')}</Link>
        <Link href="/forgot-password">{t('recoveryPassword')}</Link>
        <Link href="/register">{t('recoveryRegister')}</Link>
      </div>
    </div>
  );
}
