export type TerminalScrollAction = 'line-up' | 'page-up' | 'page-down' | 'bottom';

export function createTerminalScrollControlMessage(action: TerminalScrollAction): {
  type: 'scroll';
  action: TerminalScrollAction;
} {
  return { type: 'scroll', action };
}

type TerminalScrollShortcutEvent = Pick<KeyboardEvent, 'key' | 'shiftKey'> & {
  code?: string;
  keyCode?: number;
};

export function getTerminalScrollShortcut(event: TerminalScrollShortcutEvent): TerminalScrollAction | null {
  if (!event.shiftKey) return null;
  if (event.key === 'PageUp' || event.key === 'Prior' || event.code === 'PageUp' || event.keyCode === 33) {
    return 'page-up';
  }
  if (event.key === 'PageDown' || event.key === 'Next' || event.code === 'PageDown' || event.keyCode === 34) {
    return 'page-down';
  }
  return null;
}
