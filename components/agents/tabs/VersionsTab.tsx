'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Eye,
  RotateCcw,
  GitCompare,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
} from '../AgentContext';

interface VersionEntry {
  id: string;
  agentId: string;
  version: number;
  configSnapshot: string;
  commitMessage: string | null;
  createdBy: string | null;
  createdAt: string;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatConfig(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

/** Simple line-based diff: returns lines with type annotation */
function computeDiff(textA: string, textB: string): Array<{ type: 'same' | 'added' | 'removed'; line: string }> {
  const linesA = textA.split('\n');
  const linesB = textB.split('\n');
  const result: Array<{ type: 'same' | 'added' | 'removed'; line: string }> = [];

  const maxLen = Math.max(linesA.length, linesB.length);
  // Simple LCS-based approach for small configs; for large ones we do line-by-line comparison
  const setA = new Set(linesA);
  const setB = new Set(linesB);

  // Track which lines from B have been matched
  let idxA = 0;
  let idxB = 0;

  while (idxA < linesA.length || idxB < linesB.length) {
    if (idxA < linesA.length && idxB < linesB.length && linesA[idxA] === linesB[idxB]) {
      result.push({ type: 'same', line: linesA[idxA]! });
      idxA++;
      idxB++;
    } else if (idxA < linesA.length && !setB.has(linesA[idxA]!)) {
      result.push({ type: 'removed', line: linesA[idxA]! });
      idxA++;
    } else if (idxB < linesB.length && !setA.has(linesB[idxB]!)) {
      result.push({ type: 'added', line: linesB[idxB]! });
      idxB++;
    } else if (idxA < linesA.length) {
      result.push({ type: 'removed', line: linesA[idxA]! });
      idxA++;
    } else if (idxB < linesB.length) {
      result.push({ type: 'added', line: linesB[idxB]! });
      idxB++;
    }
  }

  return result;
}

export function VersionsTab() {
  const ctx = useAgentContext();
  const { agent, id, loadAgent } = ctx;

  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 10;

  // View modal
  const [viewVersion, setViewVersion] = useState<VersionEntry | null>(null);

  // Diff mode
  const [diffMode, setDiffMode] = useState(false);
  const [diffSelections, setDiffSelections] = useState<[number | null, number | null]>([null, null]);
  const [diffResult, setDiffResult] = useState<{ v1: VersionEntry; v2: VersionEntry } | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  // Restore
  const [restoreConfirm, setRestoreConfirm] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.getAgentVersions(id, limit, offset);
      if (res.success) {
        setVersions(res.data.versions);
        setTotal(res.data.total);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id, offset]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleRestore = async (version: number) => {
    if (!id) return;
    setRestoring(true);
    setMessage(null);
    try {
      const res = await api.restoreAgentVersion(id, version);
      if (res.success) {
        setMessage({ text: `Restored to v${version}. Reload to see updated config.`, type: 'success' });
        setRestoreConfirm(null);
        fetchVersions();
        loadAgent();
      } else {
        setMessage({ text: `Error: ${(res as { error?: string }).error ?? 'Restore failed'}`, type: 'error' });
      }
    } catch {
      setMessage({ text: 'Error: Network error', type: 'error' });
    } finally {
      setRestoring(false);
    }
  };

  const handleDiffSelect = (version: number) => {
    setDiffSelections(([a, b]) => {
      if (a === null) return [version, null];
      if (b === null && a !== version) return [a, version];
      return [version, null];
    });
  };

  const runDiff = async () => {
    if (!id || diffSelections[0] === null || diffSelections[1] === null) return;
    setDiffLoading(true);
    try {
      const res = await api.diffAgentVersions(id, diffSelections[0], diffSelections[1]);
      if (res.success) {
        setDiffResult(res.data as unknown as { v1: VersionEntry; v2: VersionEntry });
      }
    } catch {
      setMessage({ text: 'Error loading diff', type: 'error' });
    } finally {
      setDiffLoading(false);
    }
  };

  const hasMore = offset + limit < total;
  const hasPrev = offset > 0;

  return (
    <motion.div key="tab-versions" className="max-w-3xl space-y-6" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
      {/* Header */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#A78BFA]/10 flex items-center justify-center">
              <History size={14} className="text-[#A78BFA]" />
            </div>
            <h3 className="text-sm font-semibold text-[#A5A1C2]">Version History</h3>
            {total > 0 && (
              <span className="text-[10px] text-[#71717a] bg-white/[0.06] px-2 py-0.5 rounded-full">
                {total} version{total !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setDiffMode(!diffMode); setDiffSelections([null, null]); setDiffResult(null); }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
              diffMode
                ? 'border-[#A78BFA]/40 bg-[#A78BFA]/10 text-[#A78BFA]'
                : 'border-[rgba(46,43,74,0.4)] text-[#71717a] hover:text-[#A5A1C2] hover:border-[#A78BFA]/30'
            }`}
          >
            <GitCompare size={13} />
            {diffMode ? 'Cancel Diff' : 'Compare'}
          </button>
        </div>

        {/* Diff mode instructions */}
        {diffMode && (
          <div className="mb-4 p-3 rounded-lg border border-[#A78BFA]/20 bg-[#A78BFA]/5">
            <p className="text-xs text-[#A78BFA]">
              Select two versions to compare.
              {diffSelections[0] !== null && diffSelections[1] === null && (
                <> Selected v{diffSelections[0]} — now pick the second version.</>
              )}
              {diffSelections[0] !== null && diffSelections[1] !== null && (
                <> Comparing v{diffSelections[0]} vs v{diffSelections[1]}.</>
              )}
            </p>
            {diffSelections[0] !== null && diffSelections[1] !== null && (
              <button
                type="button"
                onClick={runDiff}
                disabled={diffLoading}
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-white bg-[#A78BFA] hover:bg-[#8B5CF6] rounded-lg px-3 py-1.5 transition-all disabled:opacity-40"
              >
                {diffLoading ? (
                  <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Loading...</>
                ) : (
                  <><GitCompare size={12} /> View Diff</>
                )}
              </button>
            )}
          </div>
        )}

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-4 p-3 rounded-lg border ${
                message.type === 'success'
                  ? 'border-emerald-500/20 bg-emerald-500/10'
                  : 'border-red-500/20 bg-red-500/10'
              }`}
            >
              <p className={`text-xs ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {message.text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 py-6 justify-center">
            <div className="w-4 h-4 border-2 border-white/20 border-t-[#A78BFA] rounded-full animate-spin" />
            <span className="text-xs text-[#71717a]">Loading versions...</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && versions.length === 0 && (
          <div className="text-center py-12">
            <History size={32} className="text-[#71717a] mx-auto mb-3 opacity-40" />
            <p className="text-sm text-[#71717a] mb-1">No versions yet</p>
            <p className="text-xs text-[#71717a]/60">
              Versions are created automatically when you save config changes.
            </p>
          </div>
        )}

        {/* Version list */}
        {!loading && versions.length > 0 && (
          <div className="space-y-2">
            {versions.map((v) => {
              const isSelected = diffMode && (diffSelections[0] === v.version || diffSelections[1] === v.version);
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-[#A78BFA]/40 bg-[#A78BFA]/10'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                  }`}
                >
                  <div
                    className={`flex-1 min-w-0 mr-3 ${diffMode ? 'cursor-pointer' : ''}`}
                    onClick={() => diffMode && handleDiffSelect(v.version)}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono font-bold text-[#A78BFA]">v{v.version}</span>
                      {v.commitMessage && (
                        <span className="text-xs text-[#A5A1C2] truncate">{v.commitMessage}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#71717a]">
                      {formatRelativeTime(v.createdAt)}
                      {' \u2022 '}
                      {new Date(v.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {!diffMode && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewVersion(v)}
                        className="flex items-center gap-1 text-[10px] font-medium text-[#A5A1C2] hover:text-[#FFFFFF] transition-colors"
                      >
                        <Eye size={12} />
                        View
                      </button>

                      {restoreConfirm === v.version ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRestore(v.version)}
                            disabled={restoring}
                            className="text-[10px] font-medium text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-40"
                          >
                            {restoring ? 'Restoring...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRestoreConfirm(null)}
                            className="text-[10px] font-medium text-[#71717a] hover:text-[#A5A1C2] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRestoreConfirm(v.version)}
                          className="flex items-center gap-1 text-[10px] font-medium text-[#A78BFA] hover:text-[#c4b5fd] transition-colors"
                        >
                          <RotateCcw size={11} />
                          Restore
                        </button>
                      )}
                    </div>
                  )}

                  {diffMode && (
                    <div className="flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-[#A78BFA]/20 text-[#A78BFA]'
                          : 'text-[#71717a]'
                      }`}>
                        {isSelected ? 'Selected' : 'Select'}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > limit && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={!hasPrev}
              className="flex items-center gap-1 text-xs text-[#A5A1C2] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-default"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
            <span className="text-[10px] text-[#71717a]">
              {offset + 1}-{Math.min(offset + limit, total)} of {total}
            </span>
            <button
              type="button"
              onClick={() => setOffset(offset + limit)}
              disabled={!hasMore}
              className="flex items-center gap-1 text-xs text-[#A5A1C2] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-default"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </GlassCard>

      {/* View Modal */}
      <AnimatePresence>
        {viewVersion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setViewVersion(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-white/[0.08] bg-[#1A1730] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                <div>
                  <h3 className="text-sm font-semibold text-[#FFFFFF]">
                    Version {viewVersion.version}
                  </h3>
                  <p className="text-[10px] text-[#71717a] mt-0.5">
                    {viewVersion.commitMessage ?? 'No message'}
                    {' \u2022 '}
                    {new Date(viewVersion.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewVersion(null)}
                  className="text-[#71717a] hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <pre className="text-xs font-mono text-[#A5A1C2] whitespace-pre-wrap break-words leading-relaxed">
                  {formatConfig(viewVersion.configSnapshot)}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diff Modal */}
      <AnimatePresence>
        {diffResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setDiffResult(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-white/[0.08] bg-[#1A1730] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <GitCompare size={16} className="text-[#A78BFA]" />
                  <h3 className="text-sm font-semibold text-[#FFFFFF]">
                    v{diffResult.v1.version} vs v{diffResult.v2.version}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDiffResult(null)}
                  className="text-[#71717a] hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <div className="space-y-0">
                  {computeDiff(
                    formatConfig(diffResult.v1.configSnapshot),
                    formatConfig(diffResult.v2.configSnapshot),
                  ).map((line, i) => (
                    <div
                      key={i}
                      className={`font-mono text-xs px-3 py-0.5 ${
                        line.type === 'added'
                          ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500'
                          : line.type === 'removed'
                          ? 'bg-red-500/10 text-red-400 border-l-2 border-red-500'
                          : 'text-[#71717a] border-l-2 border-transparent'
                      }`}
                    >
                      <span className="inline-block w-4 mr-2 text-right opacity-50">
                        {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                      </span>
                      {line.line || ' '}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.06]">
                  <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Added (v{diffResult.v2.version})
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Removed (v{diffResult.v1.version})
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
