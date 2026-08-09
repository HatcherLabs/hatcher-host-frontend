'use client';

import { useContext, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AgentContext, FRAMEWORK_ROOT_PATH, FRAMEWORK_BADGE } from '../AgentContext';
import { api } from '@/lib/api';
import { FolderPlus, Info, Loader2, Lock, X } from 'lucide-react';
import {
  FileExplorer,
  FRAMEWORK_ACCENT,
  type FileEntry,
} from '@/components/agents/files/FileExplorer';
import { FileEditor } from '@/components/agents/files/FileEditor';
import { useToast } from '@/components/ui/ToastProvider';
import {
  isPrivateClientPath,
  makePrivateDestination,
} from '@/components/agents/desktop/privatePaths';

const FRAMEWORK_FS_INFO: Record<string, { label: string; description: string }> = {
  openclaw: {
    label: 'OpenClaw Files',
    description: 'Managed OpenClaw state lives in /home/node/.openclaw. Runtime config is openclaw.json; working files, memories, sessions, and plugin-skill data live in their folders.',
  },
  hermes: {
    label: 'Hermes Files',
    description: 'Managed Hermes state lives in /home/hermes/.hermes. config.yaml, SOUL.md, memories, sessions, skills, and platform data are stored here.',
  },
  ironclaw: {
    label: 'IronClaw Files',
    description: 'Managed IronClaw state lives in /home/ironclaw/.ironclaw/reborn. The workspace is at /home/ironclaw/.ironclaw/reborn/workspace; skills, memory, and extension state live under the same tree. Runtime config comes from the environment, not an editable JSON file.',
  },
};

export function FilesTab() {
  const t = useTranslations('desktop.files');
  const { toast } = useToast();
  const ctx = useContext(AgentContext);
  const agentId = ctx?.agent?.id ?? '';
  const framework = ctx?.agent?.framework ?? 'openclaw';
  const ROOT_PATH = FRAMEWORK_ROOT_PATH[framework] ?? '/home/node/.openclaw';
  const accent = FRAMEWORK_ACCENT[framework] ?? FRAMEWORK_ACCENT.openclaw;
  const fsInfo = FRAMEWORK_FS_INFO[framework] ?? FRAMEWORK_FS_INFO.openclaw;
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);
  const [currentPath, setCurrentPath] = useState(ROOT_PATH);
  const [busyPath, setBusyPath] = useState<string | null>(null);

  // Editor state
  const [editingFile, setEditingFile] = useState<{ path: string; name: string; content: string } | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);

  const handleOpenFile = async (entry: FileEntry): Promise<string | null> => {
    const res = await api.readContainerFile(agentId, entry.path);
    if (res.success) {
      setEditingFile({ path: entry.path, name: entry.name, content: res.data.content });
      setEditContent(res.data.content);
      setEditorError(null);
      return null;
    }
    return res.error ?? 'Failed to read file';
  };

  const handleEntryDeleted = (entry: FileEntry) => {
    if (editingFile?.path === entry.path) setEditingFile(null);
  };

  const handleExcludeFromPreview = async (entry: FileEntry) => {
    if (!window.confirm(t('makePrivateConfirm', { name: entry.name }))) return;
    setBusyPath(entry.path);
    try {
      const { dir, to } = makePrivateDestination(entry.path);
      const mkdir = await api.mkdirContainerFile(agentId, dir);
      if (!mkdir.success) {
        toast.error(mkdir.error ?? t('makePrivateFailed'));
        return;
      }
      const move = await api.moveContainerFile(agentId, entry.path, to);
      setRefreshToken((value) => value + 1);
      if (!move.success) {
        toast.error(move.error ?? t('makePrivateFailed'));
        return;
      }
      if (editingFile?.path === entry.path) setEditingFile(null);
      toast.success(t('madePrivate', { name: entry.name }));
    } finally {
      setBusyPath(null);
    }
  };

  const handleNewFolder = async () => {
    const name = window.prompt(t('newFolderPrompt'))?.trim();
    if (!name) return;
    const res = await api.mkdirContainerFile(agentId, `${currentPath}/${name}`);
    if (!res.success) {
      toast.error(res.error ?? t('newFolderFailed'));
      return;
    }
    setRefreshToken((value) => value + 1);
    toast.success(t('folderCreated', { name }));
  };

  const handleSave = async () => {
    if (!editingFile) return;
    setSaving(true);
    setSaveMsg(null);
    const res = await api.writeContainerFile(agentId, editingFile.path, editContent);
    if (res.success) {
      setSaveMsg('Saved');
      setEditingFile({ ...editingFile, content: editContent });
      setTimeout(() => setSaveMsg(null), 2000);
    } else {
      setEditorError(res.error ?? 'Failed to save');
    }
    setSaving(false);
  };

  // ── File Editor ──
  if (editingFile) {
    return (
      <FileEditor
        file={editingFile}
        value={editContent}
        onChange={setEditContent}
        onSave={handleSave}
        onClose={() => setEditingFile(null)}
        saving={saving}
        saveMessage={saveMsg}
        error={editorError}
        accentColor={accent.color}
      />
    );
  }

  // ── File Browser ──
  return (
    <FileExplorer
      agentId={agentId}
      rootPath={ROOT_PATH}
      accent={accent}
      onOpenFile={handleOpenFile}
      onEntryDeleted={handleEntryDeleted}
      refreshToken={refreshToken}
      onPathChange={setCurrentPath}
      toolbarActions={
        <button
          type="button"
          onClick={handleNewFolder}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${accent.text} border ${accent.border} transition-colors`}
          title={t('newFolder')}
        >
          <FolderPlus size={12} /> {t('newFolder')}
        </button>
      }
      rowDecoration={(entry) =>
        isPrivateClientPath(entry.path) ? (
          <Lock size={11} className="flex-shrink-0 text-[var(--text-muted)]" aria-label={t('privateBadge')} />
        ) : null
      }
      rowActions={(entry) =>
        !isPrivateClientPath(entry.path) ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void handleExcludeFromPreview(entry);
            }}
            disabled={busyPath === entry.path}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors opacity-0 group-hover:opacity-100"
            title={t('makePrivate')}
          >
            {busyPath === entry.path ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
          </button>
        ) : null
      }
      banner={showInfoBanner && (
        <div className={`mb-4 rounded-xl border ${accent.border} ${accent.bg} px-4 py-3 flex items-start gap-3`}>
          <Info size={16} className={`${accent.text} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-xs font-semibold ${accent.text}`}>{fsInfo.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${FRAMEWORK_BADGE[framework] ?? ''}`}>
                {ROOT_PATH}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{fsInfo.description}</p>
          </div>
          <button
            onClick={() => setShowInfoBanner(false)}
            className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}
    />
  );
}
