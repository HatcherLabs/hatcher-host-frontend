import { describe, expect, it } from 'vitest';
import type { Agent } from '@/lib/api';
import {
  automationMatches,
  normalizeFrameworkSchedules,
  normalizeIronClawAutomations,
  webhookAutomation,
} from '@/lib/automation-center';

const agent = {
  id: 'agent-1',
  name: 'Research Agent',
  description: null,
  avatarUrl: null,
  status: 'active',
  framework: 'openclaw',
  createdAt: '2026-08-01T00:00:00.000Z',
} as Agent;

describe('automation center normalization', () => {
  it('normalizes schedule responses and preserves status and run timestamps', () => {
    const items = normalizeFrameworkSchedules(agent, {
      jobs: [{
        id: 'morning',
        name: 'Morning brief',
        schedule: '0 8 * * *',
        prompt: 'Summarize the market.',
        status: 'paused',
        nextRun: '2026-08-26T08:00:00.000Z',
      }],
    });

    expect(items).toEqual([
      expect.objectContaining({
        id: 'morning',
        name: 'Morning brief',
        agentName: 'Research Agent',
        status: 'paused',
        triggerLabel: '0 8 * * *',
        nextRun: '2026-08-26T08:00:00.000Z',
      }),
    ]);
  });

  it('normalizes IronClaw state and schedule fields', () => {
    const items = normalizeIronClawAutomations(
      { ...agent, framework: 'ironclaw' },
      { automations: [{ automation_id: 'auto-1', display_name: 'Audit', state: 'failed', source: { cron: '0 * * * *' } }] },
    );

    expect(items[0]).toEqual(expect.objectContaining({
      id: 'auto-1',
      kind: 'ironclaw',
      status: 'attention',
      triggerLabel: '0 * * * *',
    }));
  });

  it('marks unprovisioned webhook triggers as needing attention and filters them', () => {
    const webhook = webhookAutomation(agent, { url: 'https://api.hatcher.test/hook', tokenConfigured: false });
    expect(webhook?.status).toBe('attention');
    expect(webhook && automationMatches(webhook, 'external', 'attention', 'webhook', 'agent-1')).toBe(true);
    expect(webhook && automationMatches(webhook, '', 'active', 'all', '')).toBe(false);
  });
});
