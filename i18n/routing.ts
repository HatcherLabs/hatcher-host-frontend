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
    // Security hardening (recon M-005, 2026-04-23). Cookie has no auth
    // semantics (just a locale code like "en" / "zh"), but was missing
    // the Secure flag, which general cookie hygiene calls for. Lax is
    // sufficient — the cookie isn't consulted cross-origin. HttpOnly
    // intentionally false because LocaleSwitcher must read/write it
    // client-side on every locale change.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
