'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, Loader2, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import { appendRuntimeChunks, runtimeHistoryText, type RuntimeHistoryChunk, type RuntimeHistorySession } from '@/lib/runtime-history';

export default function RuntimeHistoryDialog({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const generation = useRef(0);
  const [sessions, setSessions] = useState<RuntimeHistorySession[]>([]);
  const [sessionCursor, setSessionCursor] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const search = useRef('');
  const [selected, setSelected] = useState<RuntimeHistorySession | null>(null);
  const [chunks, setChunks] = useState<RuntimeHistoryChunk[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [archived, setArchived] = useState(false);

  const loadSessions = useCallback(async (next?: string) => {
    const version = ++generation.current;
    setLoading(true); setError('');
    try {
      const result = await api.getRuntimeHistory(agentId, { search: search.current, ...(next ? { cursor: next } : {}) });
      if (version !== generation.current) return;
      if (!result.success) throw new Error(result.error || 'Could not load history');
      if (!result.data.available) throw new Error('Saved history is not available from this runtime.');
      setSessions(previous => next ? [...previous, ...(result.data.sessions ?? [])] : result.data.sessions ?? []);
      setSessionCursor(result.data.nextCursor);
    } catch (e) { if (version === generation.current) setError(e instanceof Error ? e.message : 'Could not load history'); }
    finally { if (version === generation.current) setLoading(false); }
  }, [agentId]);

  useEffect(() => {
    dialog.current?.showModal();
    void loadSessions();
    const requests = generation;
    return () => { requests.current++; };
  }, [loadSessions]);

  async function loadMessages(session: RuntimeHistorySession, next?: string) {
    const version = ++generation.current;
    setSelected(session); setLoading(true); setError('');
    if (!next) { setChunks([]); setCursor(null); setArchived(false); }
    try {
      const result = await api.getRuntimeHistory(agentId, { sessionId: session.id, ...(next ? { cursor: next } : {}) });
      if (version !== generation.current) return;
      if (!result.success) throw new Error(result.error || 'Could not load session');
      if (!result.data.available) throw new Error('Saved history is not available from this runtime.');
      setChunks(appendRuntimeChunks(next ? chunks : [], result.data.chunks ?? []));
      setCursor(result.data.nextCursor);
      setArchived(Boolean(result.data.archivedHistoryUnavailable));
    } catch (e) { if (version === generation.current) setError(e instanceof Error ? e.message : 'Could not load session'); }
    finally { if (version === generation.current) setLoading(false); }
  }

  async function download() {
    if (!selected || exporting) return;
    const version = generation.current;
    setExporting(true); setError('');
    try {
      let next: string | null = null;
      let all: RuntimeHistoryChunk[] = [];
      let characters = 0;
      do {
        const result = await api.getRuntimeHistory(agentId, { sessionId: selected.id, ...(next ? { cursor: next } : {}) });
        if (version !== generation.current) return;
        if (!result.success) throw new Error(result.error || 'Could not export session');
        if (!result.data.available || result.data.archivedHistoryUnavailable) throw new Error('Complete export is unavailable for this archived session.');
        characters += (result.data.chunks ?? []).reduce((sum, item) => sum + item.text.length, 0);
        if (characters > 32_000_000) throw new Error('This session is too large for one download. Read it using Load more instead.');
        all = appendRuntimeChunks(all, result.data.chunks ?? []);
        next = result.data.nextCursor;
      } while (next);
      const url = URL.createObjectURL(new Blob([runtimeHistoryText(all)], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url;
      link.download = `agent-history-${selected.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { if (version === generation.current) setError(e instanceof Error ? e.message : 'Could not export session'); }
    finally { setExporting(false); }
  }

  return <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-labelledby="runtime-history-title"
    className="fixed inset-0 m-auto h-[90dvh] w-[96vw] max-w-6xl overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-0 text-[var(--text-primary)] shadow-xl backdrop:bg-black/50">
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--border-default)] p-4">
        <div><h2 id="runtime-history-title" className="font-semibold">Full history</h2><p className="mt-1 text-xs text-[var(--text-muted)]">Saved messages, analysis and tool results. Reading history does not run the agent.</p></div>
        <button type="button" onClick={onClose} aria-label="Close full history" className="rounded-lg p-2 hover:bg-[var(--bg-elevated)]"><X size={18} /></button>
      </header>
      {error && <p role="alert" className="border-b border-[var(--border-default)] p-3 text-sm text-[var(--color-error)]">{error}</p>}
      <div className="flex min-h-0 flex-1">
        <aside className={`${selected ? 'hidden md:flex' : 'flex'} w-full flex-col border-r border-[var(--border-default)] md:w-72 md:shrink-0`}>
          <form className="flex gap-2 p-3" onSubmit={event => { event.preventDefault(); search.current = query; void loadSessions(); }}>
            <input aria-label="Search full history" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search sessions" className="min-w-0 flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm" />
            <button type="submit" disabled={loading || exporting} aria-label="Search sessions" className="p-2"><Search size={16} /></button>
          </form>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {sessions.map(session => <button key={session.id} type="button" disabled={exporting} onClick={() => void loadMessages(session)} className={`mb-1 block w-full rounded-lg p-3 text-left hover:bg-[var(--bg-elevated)] ${selected?.id === session.id ? 'bg-[var(--bg-elevated)]' : ''}`}>
              <span className="block break-words text-sm font-medium">{session.title}</span><span className="mt-1 block text-xs text-[var(--text-muted)]">{new Date(session.startedAt).toLocaleString()} · {session.source}</span>
            </button>)}
            {!loading && sessions.length === 0 && <p className="p-3 text-sm text-[var(--text-muted)]">No saved sessions found.</p>}
            {sessionCursor && <button type="button" disabled={loading || exporting} onClick={() => void loadSessions(sessionCursor)} className="w-full p-3 text-sm text-[var(--color-accent)]">More sessions</button>}
          </div>
        </aside>
        <section aria-label="Session activity" className={`${selected ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
          {selected ? <>
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)] p-3">
              <button type="button" disabled={exporting} onClick={() => { generation.current++; setLoading(false); setSelected(null); }} className="p-2 md:hidden" aria-label="Back to sessions"><ArrowLeft size={16} /></button>
              <h3 className="min-w-0 flex-1 truncate text-sm font-medium" title={selected.title}>{selected.title}</h3>
              <button type="button" disabled={exporting || loading} onClick={() => void download()} className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs">{exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}Download full session</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {chunks.map(item => <details key={item.id} open={item.kind === 'message'} className="mb-3 rounded-lg border border-[var(--border-default)] p-3">
                <summary className="cursor-pointer break-words text-xs font-medium">{item.role} · {item.toolName || item.kind} · {new Date(item.timestamp).toLocaleTimeString()}{item.text.length < item.totalChars ? ' · continues on next page' : ''}</summary>
                <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-6 [overflow-wrap:anywhere]">{item.text}</pre>
              </details>)}
              {archived && <p className="mb-3 text-sm text-[var(--text-muted)]">This session also has archived entries that this runtime cannot currently export.</p>}
              {cursor && <button type="button" disabled={loading || exporting} onClick={() => void loadMessages(selected, cursor)} className="w-full rounded-lg border border-[var(--border-default)] p-3 text-sm">Load more activity</button>}
              {!loading && chunks.length === 0 && !cursor && <p className="text-sm text-[var(--text-muted)]">No saved activity in this session.</p>}
            </div>
          </> : <p className="m-auto p-6 text-sm text-[var(--text-muted)]">Choose a session to read its full history.</p>}
        </section>
      </div>
      {loading && <div role="status" className="flex items-center gap-2 border-t border-[var(--border-default)] p-3 text-sm"><Loader2 size={15} className="animate-spin" />Loading history…</div>}
    </div>
  </dialog>;
}
