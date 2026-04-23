'use client';

import { useState, useEffect, useRef } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations('auth.login');
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<{ totalUsers: number; totalAgents: number; activeAgents: number } | null>(null);
  const didSubmit = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (didSubmit.current) track.login();
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    api.getPlatformStats().then((res) => {
      if (res.success) setStats({ totalUsers: res.data.totalUsers, totalAgents: res.data.totalAgents, activeAgents: res.data.activeAgents });
    }).catch(() => { /* silent — stats are decorative */ });
  }, []);

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
    <div className="min-h-[calc(100vh-3.5rem)] flex items-stretch">
      {/* Left panel — editorial proof (hidden on mobile). Replaces the
          3-icon-card pattern with a punchline + live platform stats pulled
          from /stats — real numbers beat generic value props. */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between px-16 py-16 bg-[var(--bg-card)] border-r border-[var(--border-default)]">
        <div>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('panelTagline')}</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] text-[var(--text-primary)] max-w-md" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
            {t('panelHeadlinePrefix')}{' '}<span className="text-[var(--color-accent)]">{t('panelHeadlineAccent')}</span>
          </h2>
          <p className="mt-5 text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-md">
            {t('panelBody')}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8 pt-8 border-t border-[var(--border-default)] max-w-md">
          <div>
            <p className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tabular-nums">
              {stats ? stats.totalUsers.toLocaleString() : '—'}
            </p>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)] mt-1">{t('statsUsers')}</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tabular-nums">
              {stats ? stats.totalAgents.toLocaleString() : '—'}
            </p>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)] mt-1">{t('statsAgents')}</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tabular-nums flex items-baseline gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse self-center" />
              {stats ? stats.activeAgents.toLocaleString() : '—'}
            </p>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)] mt-1">{t('statsOnline')}</p>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div
          className="w-full max-w-sm rounded-2xl p-8 bg-[var(--bg-card)] border border-[var(--border-default)] backdrop-blur-xl shadow-lg"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {t('heading')}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2">{t('subheading')}</p>
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
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                required
                autoFocus
                className="w-full h-10 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 placeholder:text-[var(--text-muted)] transition-colors"
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
                className="w-full h-10 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 placeholder:text-[var(--text-muted)] transition-colors"
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
              className="w-full h-10 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('submitLoading')}
                </>
              ) : (
                t('submit')
              )}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-secondary)] mt-6">
            {t('registerPrompt')}{' '}
            <Link href="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              {t('registerLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
