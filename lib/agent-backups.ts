import { req } from './api/core';

export interface AgentBackup {
  id: string; agentId: string; name: string; framework: string; kind: string; status: string;
  sizeBytes: number; sha256: string | null; error: string | null; createdAt: string; completedAt: string | null;
}
export interface BackupOperation {
  id: string; agentId: string; backupId: string; action: string; status: string; phase: string;
  error: string | null; resultAgentId: string | null; safetyBackupId: string | null; createdAt: string;
}
export interface BackupSchedule {
  enabled: boolean; frequency: 'daily' | 'weekly'; timeZone: string; hour: number; minute: number;
  weekday: number; retainCount: number; nextRunAt?: string; lastRunAt?: string | null; lastError?: string | null;
}
export interface BackupInventory {
  backups: AgentBackup[]; operations: BackupOperation[]; usedBytes: number; maxBytes: number; maxBackupBytes: number;
}
export async function backupRequest<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const result = await req<T>(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!result.success) throw new Error(result.error);
  return result.data;
}
export async function uploadBackup(file: File, agentId: string | undefined, accountPassword: string, archivePassword: string, progress: (value: number) => void, signal: AbortSignal): Promise<void> {
  const upload = await backupRequest<{ id: string; chunkBytes: number }>('/agents/backups/uploads', { agentId, accountPassword, sizeBytes: file.size });
  try {
    for (let offset = 0; offset < file.size;) {
      const chunk = file.slice(offset, offset + upload.chunkBytes);
      const result = await req<{ offset: number }>(`/agents/backups/${upload.id}/upload/${offset}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: chunk, signal,
      });
      if (!result.success) throw new Error(result.error);
      if (result.data.offset !== offset + chunk.size) throw new Error('Upload offset mismatch');
      offset = result.data.offset; progress(Math.round(offset / file.size * 100));
    }
    await backupRequest(`/agents/backups/${upload.id}/complete`, { archivePassword });
  } catch (error) {
    if (signal.aborted) await backupRequest(`/agents/backups/${upload.id}`, undefined, 'DELETE').catch(() => {});
    throw error;
  }
}
export function backupSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const power = Math.min(3, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** power).toFixed(1)} ${['B', 'KiB', 'MiB', 'GiB'][power]}`;
}
