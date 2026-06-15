'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
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
        className="inline-flex items-center gap-2 rounded-full border border-[#d6b177]/35 bg-[rgba(21,16,11,0.76)] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#f6ead8] shadow-[0_12px_30px_rgba(10,7,4,0.22)] backdrop-blur transition hover:border-[#f3d296]/80 hover:bg-[rgba(31,24,15,0.9)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {target.label}
      </Link>
      {dashboardHref && target.href !== dashboardHref && (
        <Link
          href={dashboardHref}
          className="inline-flex items-center gap-2 rounded-full border border-[#d6b177]/22 bg-[rgba(21,16,11,0.58)] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#d8c2a0] shadow-[0_12px_30px_rgba(10,7,4,0.18)] backdrop-blur transition hover:border-[#f3d296]/70 hover:bg-[rgba(31,24,15,0.86)] hover:text-[#f6ead8]"
        >
          <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
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
