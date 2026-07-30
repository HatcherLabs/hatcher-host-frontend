'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileCode, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import { FileEditor } from '@/components/agents/files/FileEditor';
import { FRAMEWORK_ACCENT } from '@/components/agents/files/FileExplorer';
import { useWindowManager } from '../WindowManager';

export interface EditorAppProps {
  agent: Agent;
  windowId: string;
  path?: string;
}

export function EditorApp({ agent, windowId, path }: EditorAppProps) {
  const t = useTranslations('desktop.editor');
  const { closeWindow } = useWindowManager();
  const accent = FRAMEWORK_ACCENT[agent.framework] ?? FRAMEWORK_ACCENT.openclaw;

  const [file, setFile] = useState<{ path: string; name: string; content: string } | null>(null);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(Boolean(path));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setLoadError(null);
    const res = await api.readContainerFile(agent.id, path);
    if (res.success) {
      setFile({ path, name: path.split('/').pop() ?? path, content: res.data.content });
      setValue(res.data.content);
    } else {
      setLoadError(res.error ?? t('loadFailed'));
    }
    setLoading(false);
  }, [agent.id, path, t]);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    setSaveMessage(null);
    const res = await api.writeContainerFile(agent.id, file.path, value);
    if (res.success) {
      setSaveMessage(t('saved'));
      setSaveError(null);
      setFile({ ...file, content: value });
      setTimeout(() => setSaveMessage(null), 2000);
    } else {
      setSaveError(res.error ?? t('saveFailed'));
    }
    setSaving(false);
  };

  // Opened from the icon without a file — point at the Files app.
  if (!path) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <FileCode size={28} className="text-[var(--text-muted)] opacity-60" aria-hidden />
        <p className="text-sm text-[var(--text-secondary)]">{t('empty')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: accent.color }} />
      </div>
    );
  }

  if (loadError || !file) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-[var(--color-destructive)]">{loadError ?? t('loadFailed')}</p>
        <button
          type="button"
          onClick={() => { void load(); }}
          className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="h-full p-4">
      <FileEditor
        fill
        file={file}
        value={value}
        onChange={setValue}
        onSave={handleSave}
        onClose={() => closeWindow(windowId)}
        saving={saving}
        saveMessage={saveMessage}
        error={saveError}
        accentColor={accent.color}
      />
    </div>
  );
}
