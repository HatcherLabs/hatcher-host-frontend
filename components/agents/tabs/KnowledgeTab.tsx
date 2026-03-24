'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Trash2, Eye, EyeOff, Upload, X, FileText } from 'lucide-react';
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

  // View file state
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [viewContent, setViewContent] = useState<string>('');
  const [viewLoading, setViewLoading] = useState(false);

  // Delete state
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

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
    try {
      const res = await api.uploadAgentKnowledge(agent.id, {
        filename: uploadFilename.trim(),
        content: uploadContent,
      });
      if (res.success) {
        setShowUpload(false);
        setUploadFilename('');
        setUploadContent('');
        loadFiles();
      } else {
        setUploadError(res.error || 'Failed to upload');
      }
    } catch (e) {
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
          <BookOpen size={16} className="text-amber-400" />
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/30 transition-colors"
          >
            <Plus size={14} />
            Add Knowledge
          </button>
        )}
      </div>

      {/* Info note */}
      <p className="text-xs text-white/40">
        Knowledge files are used as additional context when your agent responds. Upload text documents to give your agent custom knowledge.
      </p>

      {/* Upload modal */}
      {showUpload && (
        <GlassCard className="p-4 space-y-3 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <Upload size={14} className="text-amber-400" />
              Add Knowledge File
            </h4>
            <button
              onClick={() => { setShowUpload(false); setUploadError(null); }}
              className="text-white/40 hover:text-white/60"
            >
              <X size={16} />
            </button>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">File Name</label>
            <input
              type="text"
              value={uploadFilename}
              onChange={e => setUploadFilename(e.target.value)}
              placeholder="e.g. company-info.txt"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
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
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 resize-y font-mono"
            />
            <p className="text-[10px] text-white/30 mt-1">
              {uploadContent.length > 0 ? formatBytes(uploadContent.length) : '0 B'} / 50 KB max
            </p>
          </div>

          {uploadError && (
            <p className="text-xs text-red-400">{uploadError}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowUpload(false); setUploadError(null); }}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !uploadFilename.trim() || !uploadContent.trim()}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </GlassCard>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
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
          {files.map(file => (
            <GlassCard key={file.name} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={14} className="text-amber-400 shrink-0" />
                  <span className="text-sm text-white/80 truncate font-mono">{file.name}</span>
                  <span className="text-xs text-white/30 shrink-0">{formatBytes(file.size)}</span>
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
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded content view */}
              {viewingFile === file.name && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  {viewLoading ? (
                    <Skeleton className="h-24 w-full rounded-lg" />
                  ) : (
                    <pre className="text-xs text-white/60 font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto bg-white/5 rounded-lg p-3">
                      {viewContent}
                    </pre>
                  )}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </motion.div>
  );
}
