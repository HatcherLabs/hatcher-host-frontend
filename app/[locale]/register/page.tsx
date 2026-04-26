'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';
import { Check, X, Gift, Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/v3/AuthShell';

type FieldStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'invalid' }
  | { state: 'available' }
  | { state: 'taken' };

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  checks: { label: string; met: boolean }[];
}

function getPasswordStrength(pw: string, t: ReturnType<typeof useTranslations>): PasswordStrength {
  const checks = [
    { label: t('strengthChecks.length'), met: pw.length >= 8 },
    { label: t('strengthChecks.lowercase'), met: /[a-z]/.test(pw) },
    { label: t('strengthChecks.uppercase'), met: /[A-Z]/.test(pw) },
    { label: t('strengthChecks.number'), met: /[0-9]/.test(pw) },
    { label: t('strengthChecks.special'), met: /[^a-zA-Z0-9]/.test(pw) },
  ];
  const score = checks.filter((c) => c.met).length;
  const labels: Record<number, { label: string; color: string }> = {
    0: { label: '', color: 'transparent' },
    1: { label: t('strengthLabels.veryWeak'), color: '#ef4444' },
    2: { label: t('strengthLabels.weak'), color: 'var(--color-accent)' },
    3: { label: t('strengthLabels.fair'), color: '#eab308' },
    4: { label: t('strengthLabels.strong'), color: '#22c55e' },
    5: { label: t('strengthLabels.veryStrong'), color: '#10b981' },
  };
  const info = labels[score] ?? labels[0];
  return { score, label: info.label, color: info.color, checks };
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth.register');
  const { register, isAuthenticated, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<FieldStatus>({ state: 'idle' });
  const [usernameStatus, setUsernameStatus] = useState<FieldStatus>({ state: 'idle' });
  const didSubmit = useRef(false);
  const strength = useMemo(() => getPasswordStrength(password, t), [password, t]);

  // Debounced live availability check. Ignore stale responses by comparing
  // the value at request time vs current state when the response arrives.
  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed.length === 0) { setEmailStatus({ state: 'idle' }); return; }
    // eslint-disable-next-line no-useless-escape
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setEmailStatus({ state: 'invalid' }); return; }
    setEmailStatus({ state: 'checking' });
    const timer = setTimeout(() => {
      api.checkAvailability({ email: trimmed }).then((res) => {
        if (email.trim().toLowerCase() !== trimmed) return;
        if (!res.success || !res.data.email) { setEmailStatus({ state: 'idle' }); return; }
        if (!res.data.email.valid) setEmailStatus({ state: 'invalid' });
        else setEmailStatus({ state: res.data.email.taken ? 'taken' : 'available' });
      }).catch(() => setEmailStatus({ state: 'idle' }));
    }, 400);
    return () => clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    const trimmed = username.trim();
    if (trimmed.length === 0) { setUsernameStatus({ state: 'idle' }); return; }
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(trimmed)) { setUsernameStatus({ state: 'invalid' }); return; }
    setUsernameStatus({ state: 'checking' });
    const timer = setTimeout(() => {
      api.checkAvailability({ username: trimmed }).then((res) => {
        if (username.trim() !== trimmed) return;
        if (!res.success || !res.data.username) { setUsernameStatus({ state: 'idle' }); return; }
        if (!res.data.username.valid) setUsernameStatus({ state: 'invalid' });
        else setUsernameStatus({ state: res.data.username.taken ? 'taken' : 'available' });
      }).catch(() => setUsernameStatus({ state: 'idle' }));
    }, 400);
    return () => clearTimeout(timer);
  }, [username]);

  // Referral code from URL
  const refCode = searchParams.get('ref') || '';
  const [referrerUsername, setReferrerUsername] = useState<string | null>(null);

  useEffect(() => {
    if (refCode) {
      api.validateReferralCode(refCode).then((res) => {
        if (res.success && res.data.valid && res.data.referrerUsername) {
          setReferrerUsername(res.data.referrerUsername);
        }
      });
    }
  }, [refCode]);

  useEffect(() => {
    // Only auto-redirect if user was already logged in (not fresh registration)
    if (isAuthenticated && !didSubmit.current) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (emailStatus.state === 'taken') {
      setLocalError(t('errors.emailTaken'));
      return;
    }
    if (usernameStatus.state === 'taken') {
      setLocalError(t('errors.usernameTaken'));
      return;
    }
    if (password !== confirmPassword) {
      setLocalError(t('errors.passwordMismatch'));
      return;
    }
    if (password.length < 8) {
      setLocalError(t('errors.passwordTooShort'));
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setLocalError(t('errors.passwordComplexity'));
      return;
    }

    didSubmit.current = true;
    try {
      // Lowercase the email client-side so the same canonical form is sent
      // no matter how the user typed it. Server normalizes too, but doing
      // it here avoids confusing casing-related mismatches.
      await register(email.trim().toLowerCase(), username, password, refCode || undefined);
      track.register();
      router.push('/verify-email');
    } catch {
      // register() sets the context error which we display via `displayError`.
      // Stay on the form so the user can fix whatever the backend rejected.
      didSubmit.current = false;
    }
  };

  const submitBlocked =
    isLoading ||
    emailStatus.state === 'taken' ||
    emailStatus.state === 'invalid' ||
    usernameStatus.state === 'taken' ||
    usernameStatus.state === 'invalid';

  const displayError = localError || error;

  return (
    <AuthShell
      title={t('heading')}
      subtitle={t('subheading')}
      foot={
        <>
          {t('loginPrompt')}{' '}
          <Link href="/login" className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
            {t('loginLink')}
          </Link>
        </>
      }
    >
      {/* Referral badge */}
      {referrerUsername && (
            <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Gift size={14} className="text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-300">
                {t('referralBadge', { referrer: referrerUsername, credit: '$2' })}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                {t('emailLabel')}
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); setLocalError(null); }}
                  required
                  autoFocus
                  aria-invalid={emailStatus.state === 'taken' || emailStatus.state === 'invalid'}
                  className={`w-full h-10 pl-3 pr-9 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border focus:outline-none focus:ring-1 placeholder:text-[var(--text-muted)] transition-colors ${
                    emailStatus.state === 'taken' || emailStatus.state === 'invalid'
                      ? 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/30'
                      : emailStatus.state === 'available'
                      ? 'border-green-500/50 focus:border-green-500/60 focus:ring-green-500/30'
                      : 'border-[var(--border-default)] focus:border-cyan-500/50 focus:ring-cyan-500/30'
                  }`}
                  placeholder={t('emailPlaceholder')}
                />
                <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
                  {emailStatus.state === 'checking' && <Loader2 className="w-4 h-4 text-[var(--text-muted)] animate-spin" />}
                  {emailStatus.state === 'available' && <Check className="w-4 h-4 text-green-400" />}
                  {(emailStatus.state === 'taken' || emailStatus.state === 'invalid') && <X className="w-4 h-4 text-red-400" />}
                </div>
              </div>
              {emailStatus.state === 'taken' && (
                <p className="text-[10px] text-red-400 mt-1">
                  {t('emailTaken')}{' '}
                  <Link href="/login" className="underline hover:text-red-300">{t('emailTakenLink')}</Link>?
                </p>
              )}
              {emailStatus.state === 'invalid' && email.length > 3 && (
                <p className="text-[10px] text-red-400 mt-1">{t('emailInvalid')}</p>
              )}
            </div>

            <div>
              <label htmlFor="username" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                {t('usernameLabel')}
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); clearError(); setLocalError(null); }}
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="^[a-zA-Z0-9_-]+$"
                  aria-invalid={usernameStatus.state === 'taken' || usernameStatus.state === 'invalid'}
                  className={`w-full h-10 pl-3 pr-9 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border focus:outline-none focus:ring-1 placeholder:text-[var(--text-muted)] transition-colors ${
                    usernameStatus.state === 'taken' || usernameStatus.state === 'invalid'
                      ? 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/30'
                      : usernameStatus.state === 'available'
                      ? 'border-green-500/50 focus:border-green-500/60 focus:ring-green-500/30'
                      : 'border-[var(--border-default)] focus:border-cyan-500/50 focus:ring-cyan-500/30'
                  }`}
                  placeholder={t('usernamePlaceholder')}
                />
                <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
                  {usernameStatus.state === 'checking' && <Loader2 className="w-4 h-4 text-[var(--text-muted)] animate-spin" />}
                  {usernameStatus.state === 'available' && <Check className="w-4 h-4 text-green-400" />}
                  {(usernameStatus.state === 'taken' || usernameStatus.state === 'invalid') && <X className="w-4 h-4 text-red-400" />}
                </div>
              </div>
              {usernameStatus.state === 'taken' ? (
                <p className="text-[10px] text-red-400 mt-1">{t('usernameTaken')}</p>
              ) : usernameStatus.state === 'invalid' && username.length > 0 ? (
                <p className="text-[10px] text-red-400 mt-1">{t('usernameInvalid')}</p>
              ) : (
                <p className="text-[10px] text-[var(--text-muted)] mt-1">{t('usernameHint')}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                {t('passwordLabel')}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); setLocalError(null); }}
                required
                minLength={8}
                className="w-full h-10 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 placeholder:text-[var(--text-muted)] transition-colors"
                placeholder={t('passwordPlaceholder')}
              />

              {/* Password requirements — always visible as helper text */}
              <div className="mt-2 space-y-1.5">
                <p className="text-[10px] text-[var(--text-muted)]">{t('passwordHint')}</p>

                {/* Strength indicator — only when typing */}
                {password.length > 0 && (
                  <div className="space-y-2">
                    {/* Strength bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-all duration-300"
                            style={{
                              background: i <= strength.score ? strength.color : 'var(--border-default)',
                            }}
                          />
                        ))}
                      </div>
                      <span
                        className="text-[10px] font-medium min-w-[70px] text-right transition-colors duration-300"
                        style={{ color: strength.color }}
                      >
                        {strength.label}
                      </span>
                    </div>

                    {/* Checklist */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                      {strength.checks.map((check) => (
                        <div key={check.label} className="flex items-center gap-1.5">
                          {check.met ? (
                            <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                          ) : (
                            <X className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
                          )}
                          <span
                            className="text-[10px] transition-colors duration-200"
                            style={{ color: check.met ? '#86efac' : 'var(--text-muted)' }}
                          >
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                {t('confirmPasswordLabel')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setLocalError(null); }}
                required
                className="w-full h-10 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 placeholder:text-[var(--text-muted)] transition-colors"
                placeholder={t('confirmPasswordPlaceholder')}
              />
            </div>

            {displayError && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {displayError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitBlocked}
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
