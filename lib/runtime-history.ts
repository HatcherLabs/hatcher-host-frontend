export interface RuntimeHistorySession {
  id: string;
  title: string;
  source: string;
  startedAt: number;
  updatedAt: number;
}
export interface RuntimeHistoryChunk {
  id: string;
  role: string;
  kind: string;
  toolName: string | null;
  timestamp: number;
  text: string;
  offset: number;
  totalChars: number;
}
export interface RuntimeHistoryPage {
  available: boolean;
  reason?: string;
  sessions?: RuntimeHistorySession[];
  chunks?: RuntimeHistoryChunk[];
  nextCursor: string | null;
  archivedHistoryUnavailable?: boolean;
}

export function appendRuntimeChunks(current: RuntimeHistoryChunk[], incoming: RuntimeHistoryChunk[]): RuntimeHistoryChunk[] {
  const next = current.map(item => ({ ...item }));
  const positions = new Map(next.map((item, index) => [item.id, index]));
  for (const chunk of incoming) {
    const index = positions.get(chunk.id);
    if (index === undefined) {
      if (chunk.offset !== 0) throw new Error('History page is incomplete. Reopen the session to reload it.');
      positions.set(chunk.id, next.length);
      next.push({ ...chunk });
    } else {
      const previous = next[index];
      if (chunk.offset !== previous.text.length) throw new Error('History changed while loading. Reopen the session to reload it.');
      previous.text += chunk.text;
      previous.totalChars = chunk.totalChars;
    }
  }
  return next;
}

export function runtimeHistoryText(chunks: RuntimeHistoryChunk[]): string {
  return chunks.map(item => `## ${new Date(item.timestamp).toISOString()} · ${item.role} · ${item.toolName || item.kind}\n\n${item.text}`).join('\n\n');
}
