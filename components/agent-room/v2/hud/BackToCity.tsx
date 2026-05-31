'use client';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { cityBuildingHref } from '@/components/city/v3/cityNavigation';

interface Props {
  agentId?: string;
}

type Target = { href: string; label: string };

/**
 * Smart back link in the HUD. Picks destination based on `?from=` URL
 * search param (set by the entry point — dashboard, agents grid, city
 * scene, chat-to-hatch). Falls back to `document.referrer` for hard
 * navigations, then defaults to City.
 *
 * Uses `@/i18n/routing` Link so locale prefixing stays correct under
 * any next-intl `localePrefix` setting.
 */
export function BackToCity({ agentId }: Props = {}) {
  const t = useTranslations('agentRoom.back');
  const dashboardHref = agentId ? `/dashboard/agent/${agentId}` : null;

  // Compute initial target on first render so there's no flicker
  // between "Back to City" and the real destination.
  const [target, setTarget] = useState<Target>(() => resolve(agentId, t));

  useEffect(() => {
    setTarget(resolve(agentId, t));
  }, [agentId, t]);

  return (
    <div
      className="fixed left-4 top-4 z-30 hidden items-center gap-2 md:flex"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      <Link
        href={target.href}
        className="rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)]/80 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-primary)] backdrop-blur transition hover:border-[var(--accent)] hover:bg-[rgba(74,222,128,0.06)] hover:text-[var(--accent)]"
      >
        ← {target.label}
      </Link>
      {dashboardHref && target.href !== dashboardHref && (
        <Link
          href={dashboardHref}
          className="rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-base)]/70 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)] backdrop-blur transition hover:border-[var(--accent)] hover:bg-[rgba(74,222,128,0.06)] hover:text-[var(--accent)]"
        >
          {t('toDashboard')}
        </Link>
      )}
    </div>
  );
}

function resolve(
  agentId: string | undefined,
  t: ReturnType<typeof useTranslations<'agentRoom.back'>>,
): Target {
  // SSR fallback — pure city link, gets corrected on client mount
  if (typeof window === 'undefined') {
    return { href: '/city', label: t('toCity') };
  }

  const params = new URLSearchParams(window.location.search);
  const from = params.get('from');

  if ((from === 'dashboard' || from === 'hatch') && agentId) {
    return { href: `/dashboard/agent/${agentId}`, label: t('toDashboard') };
  }
  if (from === 'agents') {
    return { href: '/dashboard/agents', label: t('toAgents') };
  }
  if (from === 'building' || from === 'house') {
    return { href: cityBuildingHref(), label: t('toBuilding') };
  }
  if (from === 'city') {
    return { href: '/city', label: t('toCity') };
  }

  // Fallback to referrer for hard navigations
  const ref = document.referrer;
  if (ref) {
    try {
      const url = new URL(ref);
      if (url.pathname.includes('/dashboard/agent/') && agentId) {
        return { href: `/dashboard/agent/${agentId}`, label: t('toDashboard') };
      }
      if (
        url.pathname.endsWith('/dashboard/agents') ||
        url.pathname.endsWith('/dashboard')
      ) {
        return { href: '/dashboard/agents', label: t('toAgents') };
      }
    } catch {
      // ignore malformed referrer
    }
  }

  return { href: '/city', label: t('toCity') };
}
