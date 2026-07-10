export type TerminalCredentialScope = 'account' | 'agent';

export interface TerminalCredentialMount {
  id: string;
  scope: TerminalCredentialScope;
  key: string;
  value: string;
  enabled: boolean;
  agentId?: string;
}

const LEGACY_STORAGE_KEY = 'hatcher-terminal-credential-mounts-v1';
const mountsByUser = new Map<string, TerminalCredentialMount[]>();

function cloneMounts(mounts: TerminalCredentialMount[]): TerminalCredentialMount[] {
  return mounts.map((mount) => ({ ...mount }));
}

export function clearLegacyTerminalCredentialStorage(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function loadTerminalCredentialMounts(
  userId: string,
  agentId: string,
): TerminalCredentialMount[] {
  const mounts = mountsByUser.get(userId) ?? [];
  return cloneMounts(mounts.filter((mount) => (
    mount.scope === 'account' || mount.agentId === agentId
  )));
}

export function persistTerminalCredentialMounts(
  userId: string,
  agentId: string,
  visibleMounts: TerminalCredentialMount[],
): void {
  const existing = mountsByUser.get(userId) ?? [];
  const otherAgentMounts = existing.filter((mount) => (
    mount.scope === 'agent' && mount.agentId !== agentId
  ));
  mountsByUser.set(userId, cloneMounts([...otherAgentMounts, ...visibleMounts]));
}

export function clearTerminalCredentialMounts(userId?: string): void {
  if (userId) mountsByUser.delete(userId);
  else mountsByUser.clear();
  clearLegacyTerminalCredentialStorage();
}
