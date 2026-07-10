import { isLocale } from '@/i18n/config';

export const MEDUSA_PASSPORT_URL_REQUIRED =
  'Medusa did not include a supported passport handoff URL. Hatcher accepts passportUrl callbacks only.';

export function medusaPassportHandoffError(
  passportUrl: string | null | undefined,
): string | null {
  return passportUrl?.trim() ? null : MEDUSA_PASSPORT_URL_REQUIRED;
}

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
