import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CityOperationsSummary } from '@/lib/api/types';
import { CityOperationsPanel } from '@/components/city/v3/CityOperationsPanel';
import { cityOperationsAttentionTotal } from '@/lib/city-operations';

const summary: CityOperationsSummary = {
  agents: {
    total: 3,
    running: 2,
    sleeping: 0,
    paused: 0,
    crashed: 1,
    needsAttention: 1,
    items: [],
  },
  tasks: {
    total: 8,
    active: 2,
    awaitingApproval: 1,
    failed: 2,
    completed: 3,
    pendingApprovals: 1,
  },
  incidents: { unreadCount: 2, items: [] },
  delegations: [],
  generatedAt: '2026-07-11T12:00:00.000Z',
};

describe('city operations helpers', () => {
  it('combines only actionable counters', () => {
    expect(cityOperationsAttentionTotal(summary)).toBe(6);
  });

  it('renders mission attention instead of claiming there are no alerts', () => {
    const taskOnlySummary = {
      ...summary,
      agents: { ...summary.agents, needsAttention: 0, items: [] },
      incidents: { unreadCount: 0, items: [] },
    };
    const html = renderToStaticMarkup(createElement(CityOperationsPanel, {
      summary: taskOnlySummary,
    }));

    expect(html).toContain('Mission approvals');
    expect(html).toContain('1 waiting');
    expect(html).toContain('Failed missions');
    expect(html).toContain('2 failed');
    expect(html).not.toContain('No operational alerts');
  });

  it('keeps last-good data visible while marking a failed refresh stale', () => {
    const html = renderToStaticMarkup(createElement(CityOperationsPanel, {
      summary,
      error: true,
    }));

    expect(html).toContain('stale');
    expect(html).toContain('Refresh unavailable; last good');
  });

  it('renders an explicit degraded state when no snapshot is available', () => {
    const html = renderToStaticMarkup(createElement(CityOperationsPanel, {
      summary: null,
      error: true,
    }));

    expect(html).toContain('degraded');
    expect(html).toContain('Live operations refresh unavailable');
  });
});
