'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { usePathname as useRawPathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import {
  locales,
  localeLabels,
  localeFlags,
  defaultLocale,
  type Locale,
} from '@/i18n/config';

// Paths outside the [locale] segment — no localized version exists.
// Keep in sync with NON_LOCALE_PREFIXES in middleware.ts.
const NON_LOCALE_PREFIXES = [
  '/admin',
  '/privacy',
  '/terms',
  '/impressum',
  '/cookies',
  '/og',
  '/skill',
  '/.well-known',
];

function isNonLocalePath(rawPath: string): boolean {
  return NON_LOCALE_PREFIXES.some(
    (p) => rawPath === p || rawPath.startsWith(p + '/'),
  );
}

function stripLocalePrefix(raw: string, currentLocale: Locale): string {
  const prefix = `/${currentLocale}`;
  if (raw === prefix) return '/';
  if (raw.startsWith(prefix + '/')) return raw.slice(prefix.length);
  return raw;
}

function buildLocaleUrl(cleanPath: string, targetLocale: Locale): string {
  // localePrefix: 'as-needed' — the default locale has no URL prefix.
  const prefix = targetLocale === defaultLocale ? '' : `/${targetLocale}`;
  const path = cleanPath === '/' ? '' : cleanPath;
  return prefix + path || '/';
}

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const rawPathname = useRawPathname();
  const t = useTranslations('localeSwitcher');
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function onPick(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    const cleanPath = isNonLocalePath(rawPathname)
      ? '/'
      : stripLocalePrefix(rawPathname, locale);
    const target = buildLocaleUrl(cleanPath, next);
    // Set cookie so the middleware picks up the preference on the new
    // request. Add `Secure` in production so the cookie never rides over
    // plain HTTP (recon M-005, 2026-04-23). HttpOnly is intentionally
    // NOT set — this component needs to read and write it from JS.
    const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `HATCHER_LOCALE=${next}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${secureFlag}`;
    // Full page navigation — forces Next.js to re-render every layout with the
    // new locale (including NextIntlClientProvider). SPA navigation via
    // router.replace doesn't reliably re-run [locale]/layout.tsx, leaving the
    // Header/Footer stuck on the previous language's strings.
    setPending(true);
    window.location.assign(target);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-label={t('label')}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50 transition-colors"
      >
        <span aria-hidden="true" className="text-base leading-none">
          {localeFlags[locale]}
        </span>
        <span className="hidden sm:inline">{localeLabels[locale]}</span>
        <ChevronDown
          size={12}
          className={`opacity-60 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t('label')}
          className="absolute right-0 top-full mt-1 min-w-[10rem] rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-lg backdrop-blur-xl py-1 z-50"
        >
          {locales.map((loc) => {
            const active = loc === locale;
            return (
              <li key={loc}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => onPick(loc)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                    active
                      ? 'bg-[var(--color-accent)]/15 text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span aria-hidden="true" className="text-base leading-none">
                    {localeFlags[loc]}
                  </span>
                  <span className="flex-1">{localeLabels[loc]}</span>
                  {active && (
                    <span aria-hidden="true" className="text-[var(--color-accent)]">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
