import { describe, expect, it } from 'vitest';
import { resolveTerminalTheme } from './terminalTheme';

describe('resolveTerminalTheme', () => {
  it('uses readable dark text on light terminal backgrounds', () => {
    const theme = resolveTerminalTheme('light');

    expect(theme.background).toBe('#ffffff');
    expect(theme.foreground).toBe('#111827');
    expect(theme.black).toBe('#111827');
    expect(theme.white).toBe('#f8fafc');
  });

  it('keeps the existing dark terminal palette for dark theme', () => {
    const theme = resolveTerminalTheme('dark');

    expect(theme.background).toBe('#0f1112');
    expect(theme.foreground).toBe('#e6eeec');
  });
});
