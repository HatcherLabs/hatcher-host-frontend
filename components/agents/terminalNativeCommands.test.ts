import { describe, expect, it } from 'vitest';
import { canRunNativeTerminalFork, nativeTerminalForkInput } from './terminalNativeCommands';

describe('terminal native commands', () => {
  it('sends the framework-native fork slash command', () => {
    expect(nativeTerminalForkInput()).toBe('/fork\r');
  });

  it('only enables native fork while the terminal is connected', () => {
    expect(canRunNativeTerminalFork('connected')).toBe(true);
    expect(canRunNativeTerminalFork('connecting')).toBe(false);
    expect(canRunNativeTerminalFork('disconnected')).toBe(false);
    expect(canRunNativeTerminalFork('error')).toBe(false);
  });
});
