import { describe, expect, it } from 'vitest';

import {
  buildOrbisCallRequest,
  buildOrbisSettingsPayload,
  formatOrbisPrice,
} from './OrbisWalletPanel';

describe('Orbis wallet panel helpers', () => {
  it('normalizes per-agent settings before saving', () => {
    expect(buildOrbisSettingsPayload({
      enabled: true,
      dailyBudgetUsd: ' 2.50 ',
      maxPerCallUsd: '0.075',
      allowedApiSlugs: ' crypto-spot-price-api-24173b\nweather-alerts-api-1c9f02\ncrypto-spot-price-api-24173b ',
    })).toEqual({
      enabled: true,
      dailyBudgetUsd: 2.5,
      maxPerCallUsd: 0.075,
      allowedApiSlugs: ['crypto-spot-price-api-24173b', 'weather-alerts-api-1c9f02'],
    });
  });

  it('builds a typed Orbis call request from form fields', () => {
    expect(buildOrbisCallRequest({
      apiSlug: ' crypto-spot-price-api-24173b ',
      endpointUrl: '',
      path: '/price',
      method: 'POST',
      queryJson: '{"symbol":"ETH"}',
      bodyJson: '{"currency":"USD"}',
      headersJson: '{"X-Test":"1"}',
      workflowId: ' workflow-123 ',
      maxCostUsd: '0.05',
    })).toEqual({
      apiSlug: 'crypto-spot-price-api-24173b',
      path: '/price',
      method: 'POST',
      query: { symbol: 'ETH' },
      body: { currency: 'USD' },
      headers: { 'X-Test': '1' },
      workflowId: 'workflow-123',
      maxCostUsd: 0.05,
    });
  });

  it('rejects malformed JSON before calling the API', () => {
    expect(() => buildOrbisCallRequest({
      apiSlug: 'weather-alerts-api-1c9f02',
      endpointUrl: '',
      path: '/alerts',
      method: 'GET',
      queryJson: '{bad',
      bodyJson: '',
      headersJson: '',
      workflowId: '',
      maxCostUsd: '',
    })).toThrow('Query JSON must be valid JSON');
  });

  it('formats marketplace prices with enough precision for small paid calls', () => {
    expect(formatOrbisPrice(0.005)).toBe('$0.005');
    expect(formatOrbisPrice(null)).toBe('-');
  });
});
