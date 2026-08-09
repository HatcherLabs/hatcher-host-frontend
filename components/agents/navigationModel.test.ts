import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AGENT_VIEW_MODE,
  EASY_AGENT_TABS,
  buildAgentNavigationTabs,
  resolveAgentViewMode,
} from './navigationModel';

const labelFor = (id: string) => id;

describe('agent navigation model', () => {
  it('defaults the agent workspace to advanced mode', () => {
    expect(DEFAULT_AGENT_VIEW_MODE).toBe('advanced');
  });

  it('keeps an explicitly saved easy mode', () => {
    expect(resolveAgentViewMode('easy')).toBe('easy');
  });

  it('falls back to advanced for missing or invalid saved modes', () => {
    expect(resolveAgentViewMode(null)).toBe('advanced');
    expect(resolveAgentViewMode('legacy')).toBe('advanced');
  });

  it('keeps easy mode focused on primary operator tasks', () => {
    expect(EASY_AGENT_TABS).toEqual([
      'overview',
      'chat',
      'logs',
      'integrations',
      'wallet',
      'robinhood',
    ]);
  });

  it('keeps advanced-only tabs out of easy mode', () => {
    const easyTabs = buildAgentNavigationTabs('hermes', labelFor, 'easy').map((tab) => tab.id);

    expect(easyTabs).toContain('chat');
    expect(easyTabs).toContain('integrations');
    expect(easyTabs).not.toContain('terminal');
    expect(easyTabs).not.toContain('dev');
    expect(easyTabs).not.toContain('workflows');
  });

  it('exposes MCP connectors as an advanced configuration tab', () => {
    const advancedTabs = buildAgentNavigationTabs('openclaw', labelFor, 'advanced');
    const connectorTab = advancedTabs.find((tab) => tab.id === 'connectors');

    expect(connectorTab).toMatchObject({
      id: 'connectors',
      label: 'connectors',
      group: 'configure',
    });

    const easyTabs = buildAgentNavigationTabs('openclaw', labelFor, 'easy').map((tab) => tab.id);
    expect(easyTabs).not.toContain('connectors');
  });

  it('exposes Robinhood as an asset workspace in both modes', () => {
    for (const mode of ['easy', 'advanced'] as const) {
      const robinhoodTab = buildAgentNavigationTabs('hermes', labelFor, mode)
        .find((tab) => tab.id === 'robinhood');

      expect(robinhoodTab).toMatchObject({
        id: 'robinhood',
        label: 'robinhood',
        group: 'assets',
      });
    }
  });

  it('exposes only the native IronClaw capability surfaces', () => {
    const tabs = buildAgentNavigationTabs('ironclaw', labelFor, 'advanced').map((tab) => tab.id);

    // Pin the full tab set so a regression in either direction (a tab
    // disappearing or an unsupported one leaking in) fails loudly.
    expect(tabs).toEqual([
      'overview',
      'chat',
      'logs',
      'mail',
      'stats',
      'config',
      'knowledge',
      'plugins',
      'wallet',
      'robinhood',
      'files',
      'memory',
      'terminal',
      'dev',
      'schedules',
    ]);
    expect(tabs).not.toContain('integrations');
    expect(tabs).not.toContain('connectors');
    expect(tabs).not.toContain('sessions');
  });
});
