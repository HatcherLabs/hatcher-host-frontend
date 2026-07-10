import { describe, expect, it } from 'vitest';

import {
  buildMedusaAgentReturnPath,
  buildMedusaCallbackUrl,
  MEDUSA_PASSPORT_URL_REQUIRED,
  medusaPassportHandoffError,
} from '@/lib/medusa-callback';

describe('medusa callback helpers', () => {
  it('builds a return path that opens the Medusa provider panel', () => {
    expect(buildMedusaAgentReturnPath('agent-1')).toBe(
      '/dashboard/agent/agent-1?tab=wallet&walletSection=providers&walletProvider=medusa&medusaCallback=1',
    );
  });

  it('builds a locale-aware callback URL for Medusa partner deep links', () => {
    expect(buildMedusaCallbackUrl('https://hatcher.host', '/fr/dashboard/agent/agent-1')).toBe(
      'https://hatcher.host/fr/medusa/callback',
    );
    expect(buildMedusaCallbackUrl('https://hatcher.host/', '/dashboard/agent/agent-1')).toBe(
      'https://hatcher.host/medusa/callback',
    );
  });

  it('requires the supported passportUrl callback contract', () => {
    expect(medusaPassportHandoffError('https://www.zkmedusa.com/partners/hatcher/passport/123'))
      .toBeNull();
    expect(medusaPassportHandoffError(null)).toBe(MEDUSA_PASSPORT_URL_REQUIRED);
    expect(MEDUSA_PASSPORT_URL_REQUIRED).toContain('passportUrl callbacks only');
  });
});
