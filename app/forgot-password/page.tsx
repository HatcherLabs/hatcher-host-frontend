'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
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
      setError(res.error ?? 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-2xl p-8 bg-[var(--bg-card)] border border-[var(--border-default)] backdrop-blur-xl shadow-lg"
      >
        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Check your email
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              If an account exists for <strong className="text-[var(--text-primary)]">{email}</strong>, we sent a password reset link. Check your inbox and spam folder.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-[var(--color-accent)] hover:underline"
            >
              <ArrowLeft size={14} />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-[var(--color-accent)]" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
                Forgot password?
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-2">
                Enter your email and we&apos;ll send you a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  required
                  autoFocus
                  className="w-full h-10 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 placeholder:text-[var(--text-muted)] transition-colors"
                  placeholder="you@example.com"
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
                className="w-full h-10 rounded-lg text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
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
        )}
      </div>
    </div>
  );
}
