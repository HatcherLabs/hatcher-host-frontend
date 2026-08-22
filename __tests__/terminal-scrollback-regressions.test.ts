import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createTerminalScrollControlMessage,
  getTerminalScrollShortcut,
} from '../components/agents/terminal/terminalScrollControls';

const terminalSource = readFileSync(
  join(process.cwd(), 'components/agents/terminal/TerminalPane.tsx'),
  'utf8',
);

describe('gateway terminal scrollback regressions', () => {
  it('does not swallow wheel input when xterm has no local scrollback', () => {
    expect(terminalSource).toContain('if (didScroll)');
    expect(terminalSource).not.toContain('if (selected || didScroll)');
    expect(terminalSource).toContain("root.addEventListener('wheel', onWheel, { passive: false, capture: true })");
  });

  it('uses explicit gateway controls instead of emulated tmux keystrokes', () => {
    expect(createTerminalScrollControlMessage('page-up')).toEqual({
      type: 'scroll',
      action: 'page-up',
    });
    expect(terminalSource).toContain('createTerminalScrollControlMessage(action)');
    expect(terminalSource).toContain("if (mode === 'gateway')");
    expect(terminalSource).not.toContain("const enterCopyMode = gatewayCopyModeRef.current");
  });

  it('maps Shift+PageUp/PageDown before xterm handles the key event', () => {
    expect(getTerminalScrollShortcut({ key: 'PageUp', shiftKey: true })).toBe('page-up');
    expect(getTerminalScrollShortcut({ key: 'PageDown', shiftKey: true })).toBe('page-down');
    expect(getTerminalScrollShortcut({ key: 'PageUp', shiftKey: false })).toBeNull();
    expect(getTerminalScrollShortcut({ key: 'ArrowUp', shiftKey: true })).toBeNull();
    expect(terminalSource).toContain("root.addEventListener('keydown', onKeyDown, { capture: true })");
  });
});
