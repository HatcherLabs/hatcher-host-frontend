import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const terminalSource = readFileSync(
  join(process.cwd(), 'components/agents/terminal/TerminalPane.tsx'),
  'utf8',
);

describe('gateway terminal scrollback regressions', () => {
  it('does not swallow wheel input when xterm has no local scrollback', () => {
    expect(terminalSource).toContain('if (didScroll)');
    expect(terminalSource).not.toContain('if (selected || didScroll)');
    expect(terminalSource).toContain("if (mode === 'gateway' && lines < 0)");
  });

  it('provides tmux copy-mode controls and keyboard paging', () => {
    expect(terminalSource).toContain("const enterCopyMode = gatewayCopyModeRef.current ? '' : '\\x02['");
    expect(terminalSource).toContain("event.key === 'PageUp'");
    expect(terminalSource).toContain("event.key === 'PageDown'");
  });
});

