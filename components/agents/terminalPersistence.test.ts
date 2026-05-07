import { describe, expect, it } from 'vitest';
import { shouldMountTerminalTab } from './terminalPersistence';

describe('terminal tab persistence', () => {
  it('does not mount the terminal before the first terminal visit', () => {
    expect(shouldMountTerminalTab('chat', false)).toBe(false);
  });

  it('mounts the terminal when the terminal tab is active', () => {
    expect(shouldMountTerminalTab('terminal', false)).toBe(true);
  });

  it('keeps the terminal mounted after leaving the terminal tab', () => {
    expect(shouldMountTerminalTab('logs', true)).toBe(true);
  });
});
