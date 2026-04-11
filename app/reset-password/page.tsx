'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Lock, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Invalid Reset Link
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          This reset link is missing or invalid. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-accent)] hover:underline"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Password Reset
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-lg text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
        >
          Sign In
        </Link>
      </div>
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
      setError(res.error ?? 'Reset failed. The link may have expired.');
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-[var(--color-accent)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
          Set new password
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          Enter your new password below
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            New Password
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
            className="w-full h-10 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 placeholder:text-[var(--text-muted)] transition-colors"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Confirm Password
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
                : 'border-[var(--border-default)] focus:border-cyan-500/50 focus:ring-cyan-500/30'
            }`}
            placeholder="Repeat your password"
          />
          {confirm && !passwordsMatch && (
            <p className="text-[10px] text-red-400 mt-1">Passwords do not match</p>
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
          className="w-full h-10 rounded-lg text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Resetting...
            </>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>

      <p className="text-center text-xs text-[var(--text-secondary)] mt-6">
        <Link href="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1">
          <ArrowLeft size={12} />
          Back to sign in
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-2xl p-8 bg-[var(--bg-card)] border border-[var(--border-default)] backdrop-blur-xl shadow-lg"
      >
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--color-accent)]/30 border-t-[var(--color-accent)] rounded-full animate-spin" />
          </div>
        }>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
