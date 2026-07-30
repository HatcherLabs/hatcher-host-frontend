'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FilePen, FolderPlus, Loader2, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import type { Agent } from '@/lib/api';
import { FRAMEWORK_ROOT_PATH } from '@/components/agents/AgentContext';
import { useToast } from '@/components/ui/ToastProvider';
import {
  FileExplorer,
  FRAMEWORK_ACCENT,
  type FileEntry,
} from '@/components/agents/files/FileExplorer';
import { useWindowManager } from '../WindowManager';
import { windowsEditingPath } from '../windowManagerReducer';
import { isPrivateClientPath, makePrivateDestination } from '../privatePaths';

/** Conservative deny-list — everything else is offered to the editor. */
const BINARY_FILE_EXT = /\.(png|jpe?g|gif|webp|ico|bmp|tiff?|pdf|zip|gz|tgz|bz2|xz|7z|rar|tar|exe|dll|so|dylib|bin|wasm|woff2?|ttf|otf|eot|mp3|mp4|wav|ogg|webm|mov|avi|sqlite|db)$/i;

function isProbablyTextFile(name: string): boolean {
  return !BINARY_FILE_EXT.test(name);
}

export function FilesApp({ agent }: { agent: Agent }) {
  const t = useTranslations('desktop.files');
  const { toast } = useToast();
  const { openWindow, closeWindow, windows } = useWindowManager();
  const rootPath = FRAMEWORK_ROOT_PATH[agent.framework] ?? '/home/node/.openclaw';
  const accent = FRAMEWORK_ACCENT[agent.framework] ?? FRAMEWORK_ACCENT.openclaw;
  const [refreshToken, setRefreshToken] = useState(0);
  const [currentPath, setCurrentPath] = useState(rootPath);
  const [busyPath, setBusyPath] = useState<string | null>(null);

  const handleOpenFile = (entry: FileEntry): string | null => {
    if (!isProbablyTextFile(entry.name)) return t('notEditable', { name: entry.name });
    openWindow('editor', { path: entry.path });
    return null;
  };

  /**
   * Close editor windows holding the (old) path of a moved or deleted entry —
   * a stale editor's Save would silently recreate the file at its old path.
   */
  const closeEditorsFor = (path: string) => {
    for (const win of windowsEditingPath(windows, path)) closeWindow(win.id);
  };

  const handleMakePrivate = async (entry: FileEntry) => {
    if (!window.confirm(t('makePrivateConfirm', { name: entry.name }))) return;
    setBusyPath(entry.path);
    try {
      const { dir, to } = makePrivateDestination(entry.path);
      const mkdir = await api.mkdirContainerFile(agent.id, dir);
      if (!mkdir.success) {
        toast.error(mkdir.error ?? t('makePrivateFailed'));
        return;
      }
      const move = await api.moveContainerFile(agent.id, entry.path, to);
      // A move attempt can change what the listing should show even when it
      // fails — a 404 means the row is stale, and the mkdir above may have
      // created the private/ folder. Always refresh after attempting a move.
      setRefreshToken((value) => value + 1);
      if (!move.success) {
        toast.error(move.error ?? t('makePrivateFailed'));
        return;
      }
      closeEditorsFor(entry.path);
      toast.success(t('madePrivate', { name: entry.name }));
    } finally {
      setBusyPath(null);
    }
  };

  const handleNewFolder = async () => {
    const name = window.prompt(t('newFolderPrompt'))?.trim();
    if (!name) return;
    const res = await api.mkdirContainerFile(agent.id, `${currentPath}/${name}`);
    if (!res.success) {
      toast.error(res.error ?? t('newFolderFailed'));
      return;
    }
    setRefreshToken((value) => value + 1);
    toast.success(t('folderCreated', { name }));
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <FileExplorer
        agentId={agent.id}
        rootPath={rootPath}
        accent={accent}
        onOpenFile={handleOpenFile}
        onEntryDeleted={(entry) => closeEditorsFor(entry.path)}
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
        rowActions={(entry) => (
          <>
            {entry.type === 'file' && isProbablyTextFile(entry.name) && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  openWindow('editor', { path: entry.path });
                }}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors opacity-0 group-hover:opacity-100"
                title={t('openInEditor')}
              >
                <FilePen size={12} />
              </button>
            )}
            {!isPrivateClientPath(entry.path) && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleMakePrivate(entry);
                }}
                disabled={busyPath === entry.path}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors opacity-0 group-hover:opacity-100"
                title={t('makePrivate')}
              >
                {busyPath === entry.path ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
              </button>
            )}
          </>
        )}
      />
    </div>
  );
}
