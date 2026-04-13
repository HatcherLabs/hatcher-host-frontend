'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Upload,
  Trash2,
  FileText,
  Loader2,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  Eye,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, tabContentVariants, GlassCard, Skeleton } from '../AgentContext';
import { useToast } from '@/components/ui/ToastProvider';

// ─── Types ───────────────────────────────────────────────────

interface KnowledgeFile {
  name: string;
  size: number;
  createdAt: string;
}

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.pdf'];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Component ───────────────────────────────────────────────

export function KnowledgeTab() {
  const { agent } = useAgentContext();
  const { toast } = useToast();

  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload form
  const [filename, setFilename] = useState('');
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Preview
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Deleting
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!agent) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getKnowledge(agent.id);
      if (!res.success) {
        setError(res.error ?? 'Failed to load knowledge files');
      } else {
        setFiles(res.data.files);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [agent]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async () => {
    if (!agent || !filename.trim() || !content.trim()) return;

    const ext = filename.includes('.') ? '' : '.txt';
    const finalName = filename.trim() + ext;

    if (content.length > MAX_FILE_SIZE) {
      toast.error('Content must be under 1 MB');
      return;
    }

    setUploading(true);
    try {
      const res = await api.uploadKnowledge(agent.id, finalName, content);
      if (res.success) {
        toast.success(`Uploaded ${finalName} (${formatBytes(res.data?.size ?? 0)})`);
        setFilename('');
        setContent('');
        setShowForm(false);
        fetchFiles();
      } else {
        toast.error(res.error ?? 'Upload failed');
      }
    } catch {
      toast.error('Upload failed — network error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!agent) return;
    setDeleting(name);
    try {
      const res = await api.deleteKnowledge(agent.id, name);
      if (res.success) {
        toast.success(`Deleted ${name}`);
        setFiles(prev => prev.filter(f => f.name !== name));
        if (previewFile === name) {
          setPreviewFile(null);
          setPreviewContent(null);
        }
      } else {
        toast.error(res.error ?? 'Delete failed');
      }
    } catch {
      toast.error('Delete failed — network error');
    } finally {
      setDeleting(null);
    }
  };

  const handlePreview = async (name: string) => {
    if (!agent) return;
    if (previewFile === name) {
      setPreviewFile(null);
      setPreviewContent(null);
      return;
    }
    setPreviewFile(name);
    setPreviewContent(null);
    setPreviewLoading(true);
    try {
      const res = await api.readKnowledge(agent.id, name);
      if (!res.success) {
        setPreviewContent(`[Error: ${res.error ?? 'Could not read file'}]`);
      } else {
        setPreviewContent(res.data.content);
      }
    } catch {
      setPreviewContent('[Error: Network error]');
    } finally {
      setPreviewLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────

  if (loading) {
    return (
      <motion.div variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="p-6">
        <GlassCard className="p-6 text-center space-y-3">
          <AlertTriangle size={32} className="mx-auto" style={{ color: 'var(--color-warning)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button
            onClick={fetchFiles}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
          >
            <RotateCcw size={14} /> Retry
          </button>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen size={20} style={{ color: 'var(--color-accent)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Knowledge Base
          </h2>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
          >
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => setShowForm(prev => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          <Upload size={14} />
          {showForm ? 'Cancel' : 'Upload'}
        </button>
      </div>

      {/* Upload form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <GlassCard className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Filename
                </label>
                <input
                  type="text"
                  value={filename}
                  onChange={e => setFilename(e.target.value)}
                  placeholder="e.g. product-docs.txt"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Allowed: .txt, .md, .pdf (text content). Max 1 MB.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Paste your document content here..."
                  rows={8}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-y font-mono"
                  style={{
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {formatBytes(content.length)} / {formatBytes(MAX_FILE_SIZE)}
                </p>
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading || !filename.trim() || !content.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {files.length === 0 && !showForm && (
        <GlassCard className="p-10 text-center space-y-3">
          <FileText size={40} className="mx-auto" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
            No knowledge files yet
          </h3>
          <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
            Upload documents (TXT, MD, or PDF text) to give your agent a RAG knowledge base.
            The agent will use these as context for its responses.
          </p>
        </GlassCard>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => (
            <GlassCard key={file.name} className="overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <FileText size={18} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {file.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatBytes(file.size)} &middot; {formatDate(file.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => handlePreview(file.name)}
                  className="p-1.5 rounded-md transition-colors hover:opacity-80"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Preview"
                >
                  {previewFile === file.name ? <ChevronDown size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => handleDelete(file.name)}
                  disabled={deleting === file.name}
                  className="p-1.5 rounded-md transition-colors hover:opacity-80 disabled:opacity-40"
                  style={{ color: 'var(--color-warning)' }}
                  title="Delete"
                >
                  {deleting === file.name ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>

              {/* Inline preview */}
              <AnimatePresence>
                {previewFile === file.name && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-4 py-3 text-sm font-mono whitespace-pre-wrap max-h-80 overflow-auto"
                      style={{
                        color: 'var(--text-secondary)',
                        borderTop: '1px solid var(--border-default)',
                        background: 'rgba(0,0,0,0.1)',
                      }}
                    >
                      {previewLoading ? (
                        <div className="flex items-center gap-2 py-4 justify-center" style={{ color: 'var(--text-muted)' }}>
                          <Loader2 size={16} className="animate-spin" /> Loading...
                        </div>
                      ) : (
                        previewContent ?? ''
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          ))}
        </div>
      )}
    </motion.div>
  );
}
