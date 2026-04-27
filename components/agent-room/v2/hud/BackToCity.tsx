'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

interface Props {
  agentId?: string;
}

/**
 * Smart back link in the HUD. Picks destination based on where the user
 * came from. Resolution order (most reliable first):
 *   1. URL search param `?from=dashboard` → Back to Dashboard
 *   2. URL search param `?from=city` → Back to City
 *   3. document.referrer (only set on hard navigations, not Next.js Link)
 *   4. Fallback → Back to City
 *
 * The legacy "Back to City" export name is preserved.
 */
export function BackToCity({ agentId }: Props = {}) {
  const locale = useLocale();
  const cityHref = locale === 'en' ? '/city' : `/${locale}/city`;
  const [target, setTarget] = useState<{ href: string; label: string }>({
    href: cityHref,
    label: 'Back to City',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const from = params.get('from');

    const base = locale === 'en' ? '' : `/${locale}`;

    if ((from === 'dashboard' || from === 'hatch') && agentId) {
      setTarget({ href: `${base}/dashboard/agent/${agentId}`, label: 'Back to Dashboard' });
      return;
    }
    if (from === 'agents') {
      setTarget({ href: `${base}/dashboard/agents`, label: 'Back to Agents' });
      return;
    }
    if (from === 'city') {
      setTarget({ href: cityHref, label: 'Back to City' });
      return;
    }

    // Fallback to referrer when explicit param is missing (covers hard nav)
    const ref = document.referrer;
    if (ref) {
      try {
        const url = new URL(ref);
        if (url.pathname.includes('/dashboard/agent/') && agentId) {
          setTarget({ href: `${base}/dashboard/agent/${agentId}`, label: 'Back to Dashboard' });
          return;
        }
        if (url.pathname.endsWith('/dashboard/agents') || url.pathname.endsWith('/dashboard')) {
          setTarget({ href: `${base}/dashboard/agents`, label: 'Back to Agents' });
          return;
        }
      } catch {
        // ignore malformed referrer
      }
    }
  }, [agentId, locale, cityHref]);

  return (
    <Link
      href={target.href}
      className="fixed top-4 left-4 z-30 rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)]/80 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-primary)] backdrop-blur transition hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[rgba(74,222,128,0.06)]"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      ← {target.label}
    </Link>
  );
}
