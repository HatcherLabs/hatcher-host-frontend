'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Brain, ChevronLeft, FileText, Folder, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import { GlassCard, useAgentContext } from '../AgentContext';

interface FsEntry {
  name: string;
  path: string;
  kind: 'file' | 'directory';
}

function parentPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

function contentText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return String(value ?? '');
  const record = value as Record<string, unknown>;
  if (typeof record.content === 'string') return record.content;
  if (typeof record.message === 'string') return record.message;
  return JSON.stringify(value, null, 2);
}

export function IronClawMemoryTab() {
  const t = useTranslations('dashboard.agentDetail.ironclaw.memory');
  const { agent } = useAgentContext();
  const { toast } = useToast();
  const [path, setPath] = useState('');
  const [entries, setEntries] = useState<FsEntry[]>([]);
  const [selected, setSelected] = useState<FsEntry | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState(false);

  const load = useCallback(async (nextPath = path) => {
    setLoading(true);
    const response = await api.listIronClawFs(agent.id, 'memory', nextPath);
    if (response.success) {
      setPath(response.data.path ?? nextPath);
      setEntries(response.data.entries ?? []);
    } else {
      toast.error(response.error ?? t('loadError'));
    }
    setLoading(false);
  }, [agent.id, path, t, toast]);

  useEffect(() => { void load(''); }, [agent.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = async (entry: FsEntry) => {
    if (entry.kind === 'directory') {
      setSelected(null);
      setContent('');
      await load(entry.path);
      return;
    }
    setReading(true);
    const response = await api.readIronClawFs(agent.id, 'memory', entry.path);
    setReading(false);
    if (!response.success) {
      toast.error(response.error ?? t('readError'));
      return;
    }
    setSelected(entry);
    setContent(contentText(response.data));
  };

  const stats = useMemo(() => ({
    directories: entries.filter((entry) => entry.kind === 'directory').length,
    documents: entries.filter((entry) => entry.kind === 'file').length,
  }), [entries]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex items-center gap-2"><Brain size={17} className="text-emerald-400" /><h2 className="text-sm font-semibold text-[var(--text-primary)]">{t('title')}</h2></div><p className="mt-1 text-xs text-[var(--text-muted)]">{t('subtitle')}</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-secondary)]"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {t('refresh')}</button>
      </div>

      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-xs leading-5 text-emerald-200">{t('privacyNote')}</div>

      <div className="grid min-h-[480px] overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] lg:grid-cols-[320px_1fr]">
        <div className="border-b border-[var(--border-default)] lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-3 py-2.5">
            {path && <button type="button" onClick={() => void load(parentPath(path))} className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"><ChevronLeft size={14} /></button>}
            <span className="min-w-0 truncate font-mono text-[11px] text-[var(--text-secondary)]">memory/{path}</span>
            <span className="ml-auto text-[10px] text-[var(--text-muted)]">{t('statsLine', { directories: stats.directories, documents: stats.documents })}</span>
          </div>
          {loading ? <div className="flex items-center justify-center gap-2 py-16 text-xs text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin" /> {t('loading')}</div> : entries.length === 0 ? <div className="px-4 py-16 text-center text-xs text-[var(--text-muted)]">{t('emptyPath')}</div> : <div className="divide-y divide-[var(--border-default)]">{entries.map((entry) => <button type="button" key={entry.path} onClick={() => void open(entry)} className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-[var(--bg-hover)] ${selected?.path === entry.path ? 'bg-emerald-500/10 text-emerald-300' : 'text-[var(--text-secondary)]'}`}>{entry.kind === 'directory' ? <Folder size={14} className="text-emerald-400" /> : <FileText size={14} className="text-[var(--text-muted)]" />}<span className="truncate">{entry.name}</span></button>)}</div>}
        </div>
        <div className="min-w-0">
          <div className="border-b border-[var(--border-default)] px-4 py-2.5 text-xs text-[var(--text-muted)]">{selected ? selected.path : t('selectDocument')}</div>
          {reading ? <div className="flex items-center justify-center gap-2 py-20 text-xs text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin" /> {t('readingDoc')}</div> : selected ? <pre className="max-h-[620px] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-6 text-[var(--text-secondary)]">{content}</pre> : <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center"><Brain size={28} className="text-emerald-400" /><p className="mt-3 max-w-sm text-xs leading-5 text-[var(--text-muted)]">{t('browseHint')}</p></div>}
        </div>
      </div>
    </div>
  );
}
