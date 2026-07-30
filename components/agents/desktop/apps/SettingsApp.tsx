'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import { getPathname } from '@/i18n/routing';
import type { Agent } from '@/lib/api';

export interface SettingsAppProps {
  agent: Agent;
}

/**
 * Full agent settings (singleton window): a same-origin iframe of the REAL
 * agent dashboard page, opened on the Config tab. The user reaches
 * Integrations / any other tab through the page's own sidebar inside the
 * iframe — that is the point: the desktop shows the actual settings surface,
 * not a mini-form copy (the old name/description form was deleted with this
 * rewrite).
 *
 * Framing works because the platform framing policy is SAMEORIGIN /
 * frame-ancestors 'self' (owner-approved, 2026-07-30): our own pages may
 * frame our own pages. Deliberately NO sandbox attribute — this is our own
 * authenticated page and needs full functionality (cookies, storage,
 * scripts, navigation); a sandbox would strip the login session. No
 * referrerPolicy either: the frame is same-origin, nothing leaks to third
 * parties.
 */
export function SettingsApp({ agent }: SettingsAppProps) {
  const t = useTranslations('desktop.settings');
  const locale = useLocale();
  // Locale-aware path, same builder the i18n <Link> uses under the hood —
  // with `localePrefix: 'as-needed'` the default locale gets no prefix and
  // every other locale gets `/<locale>/...`.
  const settingsPath = getPathname({
    locale,
    href: { pathname: `/dashboard/agent/${agent.id}`, query: { tab: 'config' } },
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
      <div className="flex flex-shrink-0 items-center justify-end border-b border-[var(--border-default)] px-3 py-1.5">
        <a
          href={settingsPath}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <ExternalLink size={12} aria-hidden /> {t('openFullPage')}
        </a>
      </div>
      <iframe
        src={settingsPath}
        title={t('iframeTitle')}
        className="min-h-0 w-full flex-1 border-0 bg-[var(--bg-elevated)]"
      />
    </div>
  );
}
