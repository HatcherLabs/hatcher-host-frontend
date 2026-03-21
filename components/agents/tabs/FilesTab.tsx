'use client';

import { useContext, useEffect, useState, useCallback } from 'react';
import { AgentContext } from '../AgentContext';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import {
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ArrowLeft,
  Download,
  Trash2,
  Plus,
  Lock,
  Loader2,
  RefreshCw,
  FileText,
  FileCode,
  FileImage,
  Save,
  X,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(name: string, type: string) {
  if (type === 'directory') return <Folder size={16} className="text-[#f97316]" />;
  if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(name)) return <FileImage size={16} className="text-purple-400" />;
  if (/\.(json|js|ts|mjs|cjs)$/i.test(name)) return <FileCode size={16} className="text-blue-400" />;
  return <FileText size={16} className="text-[#A5A1C2]" />;
}

const ROOT_PATH = '/home/node/.openclaw';

const QUICK_NAV = [
  { label: 'Home', path: '/home/node/.openclaw' },
  { label: 'Workspace', path: '/home/node/.openclaw/workspace' },
  { label: 'Config', path: '/app' },
  { label: 'Logs', path: '/home/node/.openclaw/logs' },
  { label: 'Plugins', path: '/home/node/.openclaw/plugins' },
];

export function FilesTab() {
  const ctx = useContext(AgentContext);
  const { user } = useAuth();
  const agentId = ctx?.agent?.id ?? '';

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState(ROOT_PATH);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [agentStopped, setAgentStopped] = useState(false);
  const [stoppedMessage, setStoppedMessage] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  // Editor state
  const [editingFile, setEditingFile] = useState<{ path: string; name: string; content: string } | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

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
      if (res.error?.includes('File Manager requires')) {
        setUnlocked(false);
      } else {
        setError(res.error ?? 'Failed to load files');
      }
    }
    setLoading(false);
  }, [agentId, currentPath]);

  useEffect(() => { loadFiles(); }, [agentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateTo = (path: string) => {
    setEditingFile(null);
    setCreating(false);
    setCurrentPath(path);
    loadFiles(path);
  };

  const goUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    if (parent.startsWith('/home/node/.openclaw') || parent === '/app') {
      navigateTo(parent);
    }
  };

  const openFile = async (entry: FileEntry) => {
    if (entry.type === 'directory') {
      navigateTo(entry.path);
      return;
    }
    // Read file content
    setError(null);
    const res = await api.readContainerFile(agentId, entry.path);
    if (res.success) {
      setEditingFile({ path: entry.path, name: entry.name, content: res.data.content });
      setEditContent(res.data.content);
    } else {
      setError(res.error ?? 'Failed to read file');
    }
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
      setError(res.error ?? 'Failed to save');
    }
    setSaving(false);
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
      if (editingFile?.path === entry.path) setEditingFile(null);
    } else {
      setError(res.error ?? 'Failed to delete');
    }
    setDeleting(null);
  };

  const handleUnlock = async () => {
    setPurchasing(true);
    const txSignature = `mock-${Date.now()}`;
    const res = await api.purchaseAddon('addon.file_manager', txSignature, agentId);
    if (res.success) {
      setUnlocked(true);
      loadFiles();
    } else {
      setError(res.error ?? 'Purchase failed');
    }
    setPurchasing(false);
  };

  // Breadcrumbs
  const pathParts = currentPath.replace(ROOT_PATH, '~').split('/').filter(Boolean);

  // ── Loading ──
  if (loading && unlocked === null) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#f97316]" />
      </motion.div>
    );
  }

  // ── Locked ──
  if (unlocked === false) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-[#f97316]" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          File Manager
        </h3>
        <p className="text-sm text-[#A5A1C2] mb-6 max-w-sm mx-auto">
          Browse, edit, and download your agent&apos;s configuration and workspace files.
        </p>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleUnlock}
            disabled={purchasing}
            className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {purchasing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Unlocking...</>
            ) : (
              <><FolderOpen className="w-4 h-4" /> Unlock File Manager — $9.99</>
            )}
          </button>
          <span className="text-xs text-[#71717a]">One-time purchase for this agent</span>
          <Link href="/pricing" className="text-xs text-[#f97316] hover:underline">
            Or upgrade to Pro for all agents
          </Link>
        </div>
      </motion.div>
    );
  }

  // ── Agent stopped ──
  if (agentStopped) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-amber-400 opacity-60" />
        <p className="text-sm text-[#A5A1C2]">{stoppedMessage}</p>
      </motion.div>
    );
  }

  // ── File Editor ──
  if (editingFile) {
    const isModified = editContent !== editingFile.content;
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Editor header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setEditingFile(null)} className="p-1.5 rounded-lg text-[#71717a] hover:text-white hover:bg-white/[0.04] transition-colors">
              <ArrowLeft size={16} />
            </button>
            <FileCode size={16} className="text-blue-400" />
            <span className="text-sm font-medium text-white font-mono">{editingFile.name}</span>
            {isModified && <span className="text-[10px] text-amber-400 ml-1">Modified</span>}
          </div>
          <div className="flex items-center gap-2">
            {saveMsg && <span className="text-xs text-green-400">{saveMsg}</span>}
            <button
              onClick={handleSave}
              disabled={saving || !isModified}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-30 transition-colors"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save
            </button>
            <button onClick={() => setEditingFile(null)} className="p-1.5 rounded-lg text-[#71717a] hover:text-white hover:bg-white/[0.04] transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-[#71717a] mb-2 font-mono">{editingFile.path}</p>
        {error && <div className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full h-[500px] px-4 py-3 rounded-xl text-xs font-mono text-white bg-[rgba(13,11,26,0.9)] border border-white/[0.08] focus:border-[#f97316]/50 focus:outline-none resize-none leading-relaxed"
          spellCheck={false}
        />
      </motion.div>
    );
  }

  // ── File Browser ──
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {error && <div className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

      {/* Quick nav */}
      <div className="flex items-center gap-1.5 mb-3">
        {QUICK_NAV.map((nav) => (
          <button
            key={nav.path}
            onClick={() => navigateTo(nav.path)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              currentPath.startsWith(nav.path)
                ? 'bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/20'
                : 'text-[#71717a] hover:text-white hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            {nav.label}
          </button>
        ))}
      </div>

      {/* Header: breadcrumbs + actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 text-xs overflow-x-auto">
          {currentPath !== ROOT_PATH && (
            <button onClick={goUp} className="p-1 rounded text-[#71717a] hover:text-white transition-colors flex-shrink-0">
              <ArrowLeft size={14} />
            </button>
          )}
          {pathParts.map((part, i) => {
            const fullPath = part === '~' ? ROOT_PATH : ROOT_PATH + '/' + pathParts.slice(1, i + 1).join('/');
            return (
              <span key={i} className="flex items-center gap-1 flex-shrink-0">
                {i > 0 && <ChevronRight size={10} className="text-[#71717a]" />}
                <button
                  onClick={() => navigateTo(fullPath)}
                  className="text-[#A5A1C2] hover:text-white transition-colors font-mono"
                >
                  {part}
                </button>
              </span>
            );
          })}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => loadFiles()} className="p-1.5 rounded-lg text-[#71717a] hover:text-white hover:bg-white/[0.04] transition-colors" title="Refresh">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#f97316] border border-[#f97316]/30 hover:bg-[#f97316]/10 transition-colors"
          >
            <Plus size={12} /> New File
          </button>
        </div>
      </div>

      {/* New file form */}
      {creating && (
        <div className="mb-4 p-4 rounded-xl border" style={{ background: 'rgba(13, 11, 26, 0.8)', border: '1px solid rgba(46, 43, 74, 0.4)' }}>
          <div className="space-y-3">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="filename.json"
              autoFocus
              className="w-full h-9 px-3 rounded-lg text-sm text-white bg-white/[0.04] border border-white/[0.08] focus:border-[#f97316]/50 focus:outline-none placeholder:text-[#71717a] font-mono"
            />
            <textarea
              value={newFileContent}
              onChange={(e) => setNewFileContent(e.target.value)}
              placeholder="File content (optional)..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-xs font-mono text-white bg-white/[0.04] border border-white/[0.08] focus:border-[#f97316]/50 focus:outline-none placeholder:text-[#71717a]"
            />
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => { setCreating(false); setNewFileName(''); setNewFileContent(''); }} className="px-3 py-1.5 text-xs text-[#71717a] hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                disabled={creatingFile || !newFileName.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 transition-colors"
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
          <File className="w-10 h-10 mx-auto mb-3 text-[#71717a] opacity-40" />
          <p className="text-sm text-[#71717a]">This directory is empty.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'rgba(13, 11, 26, 0.6)', border: '1px solid rgba(46, 43, 74, 0.3)' }}>
          {files.map((entry) => (
            <div
              key={entry.path}
              className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors group cursor-pointer"
              onClick={() => openFile(entry)}
            >
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(entry.name, entry.type)}
                <span className="text-sm text-white truncate font-mono">{entry.name}</span>
                {entry.type === 'directory' && <ChevronRight size={12} className="text-[#71717a]" />}
              </div>
              <div className="flex items-center gap-3">
                {entry.type === 'file' && (
                  <span className="text-[10px] text-[#71717a]">{formatBytes(entry.size)}</span>
                )}
                {entry.type === 'file' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(entry); }}
                    disabled={deleting === entry.path}
                    className="p-1 rounded text-[#71717a] hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    {deleting === entry.path ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
