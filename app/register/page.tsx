'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Check, X, Gift } from 'lucide-react';

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  checks: { label: string; met: boolean }[];
}

function getPasswordStrength(pw: string): PasswordStrength {
  const checks = [
    { label: '8+ characters', met: pw.length >= 8 },
    { label: 'Lowercase letter', met: /[a-z]/.test(pw) },
    { label: 'Uppercase letter', met: /[A-Z]/.test(pw) },
    { label: 'Number', met: /[0-9]/.test(pw) },
    { label: 'Special character', met: /[^a-zA-Z0-9]/.test(pw) },
  ];
  const score = checks.filter((c) => c.met).length;
  const labels: Record<number, { label: string; color: string }> = {
    0: { label: '', color: 'transparent' },
    1: { label: 'Very weak', color: '#ef4444' },
    2: { label: 'Weak', color: '#06b6d4' },
    3: { label: 'Fair', color: '#eab308' },
    4: { label: 'Strong', color: '#22c55e' },
    5: { label: 'Very strong', color: '#10b981' },
  };
  const info = labels[score] ?? labels[0];
  return { score, label: info.label, color: info.color, checks };
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, isAuthenticated, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const strength = useMemo(() => getPasswordStrength(password), [password]);

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
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setLocalError('Password must contain uppercase, lowercase, and a number');
      return;
    }

    await register(email, username, password, refCode || undefined);
  };

  const displayError = localError || error;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: 'rgba(13, 11, 26, 0.8)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(46, 43, 74, 0.4)',
        }}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Create account
          </h1>
          <p className="text-sm text-[#A5A1C2] mt-2">Get started with Hatcher</p>
        </div>

        {/* Referral badge */}
        {referrerUsername && (
          <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Gift size={14} className="text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-300">
              Referred by <span className="font-semibold">{referrerUsername}</span> — you both get <span className="font-semibold">$2 credit</span>!
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-[#A5A1C2] mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError(); setLocalError(null); }}
              required
              autoFocus
              className="w-full h-10 px-3 rounded-lg text-sm text-white bg-white/[0.04] border border-white/[0.08] focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 placeholder:text-[#71717a] transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-xs font-medium text-[#A5A1C2] mb-1.5">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); clearError(); setLocalError(null); }}
              required
              minLength={3}
              maxLength={30}
              pattern="^[a-zA-Z0-9_-]+$"
              className="w-full h-10 px-3 rounded-lg text-sm text-white bg-white/[0.04] border border-white/[0.08] focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 placeholder:text-[#71717a] transition-colors"
              placeholder="cooluser123"
            />
            <p className="text-[10px] text-[#71717a] mt-1">Letters, numbers, hyphens and underscores only</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-[#A5A1C2] mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError(); setLocalError(null); }}
              required
              minLength={8}
              className="w-full h-10 px-3 rounded-lg text-sm text-white bg-white/[0.04] border border-white/[0.08] focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 placeholder:text-[#71717a] transition-colors"
              placeholder="Min. 8 chars, uppercase, lowercase, number"
            />

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="mt-2.5 space-y-2">
                {/* Strength bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.06)',
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
                        <X className="w-3 h-3 text-[#71717a] flex-shrink-0" />
                      )}
                      <span
                        className="text-[10px] transition-colors duration-200"
                        style={{ color: check.met ? '#86efac' : '#71717a' }}
                      >
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-medium text-[#A5A1C2] mb-1.5">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setLocalError(null); }}
              required
              className="w-full h-10 px-3 rounded-lg text-sm text-white bg-white/[0.04] border border-white/[0.08] focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 placeholder:text-[#71717a] transition-colors"
              placeholder="Repeat your password"
            />
          </div>

          {displayError && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {displayError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 rounded-lg text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-[#A5A1C2] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
