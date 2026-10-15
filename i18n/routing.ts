import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  alternateLinks: false, // Content-aware alternates are emitted by lib/seo.ts and the sitemap.
  localeCookie: {
    name: 'HATCHER_LOCALE',
    maxAge: 60 * 60 * 24 * 365,
    // Locale only. `next-intl` does not expose HttpOnly in this typed config,
    // so middleware hardens emitted Set-Cookie headers before returning.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
