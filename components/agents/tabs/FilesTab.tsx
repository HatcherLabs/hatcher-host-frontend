'use client';

import { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { AgentContext, FRAMEWORK_ROOT_PATH, FRAMEWORK_BADGE, GlassCard } from '../AgentContext';
import { useAuth } from '@/lib/auth-context';
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
  Lock,
  Loader2,
  RefreshCw,
  FileText,
  FileCode,
  FileImage,
  Save,
  X,
  AlertCircle,
  Info,
  ShieldAlert,
  Home,
  Crown,
  FileJson,
  Settings,
  HardDrive,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i] ?? 'B'}`;
}

/** Framework-specific accent color */
const FRAMEWORK_ACCENT: Record<string, { color: string; border: string; bg: string; text: string }> = {
  openclaw: { color: '#f59e0b', border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  hermes:   { color: '#a855f7', border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  elizaos:  { color: '#06b6d4', border: 'border-cyan-500/20', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  milady:   { color: '#f43f5e', border: 'border-rose-500/20', bg: 'bg-rose-500/10', text: 'text-rose-400' },
};

const FRAMEWORK_FS_INFO: Record<string, { label: string; description: string }> = {
  openclaw: {
    label: 'OpenClaw Workspace',
    description: 'Config and data live in /home/node/.openclaw. Edit settings.json to change behavior, personality, and integrations.',
  },
  hermes: {
    label: 'Hermes Workspace',
    description: 'Agent files are stored in /home/hermes/.hermes. Modify character.json and plugin configs here.',
  },
  elizaos: {
    label: 'ElizaOS Data Directory',
    description: 'ElizaOS stores agent data in /data. Character files, memories, and plugin state live here.',
  },
  milady: {
    label: 'Milady Workspace',
    description: 'Milady agent files in /data/.milady. Character config, connectors, and runtime state are managed here.',
  },
};

function getFileIcon(name: string, type: string) {
  if (type === 'directory') return <Folder size={16} className="text-amber-400" />;
  // .env files — red with warning connotation
  if (/^\.env/i.test(name)) return <ShieldAlert size={16} className="text-red-400" />;
  // JSON
  if (/\.json$/i.test(name)) return <FileJson size={16} className="text-yellow-400" />;
  // TypeScript / JavaScript
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(name)) return <FileCode size={16} className="text-blue-400" />;
  // Python
  if (/\.py$/i.test(name)) return <FileCode size={16} className="text-green-400" />;
  // Markdown
  if (/\.md$/i.test(name)) return <FileText size={16} className="text-zinc-400" />;
  // Config files
  if (/\.(ya?ml|toml|ini|cfg|conf)$/i.test(name)) return <Settings size={16} className="text-slate-400" />;
  // Images
  if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(name)) return <FileImage size={16} className="text-purple-400" />;
  return <FileText size={16} className="text-[var(--text-secondary)]" />;
}

/** Small colored dot for file-type hint in the list */
function getFileTypeTag(name: string): { label: string; color: string } | null {
  if (/^\.env/i.test(name)) return { label: 'ENV', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
  if (/\.json$/i.test(name)) return { label: 'JSON', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
  if (/\.(ts|tsx)$/i.test(name)) return { label: 'TS', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
  if (/\.(js|jsx|mjs|cjs)$/i.test(name)) return { label: 'JS', color: 'text-blue-300 bg-blue-400/10 border-blue-400/20' };
  if (/\.py$/i.test(name)) return { label: 'PY', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
  return null;
}

export function FilesTab() {
  const ctx = useContext(AgentContext);
  const { user } = useAuth();
  const agentId = ctx?.agent?.id ?? '';
  const framework = ctx?.agent?.framework ?? 'openclaw';
  const ROOT_PATH = FRAMEWORK_ROOT_PATH[framework] ?? '/home/node/.openclaw';
  const accent = FRAMEWORK_ACCENT[framework] ?? FRAMEWORK_ACCENT.openclaw;
  const fsInfo = FRAMEWORK_FS_INFO[framework] ?? FRAMEWORK_FS_INFO.openclaw;
  const userTier = (user as any)?.tier ?? 'free';
  const isPro = userTier === 'pro';

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState(ROOT_PATH);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [agentStopped, setAgentStopped] = useState(false);
  const [stoppedMessage, setStoppedMessage] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

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
    if (parent.startsWith(ROOT_PATH) || parent === '/app') {
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

  const handleUnlockStripe = async () => {
    setPurchasing(true);
    try {
      const res = await api.stripeCheckoutAddon('addon.file_manager', window.location.href, agentId);
      if (res.success && res.data.url) {
        window.location.href = res.data.url;
      } else if (!res.success) {
        setError(res.error ?? 'Failed to start checkout');
        setPurchasing(false);
      }
    } catch {
      setError('Failed to start checkout');
      setPurchasing(false);
    }
  };

  const handleUnlockSOL = async () => {
    setPurchasing(true);
    setError(null);
    try {
      const txSignature = `sol-${Date.now()}`;
      const res = await api.purchaseAddon('addon.file_manager', txSignature, agentId);
      if (res.success) {
        setUnlocked(true);
        setShowPayModal(false);
        loadFiles();
      } else {
        setError(res.error ?? 'Purchase failed');
      }
    } catch {
      setError('Purchase failed');
    }
    setPurchasing(false);
  };

  const handleUnlockCredits = async () => {
    setPurchasing(true);
    setError(null);
    try {
      const res = await api.purchaseAddonWithCredits('addon.file_manager', agentId);
      if (res.success) {
        setUnlocked(true);
        setShowPayModal(false);
        loadFiles();
      } else {
        setError(res.error ?? 'Purchase failed');
      }
    } catch {
      setError('Purchase failed');
    }
    setPurchasing(false);
  };

  // Breadcrumb segments
  const breadcrumbs = useMemo(() => {
    const relative = currentPath.startsWith(ROOT_PATH)
      ? currentPath.slice(ROOT_PATH.length)
      : currentPath;
    const segments = relative.split('/').filter(Boolean);
    const crumbs: { label: string; path: string }[] = [
      { label: '~', path: ROOT_PATH },
    ];
    segments.forEach((seg, i) => {
      crumbs.push({
        label: seg,
        path: ROOT_PATH + '/' + segments.slice(0, i + 1).join('/'),
      });
    });
    return crumbs;
  }, [currentPath, ROOT_PATH]);

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

  // ── Locked (not Pro and no addon) ──
  if (unlocked === false) {
    return (
      <>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
          <div
            className={`w-16 h-16 rounded-2xl ${accent.bg} ${accent.border} border flex items-center justify-center mx-auto mb-6`}
          >
            <Lock className={`w-8 h-8 ${accent.text}`} />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            File Manager
          </h3>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
            <Crown size={12} className="text-amber-400" />
            <span className="text-[11px] font-medium text-amber-400">Add-on</span>
          </div>

          <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
            Browse, edit, and download your agent&apos;s configuration and workspace files.
            <span className="block mt-1 text-xs text-[var(--text-muted)]">
              One-time purchase per agent — $4.99
            </span>
          </p>
          {error && (
            <p className="text-xs text-red-400 mb-3">{error}</p>
          )}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => setShowPayModal(true)}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-colors flex items-center gap-2"
              style={{ backgroundColor: accent.color }}
            >
              <FolderOpen className="w-4 h-4" /> Unlock File Manager — $4.99
            </button>
            <Link href="/pricing" className="text-xs hover:underline transition-colors" style={{ color: accent.color }}>
              Or upgrade to a tier that includes it
            </Link>
          </div>
        </motion.div>

        {/* Payment modal */}
        <AnimatePresence>
          {showPayModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => !purchasing && setShowPayModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] w-full max-w-md mx-4 overflow-hidden shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
                  <h3 className="font-semibold text-[var(--text-primary)]">Unlock File Manager</h3>
                  <button onClick={() => !purchasing && setShowPayModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    File Manager for this agent — <span className="font-bold text-[var(--text-primary)]">$4.99</span> <span className="text-xs text-[var(--text-muted)]">(one-time)</span>
                  </p>

                  <button
                    onClick={handleUnlockCredits}
                    disabled={purchasing}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-green-500/30 hover:border-green-400/50 hover:bg-green-500/[0.05] transition-all disabled:opacity-40"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">$</span>
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Pay with Credits</p>
                      <p className="text-[11px] text-[var(--text-muted)]">Instant activation</p>
                    </div>
                    {purchasing && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />}
                  </button>

                  <button
                    onClick={handleUnlockSOL}
                    disabled={purchasing}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[#06b6d4]/30 hover:bg-[#06b6d4]/[0.03] transition-all disabled:opacity-40"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#9945FF] to-[#14F195] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">SOL</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Pay with SOL</p>
                      <p className="text-[11px] text-[var(--text-muted)]">Solana wallet payment</p>
                    </div>
                    {purchasing && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />}
                  </button>

                  <button
                    onClick={handleUnlockStripe}
                    disabled={purchasing}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-[#06b6d4]/30 hover:bg-[#06b6d4]/[0.03] transition-all disabled:opacity-40"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#635BFF] to-[#A259FF] flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Pay with Card</p>
                      <p className="text-[11px] text-[var(--text-muted)]">Credit/debit card via Stripe</p>
                    </div>
                    {purchasing && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ── Agent stopped ──
  if (agentStopped) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-amber-400 opacity-60" />
        <p className="text-sm text-[var(--text-secondary)]">{stoppedMessage}</p>
      </motion.div>
    );
  }

  // ── File Editor ──
  if (editingFile) {
    const isModified = editContent !== editingFile.content;
    const isEnvFile = /^\.env/i.test(editingFile.name);
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Editor header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setEditingFile(null)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)] transition-colors">
              <ArrowLeft size={16} />
            </button>
            {getFileIcon(editingFile.name, 'file')}
            <span className="text-sm font-medium text-white font-mono">{editingFile.name}</span>
            {isModified && <span className="text-[10px] text-amber-400 ml-1">Modified</span>}
            {isEnvFile && (
              <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-1.5 py-0.5 ml-1">
                Sensitive
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {saveMsg && <span className="text-xs text-green-400">{saveMsg}</span>}
            <button
              onClick={handleSave}
              disabled={saving || !isModified}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-30 transition-colors"
              style={{ backgroundColor: isModified ? accent.color : undefined }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save
            </button>
            <button onClick={() => setEditingFile(null)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)] transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Breadcrumb path for editor */}
        <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mb-3 font-mono overflow-x-auto">
          {editingFile.path.split('/').filter(Boolean).map((seg, i, arr) => (
            <span key={i} className="flex items-center gap-1 flex-shrink-0">
              {i > 0 && <ChevronRight size={8} className="text-[#52525b]" />}
              <span className={i === arr.length - 1 ? 'text-white' : ''}>{seg}</span>
            </span>
          ))}
        </div>

        {error && <div className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full h-[500px] px-4 py-3 rounded-xl text-xs font-mono text-white bg-[var(--bg-base)]/90 border border-[var(--border-default)] focus:outline-none resize-none leading-relaxed"
          style={{ borderColor: isModified ? accent.color + '40' : undefined }}
          spellCheck={false}
        />
      </motion.div>
    );
  }

  // ── File Browser ──
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {error && <div className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</div>}

      {/* Framework info banner */}
      {showInfoBanner && (
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
            className="p-0.5 rounded text-[var(--text-muted)] hover:text-white transition-colors flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Breadcrumb path navigator */}
      <div className="mb-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs overflow-x-auto flex-1 min-w-0">
            {currentPath !== ROOT_PATH && (
              <button onClick={goUp} className="p-1 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)] transition-colors flex-shrink-0">
                <ArrowLeft size={14} />
              </button>
            )}
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1 flex-shrink-0">
                {i > 0 && <ChevronRight size={10} className="text-[#52525b]" />}
                <button
                  onClick={() => navigateTo(crumb.path)}
                  className={`px-1.5 py-0.5 rounded-md font-mono transition-colors ${
                    i === breadcrumbs.length - 1
                      ? `${accent.text} ${accent.bg}`
                      : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card)]'
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
            <button onClick={() => loadFiles()} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)] transition-colors" title="Refresh">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
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
              className="w-full h-9 px-3 rounded-lg text-sm text-white bg-[var(--bg-card)] border border-[var(--border-default)] focus:outline-none placeholder:text-[var(--text-muted)] font-mono"
              style={{ borderColor: newFileName ? accent.color + '50' : undefined }}
            />
            <textarea
              value={newFileContent}
              onChange={(e) => setNewFileContent(e.target.value)}
              placeholder="File content (optional)..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-xs font-mono text-white bg-[var(--bg-card)] border border-[var(--border-default)] focus:outline-none placeholder:text-[var(--text-muted)]"
              style={{ borderColor: newFileContent ? accent.color + '30' : undefined }}
            />
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => { setCreating(false); setNewFileName(''); setNewFileContent(''); }} className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                disabled={creatingFile || !newFileName.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50 transition-colors"
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
                  <span className="text-sm text-white truncate font-mono">{entry.name}</span>
                  {entry.type === 'directory' && <ChevronRight size={12} className="text-[var(--text-muted)]" />}
                  {tag && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium tracking-wide ${tag.color}`}>
                      {tag.label}
                    </span>
                  )}
                  {isEnvFile && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded border text-red-400 bg-red-500/10 border-red-500/20 font-medium">
                      SENSITIVE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {entry.type === 'file' && (
                    <span className="text-[10px] text-[var(--text-muted)] tabular-nums">{formatBytes(entry.size)}</span>
                  )}
                  {entry.type === 'directory' && (
                    <span className="text-[10px] text-[#52525b]">DIR</span>
                  )}
                  {entry.type === 'file' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(entry); }}
                      disabled={deleting === entry.path}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete"
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

      {/* Pro tier hint for non-pro users */}
      {!isPro && (
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[var(--text-muted)]">
          <Crown size={12} className="text-amber-400" />
          <span>File Manager add-on active.</span>
          <Link href="/pricing" className="hover:underline transition-colors" style={{ color: accent.color }}>
            Upgrade to Pro for all agents
          </Link>
        </div>
      )}
    </motion.div>
  );
}
