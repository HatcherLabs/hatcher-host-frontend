import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { AgentResourceStripView } from '../components/agents/AgentResourceStrip';
import { storageLevel, type AgentResources } from '../lib/agent-resources';
import messages from '../messages/en.json';

const gib = 1024 ** 3;
const data: AgentResources = {
  status: 'active', cpu: { usedCores: 3.5, limitCores: 7, percent: 50 },
  memory: { usedMb: 512, limitMb: 10752 },
  storage: { usedBytes: 41 * gib, limitBytes: 50 * gib, availableBytes: 9 * gib, measuredAt: '2026-11-05T12:00:00Z', scope: 'runtime', supported: true },
  sampledAt: '2026-11-05T12:00:00Z',
};
function render(value: AgentResources | null, status = 'active', failed = false) {
  return renderToStaticMarkup(createElement(NextIntlClientProvider, { locale: 'en', messages, timeZone: 'UTC',
    children: createElement(AgentResourceStripView, { data: value, status, failed }) }));
}
describe('agent resource strip', () => {
  it('shows allocated CPU, effective storage and remaining capacity', () => {
    const html = render(data);
    expect(html).toContain('50.0%');
    expect(html).toContain('3.50 / 7 vCPU');
    expect(html).toContain('41 GiB / 50 GiB');
    expect(html).toContain('9 GiB available');
    expect(html).toContain('Storage above 80%');
    expect(html).toContain('Backup storage is separate');
  });
  it('retains storage but hides live CPU when stopped or refresh failed', () => {
    for (const html of [render(data, 'paused'), render(data, 'active', true)]) {
      expect(html).not.toContain('50.0%');
      expect(html).toContain('41 GiB / 50 GiB');
    }
  });
  it('does not invent free space before the first measurement', () => {
    expect(render(null)).not.toContain('0 GiB');
    expect(storageLevel({ ...data.storage, usedBytes: null })).toBe('unknown');
  });
  it('uses warning and full thresholds without hiding overshoot', () => {
    expect(storageLevel({ ...data.storage, usedBytes: 39 * gib })).toBe('normal');
    expect(storageLevel({ ...data.storage, usedBytes: 40 * gib })).toBe('warning');
    expect(storageLevel({ ...data.storage, usedBytes: 51 * gib })).toBe('full');
  });
});
