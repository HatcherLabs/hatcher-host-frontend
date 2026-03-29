'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    api.verifyEmail(token).then((res) => {
      if (res.success) {
        setStatus('success');
        setMessage(res.data.message || 'Your email has been verified.');
      } else {
        setStatus('error');
        setMessage(res.error || 'Verification failed. The link may have expired.');
      }
    });
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{
          background: 'rgba(13, 11, 26, 0.8)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(46, 43, 74, 0.4)',
        }}
      >
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-400 animate-spin" />
            <h1 className="text-xl font-semibold text-white mb-2">Verifying your email…</h1>
            <p className="text-sm text-[#A5A1C2]">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
            <h1 className="text-xl font-semibold text-white mb-2">Email verified!</h1>
            <p className="text-sm text-[#A5A1C2] mb-6">{message}</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center h-10 px-6 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors"
            >
              Go to Dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h1 className="text-xl font-semibold text-white mb-2">Verification failed</h1>
            <p className="text-sm text-[#A5A1C2] mb-6">{message}</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center h-10 px-6 rounded-lg text-sm font-medium text-white bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] transition-colors"
            >
              Back to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
