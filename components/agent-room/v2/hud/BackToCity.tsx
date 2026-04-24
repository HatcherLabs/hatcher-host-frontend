'use client';
import Link from 'next/link';
import { useLocale } from 'next-intl';

export function BackToCity() {
  const locale = useLocale();
  const href = locale === 'en' ? '/city' : `/${locale}/city`;
  return (
    <Link
      href={href}
      className="fixed top-4 left-4 z-30 rounded-lg border border-white/20 bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-black/70"
    >
      ← Back to City
    </Link>
  );
}
