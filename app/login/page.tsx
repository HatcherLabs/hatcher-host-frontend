'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { track } from '@/lib/analytics';
import { Zap, Layers, Rocket } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
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
    await login(email, password);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-stretch">
      {/* Left panel — value propositions (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 bg-[var(--bg-card)] border-r border-[var(--border-default)]">
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Hatcher</h2>
          <p className="text-sm text-[var(--text-muted)]">Managed AI agent hosting platform</p>
        </div>

        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center flex-shrink-0">
              <Rocket className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Deploy AI agents in 60 seconds</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">Pick a framework, configure your agent, and launch. No infrastructure to manage.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">4 frameworks, 20+ platforms</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">OpenClaw, Hermes, ElizaOS, and more. Connect to Telegram, Discord, WhatsApp, Slack, and others.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Free tier available</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">Start with a free agent. Bring your own LLM key for unlimited messages at no extra cost.</p>
            </div>
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
              Welcome back
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2">Sign in to your Hatcher account</p>
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
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                required
                autoFocus
                className="w-full h-10 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 placeholder:text-[var(--text-muted)] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
                required
                className="w-full h-10 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 placeholder:text-[var(--text-muted)] transition-colors"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-[var(--color-accent)] hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-secondary)] mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
