import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AGENT_VIEW_MODE,
  EASY_AGENT_TABS,
  buildAgentNavigationTabs,
} from './navigationModel';

const labelFor = (id: string) => id;

describe('agent navigation model', () => {
  it('defaults the agent workspace to the simplified task-first mode', () => {
    expect(DEFAULT_AGENT_VIEW_MODE).toBe('easy');
  });

  it('keeps easy mode focused on primary operator tasks', () => {
    expect(EASY_AGENT_TABS).toEqual(['overview', 'chat', 'logs', 'integrations', 'wallet']);
  });

  it('keeps advanced-only tabs out of easy mode', () => {
    const easyTabs = buildAgentNavigationTabs('hermes', labelFor, 'easy').map((tab) => tab.id);

    expect(easyTabs).toContain('chat');
    expect(easyTabs).toContain('integrations');
    expect(easyTabs).not.toContain('terminal');
    expect(easyTabs).not.toContain('dev');
    expect(easyTabs).not.toContain('workflows');
  });
});
