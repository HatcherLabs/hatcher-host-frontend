import { isLocale } from '@/i18n/config';

export function buildMedusaAgentReturnPath(agentId: string): string {
  const query = new URLSearchParams({
    tab: 'wallet',
    walletSection: 'providers',
    walletProvider: 'medusa',
    medusaCallback: '1',
  });
  return `/dashboard/agent/${encodeURIComponent(agentId)}?${query.toString()}`;
}

export function buildMedusaCallbackUrl(origin: string, pathname?: string): string {
  const base = origin.replace(/\/$/, '');
  const firstSegment = pathname?.split('/').filter(Boolean)[0];
  const localePrefix = isLocale(firstSegment) ? `/${firstSegment}` : '';
  return `${base}${localePrefix}/medusa/callback`;
}
