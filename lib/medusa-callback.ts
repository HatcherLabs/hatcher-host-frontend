import { isLocale } from '@/i18n/config';

export interface MedusaCallbackState {
  agentId: string;
  campaignId?: string;
  claimWallet?: string;
  createdAt?: number;
}

function base64ToBase64Url(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBase64(value: string): string {
  return value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
}

function utf8ToBase64(value: string): string {
  if (typeof btoa === 'function' && typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64');
  }
  throw new Error('Base64 encoding is not available in this runtime.');
}

function base64ToUtf8(value: string): string {
  if (typeof atob === 'function' && typeof TextDecoder !== 'undefined') {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('utf8');
  }
  throw new Error('Base64 decoding is not available in this runtime.');
}

function toBase64Url(value: string): string {
  return base64ToBase64Url(utf8ToBase64(value));
}

function fromBase64Url(value: string): string {
  return base64ToUtf8(base64UrlToBase64(value));
}

export function encodeMedusaCallbackState(input: Omit<MedusaCallbackState, 'createdAt'> & { createdAt?: number }): string {
  return toBase64Url(JSON.stringify({
    agentId: input.agentId,
    campaignId: input.campaignId,
    claimWallet: input.claimWallet,
    createdAt: input.createdAt ?? Date.now(),
  }));
}

export function decodeMedusaCallbackState(value: string | null | undefined): MedusaCallbackState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(value)) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.agentId !== 'string' || !record.agentId.trim()) return null;
    return {
      agentId: record.agentId.trim(),
      ...(typeof record.campaignId === 'string' && record.campaignId.trim() ? { campaignId: record.campaignId.trim() } : {}),
      ...(typeof record.claimWallet === 'string' && record.claimWallet.trim() ? { claimWallet: record.claimWallet.trim() } : {}),
      ...(typeof record.createdAt === 'number' && Number.isFinite(record.createdAt) ? { createdAt: record.createdAt } : {}),
    };
  } catch {
    return null;
  }
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
