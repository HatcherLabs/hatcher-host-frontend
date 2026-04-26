'use client';

import { useState, useEffect, useRef } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { track } from '@/lib/analytics';
import { AuthShell } from '@/components/auth/v3/AuthShell';

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations('auth.login');
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const didSubmit = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (didSubmit.current) track.login();
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    didSubmit.current = true;
    // Normalize client-side too — the server already lowercases, but
    // doing it here keeps the address shown in the input consistent
    // after a failed submit and prevents the "Invalid email" server
    // error from firing on obvious whitespace.
    await login(email.trim().toLowerCase(), password);
  };

  return (
    <AuthShell
      title={t('heading')}
      subtitle={t('subheading')}
      foot={
        <>
          {t('registerPrompt')}{' '}
          <Link href="/register" className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
            {t('registerLink')}
          </Link>
        </>
      }
    >
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
            onChange={(e) => { setEmail(e.target.value); clearError(); }}
            required
            autoFocus
            className="w-full h-10 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-[var(--accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30 placeholder:text-[var(--text-muted)] transition-colors"
            placeholder={t('emailPlaceholder')}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            {t('passwordLabel')}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError(); }}
            required
            className="w-full h-10 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-[var(--accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30 placeholder:text-[var(--text-muted)] transition-colors"
            placeholder={t('passwordPlaceholder')}
          />
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-[var(--color-accent)] hover:underline">
            {t('forgotLink')}
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 rounded-lg text-sm font-medium text-[var(--bg-base)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
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
