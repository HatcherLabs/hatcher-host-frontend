import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' && process.env.NEXT_RUNTIME !== 'edge') {
    return;
  }

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
}

export const onRequestError = Sentry.captureRequestError;
