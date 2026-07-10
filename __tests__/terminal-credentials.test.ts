import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearTerminalCredentialMounts,
  loadTerminalCredentialMounts,
  persistTerminalCredentialMounts,
} from '@/lib/terminal-credentials';

describe('terminal credential mounts', () => {
  beforeEach(() => clearTerminalCredentialMounts());

  it('keeps credentials isolated by user and agent without browser storage', () => {
    persistTerminalCredentialMounts('user-1', 'agent-1', [
      { id: 'account', scope: 'account', key: 'GLOBAL', value: 'secret-a', enabled: true },
      { id: 'agent', scope: 'agent', agentId: 'agent-1', key: 'LOCAL', value: 'secret-b', enabled: true },
    ]);

    expect(loadTerminalCredentialMounts('user-1', 'agent-1')).toHaveLength(2);
    expect(loadTerminalCredentialMounts('user-1', 'agent-2')).toEqual([
      { id: 'account', scope: 'account', key: 'GLOBAL', value: 'secret-a', enabled: true },
    ]);
    expect(loadTerminalCredentialMounts('user-2', 'agent-1')).toEqual([]);
  });

  it('clears all in-memory values at logout', () => {
    persistTerminalCredentialMounts('user-1', 'agent-1', [
      { id: 'credential', scope: 'account', key: 'TOKEN', value: 'secret', enabled: true },
    ]);

    clearTerminalCredentialMounts('user-1');

    expect(loadTerminalCredentialMounts('user-1', 'agent-1')).toEqual([]);
  });
});
