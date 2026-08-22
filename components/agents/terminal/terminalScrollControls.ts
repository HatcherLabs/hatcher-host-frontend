export type TerminalScrollAction = 'line-up' | 'page-up' | 'page-down' | 'bottom';

export function createTerminalScrollControlMessage(action: TerminalScrollAction): {
  type: 'scroll';
  action: TerminalScrollAction;
} {
  return { type: 'scroll', action };
}

export function getTerminalScrollShortcut(event: Pick<KeyboardEvent, 'key' | 'shiftKey'>): TerminalScrollAction | null {
  if (!event.shiftKey) return null;
  if (event.key === 'PageUp') return 'page-up';
  if (event.key === 'PageDown') return 'page-down';
  return null;
}
