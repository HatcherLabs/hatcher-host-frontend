'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brain, RotateCcw, Hash, Clock, MessageSquare, Info } from 'lucide-react';
import { api } from '@/lib/api';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
} from '../AgentContext';

interface ElizaMemory {
  id: string;
  type: string;
  createdAt: number;
  text: string;
  source?: string;
  roomId?: string;
}

const TYPE_COLORS: Record<string, string> = {
  messages: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  observations: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  reflections: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

function formatRelativeTime(ts: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function ElizaosMemoryTab() {
  const { agent } = useAgentContext();
  const [memories, setMemories] = useState<ElizaMemory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getElizaosMemories(agent.id);
      if (res.success) {
        setMemories(res.data.memories);
        setTotal(res.data.total);
      } else {
        setError(res.error || 'Failed to load memories');
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Render cap — long conversations can produce thousands of memory
  // entries and rendering all of them blows up DOM size + scroll cost.
  // Show the most recent 50 by default and let the user click through
  // to load the rest.
  const PAGE_CAP = 50;
  const filteredAll = typeFilter
    ? memories.filter((m) => m.type === typeFilter)
    : memories;
  const filtered = showAll ? filteredAll : filteredAll.slice(0, PAGE_CAP);
  const hiddenCount = Math.max(0, filteredAll.length - filtered.length);

  const typeCounts = memories.reduce<Record<string, number>>((acc, m) => {
    acc[m.type] = (acc[m.type] ?? 0) + 1;
    return acc;
  }, {});

  const isEmpty = memories.length === 0;

  return (
    <motion.div
      key="tab-memory-elizaos"
      className="space-y-4"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-cyan-400" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">Agent Memory</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all flex items-center gap-1.5"
        >
          <RotateCcw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.06] px-4 py-3 flex items-start gap-3">
        <Info size={16} className="text-cyan-400/70 mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed text-cyan-400">
          ElizaOS stores memories in its PGLite database. Messages, observations, and reflections all persist across sessions and container restarts.
        </p>
      </div>

      {!loading && !error && !isEmpty && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 flex items-center gap-2.5">
            <Hash size={14} className="text-cyan-400/60" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Total</p>
              <p className="text-sm font-semibold text-white">{total}</p>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 flex items-center gap-2.5">
            <MessageSquare size={14} className="text-cyan-400/60" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Types</p>
              <p className="text-sm font-semibold text-white">{Object.keys(typeCounts).length}</p>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 flex items-center gap-2.5">
            <Clock size={14} className="text-cyan-400/60" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Showing</p>
              <p className="text-sm font-semibold text-white">{filtered.length}</p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && !isEmpty && Object.keys(typeCounts).length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter(null)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              typeFilter === null
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                : 'border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            All ({memories.length})
          </button>
          {Object.entries(typeCounts).map(([type, count]) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                typeFilter === type
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                  : 'border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {type} ({count})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <GlassCard>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </GlassCard>
      ) : error ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Brain size={24} className="text-red-400/50" />
            <p className="text-sm text-red-400">{error}</p>
            <p className="text-xs text-[var(--text-muted)]">Is the agent running? Memories load from the live container.</p>
          </div>
        </GlassCard>
      ) : isEmpty ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
              <Brain size={28} className="text-cyan-400" />
            </div>
            <p className="text-base font-semibold text-white mb-1">No memories yet</p>
            <p className="text-sm text-[var(--text-muted)] max-w-xs">
              Start a conversation and the agent will remember it.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {hiddenCount > 0 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-[var(--text-muted)]">
                Showing {filtered.length} of {filteredAll.length} — {hiddenCount} older entries hidden
              </span>
              <button
                onClick={() => setShowAll(true)}
                className="text-xs text-[var(--color-accent)] hover:text-[var(--text-primary)] transition-colors"
              >
                Show all &rarr;
              </button>
            </div>
          )}
          {filtered.map((m) => (
            <GlassCard key={m.id} className="!p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border-default)] bg-black/20">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    TYPE_COLORS[m.type] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}
                >
                  {m.type}
                </span>
                <span className="text-xs text-[var(--text-muted)] ml-auto">
                  {formatRelativeTime(m.createdAt)}
                </span>
              </div>
              <div className="p-4">
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {m.text || <span className="text-[var(--text-muted)] italic">(empty content)</span>}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </motion.div>
  );
}
