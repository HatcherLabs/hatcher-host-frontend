/* eslint-disable @next/next/no-html-link-for-pages */
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          background: '#0a0a0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
            <div style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '1rem',
              background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(249,115,22,0.1))',
              border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 2rem',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>

            <h1 style={{ color: '#f4f4f5', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#a1a1aa', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              A critical error occurred. Please try again or contact support if the problem persists.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => reset()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(to right, #9333ea, #a855f7)',
                  color: 'white',
                  fontWeight: 500,
                  padding: '0.625rem 1.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
              <a
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#a1a1aa',
                  fontWeight: 500,
                  padding: '0.625rem 1.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                Go Home
              </a>
            </div>

            {error.digest && (
              <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#71717a' }}>
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
