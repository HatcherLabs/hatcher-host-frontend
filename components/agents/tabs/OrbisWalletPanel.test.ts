import { describe, expect, it } from 'vitest';

import {
  ORBIS_LAYOUT_COLUMN_CLASSNAME,
  ORBIS_LAYOUT_GRID_CLASSNAME,
  ORBIS_RESULT_PANEL_CLASSNAME,
  ORBIS_RESULT_PRE_CLASSNAME,
  ORBIS_SEARCH_GRID_CLASSNAME,
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

  it('keeps long Orbis results constrained inside the wallet panel', () => {
    expect(ORBIS_LAYOUT_GRID_CLASSNAME).toContain('min-w-0');
    expect(ORBIS_LAYOUT_GRID_CLASSNAME).toContain('minmax(0,0.9fr)');
    expect(ORBIS_LAYOUT_GRID_CLASSNAME).toContain('minmax(0,1.1fr)');
    expect(ORBIS_LAYOUT_COLUMN_CLASSNAME).toContain('min-w-0');
    expect(ORBIS_SEARCH_GRID_CLASSNAME).toContain('min-w-0');
    expect(ORBIS_SEARCH_GRID_CLASSNAME).toContain('minmax(0,1fr)');
    expect(ORBIS_SEARCH_GRID_CLASSNAME).toContain('minmax(0,0.8fr)');
    expect(ORBIS_SEARCH_GRID_CLASSNAME).toContain('minmax(0,0.4fr)');
    expect(ORBIS_RESULT_PANEL_CLASSNAME).toContain('min-w-0');
    expect(ORBIS_RESULT_PANEL_CLASSNAME).toContain('overflow-hidden');
    expect(ORBIS_RESULT_PRE_CLASSNAME).toContain('max-w-full');
    expect(ORBIS_RESULT_PRE_CLASSNAME).toContain('whitespace-pre-wrap');
    expect(ORBIS_RESULT_PRE_CLASSNAME).toContain('break-words');
  });
});
