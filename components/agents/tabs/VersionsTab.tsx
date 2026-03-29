'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Info,
  FileText,
  ArrowRight,
  Shield,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  FRAMEWORK_BADGE,
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

/** Framework accent color map */
const FRAMEWORK_COLORS: Record<string, { text: string; bg: string; border: string; accent: string; glow: string }> = {
  openclaw: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', accent: '#f59e0b', glow: 'rgba(245,158,11,0.08)' },
  hermes:   { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', accent: '#a855f7', glow: 'rgba(168,85,247,0.08)' },
  elizaos:  { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', accent: '#06b6d4', glow: 'rgba(6,182,212,0.08)' },
  milady:   { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', accent: '#f43f5e', glow: 'rgba(244,63,94,0.08)' },
};

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

/** Count top-level changed fields between two config snapshots */
function countChangedFields(snapshotA: string, snapshotB: string): { added: number; removed: number; changed: number; total: number } {
  try {
    const a = JSON.parse(snapshotA);
    const b = JSON.parse(snapshotB);
    const keysA = new Set(Object.keys(a));
    const keysB = new Set(Object.keys(b));
    let added = 0;
    let removed = 0;
    let changed = 0;

    for (const k of keysB) {
      if (!keysA.has(k)) {
        added++;
      } else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
        changed++;
      }
    }
    for (const k of keysA) {
      if (!keysB.has(k)) removed++;
    }
    return { added, removed, changed, total: added + removed + changed };
  } catch {
    return { added: 0, removed: 0, changed: 0, total: 0 };
  }
}

/** Simple line-based diff: returns lines with type annotation */
function computeDiff(textA: string, textB: string): Array<{ type: 'same' | 'added' | 'removed'; line: string }> {
  const linesA = textA.split('\n');
  const linesB = textB.split('\n');
  const result: Array<{ type: 'same' | 'added' | 'removed'; line: string }> = [];

  const setA = new Set(linesA);
  const setB = new Set(linesB);

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

  const framework = agent?.framework ?? 'openclaw';
  const fwColors = FRAMEWORK_COLORS[framework] ?? FRAMEWORK_COLORS.openclaw!;
  const fwBadge = FRAMEWORK_BADGE[framework] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30';

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
      setMessage({ text: 'Failed to load versions', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, offset]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Precompute diff summaries between consecutive versions
  const diffSummaries = useMemo(() => {
    const map = new Map<number, { added: number; removed: number; changed: number; total: number }>();
    for (let i = 0; i < versions.length; i++) {
      const curr = versions[i]!;
      const prev = versions[i + 1]; // next in list = previous version (list is newest-first)
      if (prev) {
        map.set(curr.version, countChangedFields(prev.configSnapshot, curr.configSnapshot));
      }
    }
    return map;
  }, [versions]);

  const latestVersion = versions.length > 0 ? Math.max(...versions.map(v => v.version)) : 0;

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

      {/* Framework info banner */}
      <GlassCard>
        <div className={`flex items-start gap-3 p-3 rounded-xl border ${fwColors.border} ${fwColors.bg}`}>
          <div className="flex-shrink-0 mt-0.5">
            <Info size={14} className={fwColors.text} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${fwColors.text} mb-1`}>Auto-versioning enabled</p>
            <p className="text-[11px] text-[#A5A1C2]/70 leading-relaxed">
              A new version is created automatically each time you save configuration changes. You can view any snapshot, compare two versions side-by-side, or restore a previous version instantly. Restoring creates a new version with the old config.
            </p>
          </div>
          <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border ${fwBadge}`}>
            {framework}
          </span>
        </div>
      </GlassCard>

      {/* Header */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: fwColors.glow }}>
              <History size={14} className={fwColors.text} />
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
                ? `${fwColors.border} ${fwColors.bg} ${fwColors.text}`
                : 'border-[rgba(46,43,74,0.4)] text-[#71717a] hover:text-[#A5A1C2] hover:border-white/[0.12]'
            }`}
          >
            <GitCompare size={13} />
            {diffMode ? 'Cancel Diff' : 'Compare'}
          </button>
        </div>

        {/* Diff mode instructions */}
        {diffMode && (
          <div className={`mb-4 p-3 rounded-lg border ${fwColors.border} ${fwColors.bg}`}>
            <p className={`text-xs ${fwColors.text}`}>
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
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-white rounded-lg px-3 py-1.5 transition-all disabled:opacity-40"
                style={{ background: fwColors.accent }}
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
            <div className="w-4 h-4 border-2 border-white/20 rounded-full animate-spin" style={{ borderTopColor: fwColors.accent }} />
            <span className="text-xs text-[#71717a]">Loading versions...</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && versions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className={`w-16 h-16 rounded-full ${fwColors.bg} border ${fwColors.border} flex items-center justify-center mb-4`}>
              <History size={28} className={fwColors.text} />
            </div>
            <p className="text-base font-semibold text-white mb-1">No versions yet</p>
            <p className="text-sm text-[#71717a] max-w-xs">
              Versions are created automatically when you save configuration changes. Edit your agent&apos;s config to create the first snapshot.
            </p>
          </div>
        )}

        {/* Version list with timeline */}
        {!loading && versions.length > 0 && (
          <div className="relative">
            {/* Timeline line */}
            <div
              className="absolute left-[19px] top-4 bottom-4 w-px"
              style={{ background: `linear-gradient(to bottom, ${fwColors.accent}40, ${fwColors.accent}08)` }}
            />

            <div className="space-y-3">
              {versions.map((v, idx) => {
                const isCurrent = v.version === latestVersion;
                const isSelected = diffMode && (diffSelections[0] === v.version || diffSelections[1] === v.version);
                const summary = diffSummaries.get(v.version);

                return (
                  <motion.div
                    key={v.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="relative flex items-start gap-3"
                  >
                    {/* Timeline dot */}
                    <div className="relative z-10 flex-shrink-0 mt-3">
                      <div
                        className={`w-[10px] h-[10px] rounded-full border-2 ${
                          isCurrent
                            ? 'border-emerald-400 bg-emerald-400'
                            : isSelected
                            ? `bg-transparent`
                            : 'border-zinc-600 bg-zinc-800'
                        }`}
                        style={isSelected ? { borderColor: fwColors.accent, background: fwColors.accent } : undefined}
                      />
                      {isCurrent && (
                        <div className="absolute -inset-1 rounded-full bg-emerald-400/20 animate-pulse" />
                      )}
                    </div>

                    {/* Version card */}
                    <div
                      className={`flex-1 rounded-xl border p-3 transition-all ${
                        isCurrent
                          ? 'border-emerald-500/30 bg-emerald-500/[0.04] shadow-[0_0_15px_rgba(16,185,129,0.06)]'
                          : isSelected
                          ? `${fwColors.border} ${fwColors.bg}`
                          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                      }`}
                      onClick={() => diffMode && handleDiffSelect(v.version)}
                      role={diffMode ? 'button' : undefined}
                      style={diffMode ? { cursor: 'pointer' } : undefined}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Version number badge */}
                          <span
                            className={`inline-flex items-center justify-center text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                              isCurrent
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                : 'bg-white/[0.06] text-[#A5A1C2] border border-white/[0.08]'
                            }`}
                          >
                            v{v.version}
                          </span>

                          {isCurrent && (
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                              Current
                            </span>
                          )}

                          {v.commitMessage && (
                            <span className="text-xs text-[#A5A1C2] truncate">{v.commitMessage}</span>
                          )}
                        </div>

                        {/* Actions */}
                        {!diffMode && (
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() => setViewVersion(v)}
                              className="flex items-center gap-1 text-[10px] font-medium text-[#A5A1C2] hover:text-[#FFFFFF] transition-colors px-2 py-1 rounded-md hover:bg-white/[0.04]"
                            >
                              <Eye size={12} />
                              View
                            </button>

                            {!isCurrent && (
                              <>
                                {restoreConfirm === v.version ? (
                                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10">
                                    <AlertTriangle size={11} className="text-amber-400 flex-shrink-0" />
                                    <span className="text-[10px] text-amber-400 mr-1">Restore?</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRestore(v.version)}
                                      disabled={restoring}
                                      className="text-[10px] font-semibold text-amber-300 hover:text-amber-200 transition-colors disabled:opacity-40"
                                    >
                                      {restoring ? 'Restoring...' : 'Yes'}
                                    </button>
                                    <span className="text-amber-500/40 text-[10px]">/</span>
                                    <button
                                      type="button"
                                      onClick={() => setRestoreConfirm(null)}
                                      className="text-[10px] font-medium text-[#71717a] hover:text-[#A5A1C2] transition-colors"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setRestoreConfirm(v.version)}
                                    className={`flex items-center gap-1 text-[10px] font-medium ${fwColors.text} hover:brightness-125 transition-all px-2 py-1 rounded-md hover:${fwColors.bg}`}
                                  >
                                    <RotateCcw size={11} />
                                    Restore
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {diffMode && (
                          <div className="flex-shrink-0">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              isSelected
                                ? `${fwColors.bg} ${fwColors.text} border ${fwColors.border}`
                                : 'text-[#71717a]'
                            }`}>
                              {isSelected ? 'Selected' : 'Select'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Bottom row: timestamp + diff summary */}
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-[10px] text-[#71717a] flex items-center gap-1">
                          <Clock size={10} className="opacity-50" />
                          {formatRelativeTime(v.createdAt)}
                          {' \u2022 '}
                          {new Date(v.createdAt).toLocaleString()}
                        </p>

                        {summary && summary.total > 0 && (
                          <span className="flex items-center gap-1.5 text-[10px] text-[#71717a] bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                            <FileText size={9} className="opacity-50" />
                            {summary.total} field{summary.total !== 1 ? 's' : ''} changed
                            {summary.added > 0 && (
                              <span className="text-emerald-400">+{summary.added}</span>
                            )}
                            {summary.removed > 0 && (
                              <span className="text-red-400">-{summary.removed}</span>
                            )}
                          </span>
                        )}

                        {!summary && idx === versions.length - 1 && (
                          <span className="flex items-center gap-1 text-[10px] text-[#71717a]/60 italic">
                            <Shield size={9} />
                            Initial version
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
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
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                      viewVersion.version === latestVersion
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        : `${fwColors.bg} ${fwColors.text} border ${fwColors.border}`
                    }`}
                  >
                    v{viewVersion.version}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[#FFFFFF]">
                      Version {viewVersion.version}
                      {viewVersion.version === latestVersion && (
                        <span className="ml-2 text-[10px] text-emerald-400 font-normal">(current)</span>
                      )}
                    </h3>
                    <p className="text-[10px] text-[#71717a] mt-0.5">
                      {viewVersion.commitMessage ?? 'No message'}
                      {' \u2022 '}
                      {new Date(viewVersion.createdAt).toLocaleString()}
                    </p>
                  </div>
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
                  <GitCompare size={16} className={fwColors.text} />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#A5A1C2] bg-white/[0.06] px-2 py-0.5 rounded-md border border-white/[0.08]">
                      v{diffResult.v1.version}
                    </span>
                    <ArrowRight size={12} className="text-[#71717a]" />
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${fwColors.bg} ${fwColors.text} ${fwColors.border}`}>
                      v{diffResult.v2.version}
                    </span>
                  </div>
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
