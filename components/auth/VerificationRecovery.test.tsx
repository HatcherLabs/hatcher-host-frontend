import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import messages from '@/messages/en.json';
import { VerificationRecovery } from './VerificationRecovery';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: keyof typeof messages.auth.verifyEmail) => messages.auth.verifyEmail[key],
}));
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/api', () => ({ api: { resendVerification: vi.fn() } }));

describe('VerificationRecovery', () => {
  it('offers resend, login and password recovery without claiming delivery', () => {
    const html = renderToStaticMarkup(<VerificationRecovery />);
    expect(html).toContain('Resend verification email');
    expect(html).toContain('type="email"');
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/forgot-password"');
    expect(html).not.toContain('We sent');
  });

  it('uses conditional copy for both registration and resend acceptance', () => {
    expect(messages.auth.verifyEmail.requestBody).toContain('If a new account was created');
    expect(messages.auth.verifyEmail.requestBody).toContain('already signed up');
    expect(messages.auth.verifyEmail.recoveryAccepted).toContain('If this email belongs to an unverified account');
  });
});
