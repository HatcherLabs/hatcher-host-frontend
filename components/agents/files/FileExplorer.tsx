'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import {
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ArrowLeft,
  Trash2,
  Plus,
  Loader2,
  RefreshCw,
  FileText,
  FileCode,
  FileImage,
  X,
  AlertCircle,
  Home,
  FileJson,
  Settings,
  HardDrive,
  ShieldAlert,
} from 'lucide-react';

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
}

export interface FileExplorerAccent {
  color: string;
  border: string;
  bg: string;
  text: string;
}

/** Framework-specific accent color */
export const FRAMEWORK_ACCENT: Record<string, FileExplorerAccent> = {
  openclaw: { color: 'var(--color-info)', border: 'border-[var(--color-info-border)]', bg: 'bg-[var(--color-info-bg)]', text: 'text-[var(--color-info)]' },
  hermes:   { color: 'var(--accent)', border: 'border-[var(--border-hover)]', bg: 'bg-[var(--tech-accent-soft)]', text: 'text-[var(--accent)]' },
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i] ?? 'B'}`;
}

export function getFileIcon(name: string, type: string) {
  if (type === 'directory') return <Folder size={16} className="text-[var(--color-info)]" />;
  // .env files — red with warning connotation
  if (/^\.env/i.test(name)) return <ShieldAlert size={16} className="text-[var(--color-destructive)]" />;
  // JSON
  if (/\.json$/i.test(name)) return <FileJson size={16} className="text-[var(--color-warning)]" />;
  // TypeScript / JavaScript
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(name)) return <FileCode size={16} className="text-[var(--color-info)]" />;
  // Python
  if (/\.py$/i.test(name)) return <FileCode size={16} className="text-[var(--color-success)]" />;
  // Markdown
  if (/\.md$/i.test(name)) return <FileText size={16} className="text-zinc-400" />;
  // Config files
  if (/\.(ya?ml|toml|ini|cfg|conf)$/i.test(name)) return <Settings size={16} className="text-slate-400" />;
  // Images
  if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(name)) return <FileImage size={16} className="text-[var(--accent)]" />;
  return <FileText size={16} className="text-[var(--text-secondary)]" />;
}

/** Small colored dot for file-type hint in the list */
function getFileTypeTag(name: string): { label: string; color: string } | null {
  if (/^\.env/i.test(name)) return { label: 'ENV', color: 'text-[var(--color-destructive)] bg-[var(--color-destructive-bg)] border-[var(--color-destructive-border)]' };
  if (/\.json$/i.test(name)) return { label: 'JSON', color: 'text-[var(--color-warning)] bg-[var(--color-warning-bg)] border-[var(--color-warning-border)]' };
  if (/\.(ts|tsx)$/i.test(name)) return { label: 'TS', color: 'text-[var(--color-info)] bg-[var(--color-info-bg)] border-[var(--color-info-border)]' };
  if (/\.(js|jsx|mjs|cjs)$/i.test(name)) return { label: 'JS', color: 'text-[var(--color-info)] bg-[var(--color-info-bg)] border-[var(--color-info-border)]' };
  if (/\.py$/i.test(name)) return { label: 'PY', color: 'text-[var(--color-success)] bg-[var(--color-success-bg)] border-[var(--color-success-border)]' };
  return null;
}

export interface FileExplorerProps {
  agentId: string;
  rootPath: string;
  accent: FileExplorerAccent;
  /**
   * Called when a file row is activated. Return (or resolve to) an error
   * message to surface it in the explorer's error strip, or null when the
   * open was handled.
   */
  onOpenFile: (entry: FileEntry) => Promise<string | null> | string | null | void;
  /** Rendered between the error strip and the breadcrumb bar (e.g. an info banner). */
  banner?: React.ReactNode;
  /** Extra buttons rendered in the breadcrumb toolbar, before "New File". */
  toolbarActions?: React.ReactNode;
  /** Rendered inline after the entry name (e.g. a private-folder lock). */
  rowDecoration?: (entry: FileEntry) => React.ReactNode;
  /** Extra per-row action buttons, rendered before the delete button. */
  rowActions?: (entry: FileEntry) => React.ReactNode;
  /** Bump to force a reload of the current directory. */
  refreshToken?: number;
  onPathChange?: (path: string) => void;
  /** Defensive hook for callers holding state about an entry (e.g. an open editor). */
  onEntryDeleted?: (entry: FileEntry) => void;
}

export function FileExplorer({
  agentId,
  rootPath,
  accent,
  onOpenFile,
  banner,
  toolbarActions,
  rowDecoration,
  rowActions,
  refreshToken,
  onPathChange,
  onEntryDeleted,
}: FileExplorerProps) {
  const t = useTranslations('dashboard.agentDetail.files');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState(rootPath);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [agentStopped, setAgentStopped] = useState(false);
  const [stoppedMessage, setStoppedMessage] = useState('');

  // New file state
  const [creating, setCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [creatingFile, setCreatingFile] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadFiles = useCallback(async (path?: string) => {
    if (!agentId) return;
    const targetPath = path ?? currentPath;
    setLoading(true);
    setError(null);
    setAgentStopped(false);

    const res = await api.listContainerFiles(agentId, targetPath);
    if (res.success) {
      if (res.data.status === 'stopped') {
        setAgentStopped(true);
        setStoppedMessage(res.data.message ?? 'Agent is not running.');
        setFiles([]);
        setUnlocked(true);
      } else {
        setFiles(res.data.files);
        setCurrentPath(res.data.currentPath);
        setUnlocked(true);
      }
    } else {
      if (res.error?.includes('File Manager')) {
        setUnlocked(false);
      } else {
        setError(res.error ?? 'Failed to load files');
      }
    }
    setLoading(false);
  }, [agentId, currentPath]);

  useEffect(() => { loadFiles(); }, [agentId, refreshToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { onPathChange?.(currentPath); }, [currentPath]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateTo = (path: string) => {
    setCreating(false);
    setCurrentPath(path);
    loadFiles(path);
  };

  const goUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    if (parent.startsWith(rootPath) || parent === '/app') {
      navigateTo(parent);
    }
  };

  const openFile = async (entry: FileEntry) => {
    if (entry.type === 'directory') {
      navigateTo(entry.path);
      return;
    }
    setError(null);
    const result = await onOpenFile(entry);
    if (typeof result === 'string') setError(result);
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    setCreatingFile(true);
    const filePath = `${currentPath}/${newFileName.trim()}`;
    const res = await api.writeContainerFile(agentId, filePath, newFileContent);
    if (res.success) {
      setCreating(false);
      setNewFileName('');
      setNewFileContent('');
      loadFiles();
    } else {
      setError(res.error ?? 'Failed to create file');
    }
    setCreatingFile(false);
  };

  const handleDelete = async (entry: FileEntry) => {
    if (!confirm(`Delete ${entry.name}?`)) return;
    setDeleting(entry.path);
    const res = await api.deleteContainerFile(agentId, entry.path);
    if (res.success) {
      setFiles(prev => prev.filter(f => f.path !== entry.path));
      onEntryDeleted?.(entry);
    } else {
      setError(res.error ?? 'Failed to delete');
    }
    setDeleting(null);
  };

  // Breadcrumb segments
  const breadcrumbs = useMemo(() => {
    const relative = currentPath.startsWith(rootPath)
      ? currentPath.slice(rootPath.length)
      : currentPath;
    const segments = relative.split('/').filter(Boolean);
    const crumbs: { label: string; path: string }[] = [
      { label: '~', path: rootPath },
    ];
    segments.forEach((seg, i) => {
      crumbs.push({
        label: seg,
        path: rootPath + '/' + segments.slice(0, i + 1).join('/'),
      });
    });
    return crumbs;
  }, [currentPath, rootPath]);

  // Total size of files in current directory
  const totalSize = useMemo(() => {
    return files.reduce((sum, f) => sum + (f.type === 'file' ? f.size : 0), 0);
  }, [files]);

  const dirCount = files.filter(f => f.type === 'directory').length;
  const fileCount = files.filter(f => f.type === 'file').length;

  // ── Loading ──
  if (loading && unlocked === null) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: accent.color }} />
      </motion.div>
    );
  }

  // ── Unexpected legacy lock ──
  if (unlocked === false) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <FolderOpen className={`w-10 h-10 mx-auto mb-3 ${accent.text}`} />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          File Manager is included
        </h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
          File Manager is now included on every tier. Refresh the agent or restart it if this stale lock persists.
        </p>
        {error && <p className="text-xs text-[var(--color-destructive)] mt-3">{error}</p>}
      </motion.div>
    );
  }

  // ── Agent stopped ──
  if (agentStopped) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-[var(--color-warning)] opacity-60" />
        <p className="text-sm text-[var(--text-secondary)]">{stoppedMessage}</p>
      </motion.div>
    );
  }

  // ── File Browser ──
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {error && <div className="mb-4 text-xs text-[var(--color-destructive)] bg-[var(--color-destructive-bg)] border border-[var(--color-destructive-border)] rounded-xl px-3 py-2">{error}</div>}

      {banner}

      {/* Breadcrumb path navigator */}
      <div className="mb-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs overflow-x-auto flex-1 min-w-0">
            {currentPath !== rootPath && (
              <button onClick={goUp} className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors flex-shrink-0">
                <ArrowLeft size={14} />
              </button>
            )}
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1 flex-shrink-0">
                {i > 0 && <ChevronRight size={10} className="text-[var(--text-muted)]" />}
                <button
                  onClick={() => navigateTo(crumb.path)}
                  className={`px-1.5 py-0.5 rounded-md font-mono transition-colors ${
                    i === breadcrumbs.length - 1
                      ? `${accent.text} ${accent.bg}`
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                  }`}
                >
                  {crumb.label === '~' ? (
                    <span className="flex items-center gap-1">
                      <Home size={11} />
                      <span className="hidden sm:inline">root</span>
                    </span>
                  ) : crumb.label}
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {/* Stats summary */}
            {files.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-[var(--text-muted)] mr-1">
                {dirCount > 0 && <span>{dirCount} folder{dirCount !== 1 ? 's' : ''}</span>}
                {fileCount > 0 && <span>{fileCount} file{fileCount !== 1 ? 's' : ''}</span>}
                {totalSize > 0 && (
                  <span className="flex items-center gap-0.5">
                    <HardDrive size={9} />
                    {formatBytes(totalSize)}
                  </span>
                )}
              </div>
            )}
            <button onClick={() => loadFiles()} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors" title={t('refresh')}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
            {toolbarActions}
            <button
              onClick={() => setCreating(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${accent.text} border ${accent.border} hover:${accent.bg} transition-colors`}
            >
              <Plus size={12} /> New File
            </button>
          </div>
        </div>
      </div>

      {/* New file form */}
      {creating && (
        <div className="mb-4 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)]/80">
          <div className="space-y-3">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="filename.json"
              autoFocus
              className="w-full h-9 px-3 rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:outline-none placeholder:text-[var(--text-muted)] font-mono"
              style={{ borderColor: newFileName ? accent.color + '50' : undefined }}
            />
            <textarea
              value={newFileContent}
              onChange={(e) => setNewFileContent(e.target.value)}
              placeholder="File content (optional)..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-xs font-mono text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-default)] focus:outline-none placeholder:text-[var(--text-muted)]"
              style={{ borderColor: newFileContent ? accent.color + '30' : undefined }}
            />
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => { setCreating(false); setNewFileName(''); setNewFileContent(''); }} className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                disabled={creatingFile || !newFileName.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-[var(--text-primary)] disabled:opacity-50 transition-colors"
                style={{ backgroundColor: accent.color }}
              >
                {creatingFile ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File list */}
      {files.length === 0 && !loading ? (
        <div className="text-center py-12">
          <File className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
          <p className="text-sm text-[var(--text-muted)]">This directory is empty.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border-default)] overflow-hidden" style={{ background: 'var(--bg-base)' }}>
          {files.map((entry) => {
            const tag = entry.type === 'file' ? getFileTypeTag(entry.name) : null;
            const isEnvFile = /^\.env/i.test(entry.name);
            return (
              <div
                key={entry.path}
                className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-card)] transition-colors group cursor-pointer"
                onClick={() => openFile(entry)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(entry.name, entry.type)}
                  <span className="text-sm text-[var(--text-primary)] truncate font-mono">{entry.name}</span>
                  {rowDecoration?.(entry)}
                  {entry.type === 'directory' && <ChevronRight size={12} className="text-[var(--text-muted)]" />}
                  {tag && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium tracking-wide ${tag.color}`}>
                      {tag.label}
                    </span>
                  )}
                  {isEnvFile && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded border text-[var(--color-destructive)] bg-[var(--color-destructive-bg)] border-[var(--color-destructive-border)] font-medium">
                      SENSITIVE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {entry.type === 'file' && (
                    <span className="text-[10px] text-[var(--text-muted)] tabular-nums">{formatBytes(entry.size)}</span>
                  )}
                  {entry.type === 'directory' && (
                    <span className="text-[10px] text-[var(--text-muted)]">DIR</span>
                  )}
                  {rowActions?.(entry)}
                  {entry.type === 'file' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(entry); }}
                      disabled={deleting === entry.path}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-destructive-bg)] transition-colors opacity-0 group-hover:opacity-100"
                      title={t('delete')}
                    >
                      {deleting === entry.path ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </motion.div>
  );
}
