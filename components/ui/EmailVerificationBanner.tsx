'use client';

import { useState } from 'react';
import { X, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  if (!user || user.emailVerified || dismissed) return null;

  const handleResend = async () => {
    setResending(true);
    await api.resendVerification();
    setResending(false);
    setResent(true);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 text-sm bg-amber-500/10 border-b border-amber-500/20">
      <Mail className="w-4 h-4 text-amber-400 shrink-0" />
      <p className="flex-1 text-amber-200">
        Please verify your email.{' '}
        {resent ? (
          <span className="text-amber-400 font-medium">Verification email sent!</span>
        ) : (
          <>
            Check your inbox or{' '}
            <button
              onClick={handleResend}
              disabled={resending}
              className="underline underline-offset-2 text-amber-400 hover:text-amber-300 disabled:opacity-60 transition-colors"
            >
              {resending ? 'sending…' : 'resend verification email'}
            </button>
          </>
        )}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400/60 hover:text-amber-400 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
