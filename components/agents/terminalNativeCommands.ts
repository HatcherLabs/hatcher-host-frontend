export type TerminalConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export function nativeTerminalForkInput(): string {
  return '/fork\r';
}

export function canRunNativeTerminalFork(state: TerminalConnectionState): boolean {
  return state === 'connected';
}
