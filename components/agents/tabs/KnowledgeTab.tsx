'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Trash2, Eye, EyeOff, Upload, X, FileText,
  FileJson, FileSpreadsheet, File, FileCode, Loader2, CheckCircle2, Info,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
} from '../AgentContext';

interface KnowledgeFile {
  name: string;
  size: number;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/** Framework accent color map */
const FRAMEWORK_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  openclaw: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  hermes:   { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  elizaos:  { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  milady:   { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
};

/** Framework-specific knowledge descriptions */
const FRAMEWORK_KNOWLEDGE_INFO: Record<string, { title: string; description: string }> = {
  openclaw: {
    title: 'RAG with Vector Embeddings',
    description: 'OpenClaw indexes uploaded files using vector embeddings for retrieval-augmented generation. Your agent searches knowledge contextually at inference time.',
  },
  hermes: {
    title: 'ChromaDB Knowledge Store',
    description: 'Hermes stores knowledge in ChromaDB with semantic chunking. Files are split and embedded for fast similarity search during conversations.',
  },
  elizaos: {
    title: 'Memory-Augmented Knowledge',
    description: 'ElizaOS integrates knowledge files into its memory system. Documents are processed and made available through the agent\'s recall pipeline.',
  },
  milady: {
    title: 'Context-Injected Knowledge',
    description: 'Milady injects knowledge files directly into the agent\'s context window, prioritizing the most relevant passages for each conversation turn.',
  },
};

/** File extension to icon/color mapping */
function getFileTypeInfo(filename: string): { icon: typeof FileText; color: string; bgColor: string; label: string } {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'pdf':
      return { icon: File, color: 'text-red-400', bgColor: 'bg-red-500/15', label: 'PDF' };
    case 'txt':
      return { icon: FileText, color: 'text-blue-400', bgColor: 'bg-blue-500/15', label: 'TXT' };
    case 'csv':
      return { icon: FileSpreadsheet, color: 'text-green-400', bgColor: 'bg-green-500/15', label: 'CSV' };
    case 'json':
      return { icon: FileJson, color: 'text-amber-400', bgColor: 'bg-amber-500/15', label: 'JSON' };
    case 'md':
    case 'mdx':
      return { icon: FileCode, color: 'text-violet-400', bgColor: 'bg-violet-500/15', label: 'MD' };
    case 'xml':
    case 'html':
      return { icon: FileCode, color: 'text-orange-400', bgColor: 'bg-orange-500/15', label: ext.toUpperCase() };
    case 'yaml':
    case 'yml':
      return { icon: FileCode, color: 'text-teal-400', bgColor: 'bg-teal-500/15', label: 'YAML' };
    default:
      return { icon: FileText, color: 'text-white/50', bgColor: 'bg-white/10', label: ext.toUpperCase() || 'FILE' };
  }
}

const SUPPORTED_FORMATS = [
  { ext: '.txt', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { ext: '.md', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  { ext: '.json', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { ext: '.csv', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  { ext: '.xml', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { ext: '.yaml', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
  { ext: '.pdf', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
];

export function KnowledgeTab() {
  const { agent } = useAgentContext();
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload form state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFilename, setUploadFilename] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // View file state
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [viewContent, setViewContent] = useState<string>('');
  const [viewLoading, setViewLoading] = useState(false);

  // Delete state
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const framework = agent?.framework;
  const fwColors = FRAMEWORK_COLORS[framework || ''] || FRAMEWORK_COLORS.openclaw;
  const fwInfo = FRAMEWORK_KNOWLEDGE_INFO[framework || ''] || FRAMEWORK_KNOWLEDGE_INFO.openclaw;

  const loadFiles = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentKnowledge(agent.id);
      if (res.success) {
        setFiles(res.data.files);
      } else {
        setError(res.error || 'Failed to load knowledge files');
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to load knowledge files');
    } finally {
      setLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async () => {
    if (!agent?.id || !uploadFilename.trim() || !uploadContent.trim()) return;
    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    setUploadSuccess(false);

    // Simulate progress (actual upload is a single request)
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 20;
      });
    }, 150);

    try {
      const res = await api.uploadAgentKnowledge(agent.id, {
        filename: uploadFilename.trim(),
        content: uploadContent,
      });
      clearInterval(progressInterval);
      if (res.success) {
        setUploadProgress(100);
        setUploadSuccess(true);
        setTimeout(() => {
          setShowUpload(false);
          setUploadFilename('');
          setUploadContent('');
          setUploadProgress(0);
          setUploadSuccess(false);
          loadFiles();
        }, 800);
      } else {
        setUploadProgress(0);
        setUploadError(res.error || 'Failed to upload');
      }
    } catch (e) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      setUploadError((e as Error).message || 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!agent?.id) return;
    setDeletingFile(filename);
    try {
      const res = await api.deleteAgentKnowledge(agent.id, filename);
      if (res.success) {
        setFiles(prev => prev.filter(f => f.name !== filename));
        if (viewingFile === filename) {
          setViewingFile(null);
          setViewContent('');
        }
      }
    } catch {
      // silently fail
    } finally {
      setDeletingFile(null);
    }
  };

  const handleView = async (filename: string) => {
    if (viewingFile === filename) {
      setViewingFile(null);
      setViewContent('');
      return;
    }
    if (!agent?.id) return;
    setViewingFile(filename);
    setViewLoading(true);
    try {
      const res = await api.readAgentKnowledge(agent.id, filename);
      if (res.success) {
        setViewContent(res.data.content);
      } else {
        setViewContent('Failed to read file.');
      }
    } catch {
      setViewContent('Failed to read file.');
    } finally {
      setViewLoading(false);
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const isRunning = agent?.status === 'active' || agent?.status === 'running';

  return (
    <motion.div
      key="tab-knowledge"
      className="space-y-4"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className={fwColors.text} />
          <h3 className="text-sm font-semibold text-white/80">Knowledge Base</h3>
          {files.length > 0 && (
            <span className="text-xs text-white/40 ml-2">
              {files.length}/10 files &middot; {formatBytes(totalSize)}
            </span>
          )}
        </div>
        {isRunning && (
          <button
            onClick={() => setShowUpload(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${fwColors.bg} ${fwColors.text} text-xs font-medium hover:brightness-125 transition-all`}
          >
            <Plus size={14} />
            Add Knowledge
          </button>
        )}
      </div>

      {/* Framework-specific knowledge info banner */}
      <GlassCard className={`p-3 border ${fwColors.border}`}>
        <div className="flex items-start gap-2.5">
          <div className={`p-1.5 rounded-lg ${fwColors.bg} shrink-0 mt-0.5`}>
            <Info size={12} className={fwColors.text} />
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-medium ${fwColors.text} mb-0.5`}>
              {fwInfo.title}
            </p>
            <p className="text-[11px] text-white/40 leading-relaxed">
              {fwInfo.description}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Upload modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <GlassCard className={`p-4 space-y-3 border ${fwColors.border}`}>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  <Upload size={14} className={fwColors.text} />
                  Add Knowledge File
                </h4>
                <button
                  onClick={() => { setShowUpload(false); setUploadError(null); setUploadProgress(0); setUploadSuccess(false); }}
                  className="text-white/40 hover:text-white/60"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Supported formats chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-white/30 uppercase tracking-wider mr-1">Supported</span>
                {SUPPORTED_FORMATS.map(fmt => (
                  <span
                    key={fmt.ext}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${fmt.color}`}
                  >
                    {fmt.ext}
                  </span>
                ))}
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">File Name</label>
                <input
                  type="text"
                  value={uploadFilename}
                  onChange={e => setUploadFilename(e.target.value)}
                  placeholder="e.g. company-info.txt"
                  className={`w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:${fwColors.border}`}
                />
                <p className="text-[10px] text-white/30 mt-1">Letters, numbers, dashes, underscores, and dots only.</p>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">Content</label>
                <textarea
                  value={uploadContent}
                  onChange={e => setUploadContent(e.target.value)}
                  placeholder="Paste your knowledge content here..."
                  rows={8}
                  className={`w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:${fwColors.border} resize-y font-mono`}
                />
                <p className="text-[10px] text-white/30 mt-1">
                  {uploadContent.length > 0 ? formatBytes(uploadContent.length) : '0 B'} / 50 KB max
                </p>
              </div>

              {/* Upload progress bar */}
              {(uploading || uploadSuccess) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {uploadSuccess ? (
                        <CheckCircle2 size={12} className="text-emerald-400" />
                      ) : (
                        <Loader2 size={12} className={`${fwColors.text} animate-spin`} />
                      )}
                      <span className="text-[11px] text-white/50">
                        {uploadSuccess ? 'Upload complete' : 'Uploading...'}
                      </span>
                    </div>
                    <span className="text-[11px] text-white/40 font-mono">
                      {Math.round(uploadProgress)}%
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${uploadSuccess ? 'bg-emerald-400' : fwColors.text.replace('text-', 'bg-')}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}

              {uploadError && (
                <p className="text-xs text-red-400">{uploadError}</p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowUpload(false); setUploadError(null); setUploadProgress(0); setUploadSuccess(false); }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || uploadSuccess || !uploadFilename.trim() || !uploadContent.trim()}
                  className={`px-3 py-1.5 rounded-lg ${fwColors.bg} ${fwColors.text} text-xs font-medium hover:brightness-125 transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {uploading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" />
                      Uploading...
                    </span>
                  ) : uploadSuccess ? (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} />
                      Done
                    </span>
                  ) : (
                    'Upload'
                  )}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <GlassCard className="p-4 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={loadFiles}
            className="mt-2 text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            Retry
          </button>
        </GlassCard>
      )}

      {/* Empty state */}
      {!loading && !error && files.length === 0 && (
        <GlassCard className="p-8 text-center">
          <FileText size={32} className="mx-auto text-white/20 mb-3" />
          <p className="text-sm text-white/50 mb-1">No knowledge files</p>
          <p className="text-xs text-white/30">
            {isRunning
              ? 'Add documents to give your agent custom context.'
              : 'Start your agent to manage knowledge files.'}
          </p>
        </GlassCard>
      )}

      {/* File list */}
      {!loading && !error && files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => {
            const fileType = getFileTypeInfo(file.name);
            const FileIcon = fileType.icon;
            return (
              <GlassCard key={file.name} className="p-0 overflow-hidden">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* File type icon with colored background */}
                    <div className={`w-9 h-9 rounded-lg ${fileType.bgColor} flex items-center justify-center shrink-0`}>
                      <FileIcon size={16} className={fileType.color} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/80 truncate font-mono">{file.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${fileType.bgColor} ${fileType.color}`}>
                          {fileType.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-white/40 font-medium">{formatBytes(file.size)}</span>
                        {file.createdAt && (
                          <>
                            <span className="text-white/20">&middot;</span>
                            <span className="text-[11px] text-white/30">{formatDate(file.createdAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => handleView(file.name)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                      title={viewingFile === file.name ? 'Hide content' : 'View content'}
                    >
                      {viewingFile === file.name ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => handleDelete(file.name)}
                      disabled={deletingFile === file.name}
                      className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                      title="Delete file"
                    >
                      {deletingFile === file.name ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded content view */}
                <AnimatePresence>
                  {viewingFile === file.name && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/[0.06]"
                    >
                      <div className="p-3">
                        {viewLoading ? (
                          <Skeleton className="h-24 w-full rounded-lg" />
                        ) : (
                          <pre className="text-xs text-white/60 font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto bg-white/5 rounded-lg p-3">
                            {viewContent}
                          </pre>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
