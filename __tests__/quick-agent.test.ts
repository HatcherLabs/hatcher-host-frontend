import { describe, expect, it } from 'vitest';
import { AGENT_RUNTIMES, buildQuickAgent, simpleAgentHref } from '@/lib/agent-starters';
import { buildAgentNavigationTabs } from '@/components/agents/navigationModel';

describe('managed agent quick creation', () => {
  it.each(AGENT_RUNTIMES)('builds a managed %s agent without granting integrations or trading permissions', framework => {
    const payload = buildQuickAgent({ name: ' My agent ', instructions: ' Review my work. ', framework, starter: 'coder', model: 'test/model' });
    expect(payload.framework).toBe(framework);
    expect(payload.name).toBe('My agent');
    expect(payload.config).toEqual({ systemPrompt: 'Review my work.', model: 'test/model', provider: 'openrouter' });
    expect(payload).not.toHaveProperty('assistantId');
  });
  it('rejects invalid names and empty instructions before making an API request', () => {
    const input = { name: 'Example', instructions: 'A task', framework: 'hermes' as const, starter: 'personal', model: '' };
    expect(() => buildQuickAgent({ ...input, name: '<bad>' })).toThrow('name');
    expect(() => buildQuickAgent({ ...input, instructions: '   ' })).toThrow('instructions');
  });
  it('opens actual agent chat and settings in easy mode', () => {
    expect(simpleAgentHref('owned-agent')).toBe('/agents/owned-agent?tab=chat&view=easy');
    expect(simpleAgentHref('owned-agent', 'config')).toBe('/agents/owned-agent?tab=config&view=easy');
    for (const framework of AGENT_RUNTIMES) {
      const tabs = buildAgentNavigationTabs(framework, id => id, 'easy').map(tab => tab.id);
      expect(tabs).toContain('chat'); expect(tabs).toContain('config'); expect(tabs).toContain('plugins');
      expect(tabs).not.toContain('terminal');
    }
  });
});
