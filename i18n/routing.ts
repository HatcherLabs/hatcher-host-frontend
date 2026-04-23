import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeCookie: {
    name: 'HATCHER_LOCALE',
    maxAge: 60 * 60 * 24 * 365,
    // Security hardening (recon M-005, 2026-04-23): cookie carried no
    // sensitive data but was missing Secure+SameSite=strict, violating
    // general cookie hygiene. HttpOnly is intentionally false because
    // the LocaleSwitcher still needs to read/write it client-side.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
