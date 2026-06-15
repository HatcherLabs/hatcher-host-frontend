'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { usePathname as useRawPathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import {
  locales,
  localeLabels,
  type Locale,
} from '@/i18n/config';
import { buildLocaleUrl, stripLocalePrefix } from './localeUrls';

function LocaleFlag({ locale }: { locale: Locale }) {
  const className = 'h-3 w-[18px] shrink-0 overflow-hidden rounded-[2px] border border-white/20 shadow-[0_0_0_1px_rgba(0,0,0,0.18)]';

  switch (locale) {
    case 'en':
      return (
        <svg aria-hidden="true" viewBox="0 0 60 40" className={className}>
          <rect width="60" height="40" fill="#b22234" />
          {[4, 12, 20, 28, 36].map((y) => (
            <rect key={y} y={y} width="60" height="4" fill="#fff" />
          ))}
          <rect width="24" height="22" fill="#3c3b6e" />
          {Array.from({ length: 20 }).map((_, index) => (
            <circle
              key={index}
              cx={3 + (index % 5) * 4.4}
              cy={3 + Math.floor(index / 5) * 4.4}
              r="0.8"
              fill="#fff"
            />
          ))}
        </svg>
      );
    case 'zh':
      return (
        <svg aria-hidden="true" viewBox="0 0 60 40" className={className}>
          <rect width="60" height="40" fill="#de2910" />
          <polygon points="10,6 12,12 18,12 13,16 15,22 10,18 5,22 7,16 2,12 8,12" fill="#ffde00" />
          <polygon points="24,5 25.2,8 28.4,8.2 25.8,10.2 26.6,13.4 24,11.6 21.4,13.4 22.2,10.2 19.6,8.2 22.8,8" fill="#ffde00" />
          <polygon points="31,12 32,14.5 34.7,14.7 32.5,16.4 33.2,19 31,17.5 28.8,19 29.5,16.4 27.3,14.7 30,14.5" fill="#ffde00" />
          <polygon points="31,22 32,24.5 34.7,24.7 32.5,26.4 33.2,29 31,27.5 28.8,29 29.5,26.4 27.3,24.7 30,24.5" fill="#ffde00" />
          <polygon points="24,29 25.2,32 28.4,32.2 25.8,34.2 26.6,37.4 24,35.6 21.4,37.4 22.2,34.2 19.6,32.2 22.8,32" fill="#ffde00" />
        </svg>
      );
    case 'de':
      return (
        <svg aria-hidden="true" viewBox="0 0 60 40" className={className}>
          <rect width="60" height="13.34" fill="#000" />
          <rect y="13.33" width="60" height="13.34" fill="#dd0000" />
          <rect y="26.66" width="60" height="13.34" fill="#ffce00" />
        </svg>
      );
    case 'fr':
      return (
        <svg aria-hidden="true" viewBox="0 0 60 40" className={className}>
          <rect width="20" height="40" fill="#0055a4" />
          <rect x="20" width="20" height="40" fill="#fff" />
          <rect x="40" width="20" height="40" fill="#ef4135" />
        </svg>
      );
    case 'ro':
      return (
        <svg aria-hidden="true" viewBox="0 0 60 40" className={className}>
          <rect width="20" height="40" fill="#002b7f" />
          <rect x="20" width="20" height="40" fill="#fcd116" />
          <rect x="40" width="20" height="40" fill="#ce1126" />
        </svg>
      );
  }
}

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

interface LocaleSwitcherProps {
  align?: 'start' | 'end';
  side?: 'top' | 'bottom';
}

export function LocaleSwitcher({ align = 'end', side = 'bottom' }: LocaleSwitcherProps) {
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
        <LocaleFlag locale={locale} />
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
          className={`absolute min-w-[10rem] max-w-[calc(100vw-1rem)] rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] shadow-lg backdrop-blur-xl py-1 z-50 ${
            side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          } ${
            align === 'start' ? 'left-0' : 'right-0'
          }`}
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
                  <LocaleFlag locale={loc} />
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
