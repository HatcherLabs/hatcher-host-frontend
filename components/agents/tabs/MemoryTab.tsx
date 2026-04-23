'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Brain, RotateCcw, ChevronDown, ChevronRight, Database, Clock, Hash, CircleDot, Info } from 'lucide-react';
import { api } from '@/lib/api';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
} from '../AgentContext';

interface DailyLog {
  date: string;
  content: string;
}

const FRAMEWORK_MEMORY_INFO: Record<string, { description: string; color: string; borderColor: string; bgColor: string; iconColor: string }> = {
  openclaw: {
    description: 'OpenClaw uses conversation-scoped memory with compaction. Memories are organized by session and automatically summarized.',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    bgColor: 'bg-amber-500/[0.06]',
    iconColor: 'text-amber-400/70',
  },
  hermes: {
    description: 'Hermes features persistent memory powered by ChromaDB. Your agent learns and remembers across conversations and restarts.',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/20',
    bgColor: 'bg-purple-500/[0.06]',
    iconColor: 'text-purple-400/70',
  },
  elizaos: {
    description: 'ElizaOS stores memories in its internal database (PGLite). Memories persist across sessions and are managed automatically by the framework.',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/20',
    bgColor: 'bg-cyan-500/[0.06]',
    iconColor: 'text-cyan-400/70',
  },
  milady: {
    description: 'Milady stores memories in its internal database (PGLite). Memories persist across sessions and are managed automatically by the framework.',
    color: 'text-rose-400',
    borderColor: 'border-rose-500/20',
    bgColor: 'bg-rose-500/[0.06]',
    iconColor: 'text-rose-400/70',
  },
};

export function MemoryTab() {
  const tMemory = useTranslations('dashboard.agentDetail.memory');
  const { agent } = useAgentContext();
  const [memoryMd, setMemoryMd] = useState('');
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const loadMemory = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentMemory(agent.id);
      if (res.success) {
        setMemoryMd(res.data.memoryMd || '');
        setDailyLogs(res.data.dailyLogs || []);
        // Auto-expand the most recent log
        if (res.data.dailyLogs?.length > 0) {
          setExpandedDates(new Set([res.data.dailyLogs[0].date]));
        }
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
    loadMemory();
  }, [loadMemory]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const isEmpty = !memoryMd && dailyLogs.length === 0;

  const frameworkInfo = FRAMEWORK_MEMORY_INFO[agent?.framework] || FRAMEWORK_MEMORY_INFO.openclaw;

  // Check if Hermes persistent memory is enabled
  const hermesPersistentMemory = useMemo(() => {
    if (agent?.framework !== 'hermes') return false;
    const config = agent?.config as Record<string, unknown> | undefined;
    const adv = config?.advanced as Record<string, unknown> | undefined;
    return adv?.persistentMemory !== false; // defaults to true for Hermes
  }, [agent?.framework, agent?.config]);

  // Memory stats
  const memoryStats = useMemo(() => {
    const totalMemories = dailyLogs.length + (memoryMd ? 1 : 0);
    const totalSize = dailyLogs.reduce((acc, log) => acc + log.content.length, 0) + memoryMd.length;
    const lastDate = dailyLogs.length > 0 ? dailyLogs[0].date : null;
    return { totalMemories, totalSize, lastDate };
  }, [dailyLogs, memoryMd]);

  return (
    <motion.div
      key="tab-memory"
      className="space-y-4"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-purple-400" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">Agent Memory</span>
        </div>
        <button
          onClick={loadMemory}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)] transition-all flex items-center gap-1.5"
        >
          <RotateCcw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? tMemory('loading') : tMemory('refresh')}
        </button>
      </div>

      {/* Framework info banner */}
      <div className={`rounded-lg border ${frameworkInfo.borderColor} ${frameworkInfo.bgColor} px-4 py-3 flex items-start gap-3`}>
        <Info size={16} className={`${frameworkInfo.iconColor} mt-0.5 shrink-0`} />
        <p className={`text-xs leading-relaxed ${frameworkInfo.color}`}>
          {frameworkInfo.description}
        </p>
      </div>

      {/* Hermes persistent memory indicator */}
      {agent?.framework === 'hermes' && (
        <div className="flex items-center gap-2 px-1">
          <CircleDot size={14} className={hermesPersistentMemory ? 'text-emerald-400' : 'text-[var(--text-muted)]'} />
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Persistent Memory:
          </span>
          <span className={`text-xs font-semibold ${hermesPersistentMemory ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
            {hermesPersistentMemory ? 'Active' : 'Disabled'}
          </span>
          {hermesPersistentMemory && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
          )}
        </div>
      )}

      {/* Memory stats row */}
      {!loading && !error && !isEmpty && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 flex items-center gap-2.5">
            <Hash size={14} className="text-purple-400/60" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Memories</p>
              <p className="text-sm font-semibold text-white">{memoryStats.totalMemories}</p>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 flex items-center gap-2.5">
            <Database size={14} className="text-purple-400/60" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Size</p>
              <p className="text-sm font-semibold text-white">
                {memoryStats.totalSize < 1024
                  ? `${memoryStats.totalSize} B`
                  : `${(memoryStats.totalSize / 1024).toFixed(1)} KB`}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2.5 flex items-center gap-2.5">
            <Clock size={14} className="text-purple-400/60" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Latest</p>
              <p className="text-sm font-semibold text-white">
                {memoryStats.lastDate || '--'}
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <GlassCard>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </GlassCard>
      ) : error ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Brain size={24} className="text-red-400/50" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </GlassCard>
      ) : isEmpty ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
              <Brain size={28} className="text-purple-400" />
            </div>
            <p className="text-base font-semibold text-white mb-1">{tMemory('noMemory')}</p>
            <p className="text-sm text-[var(--text-muted)] max-w-xs">
              Your agent builds memory by chatting with users. Start a conversation and it will remember context across sessions.
            </p>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* MEMORY.md — main memory file */}
          {memoryMd && (
            <GlassCard className="!p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border-default)] bg-black/20">
                <Brain size={14} className="text-purple-400" />
                <span className="text-xs font-mono text-[var(--text-muted)]">MEMORY.md</span>
              </div>
              <div className="p-4 max-h-[400px] overflow-y-auto">
                <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
                  {memoryMd}
                </pre>
              </div>
            </GlassCard>
          )}

          {/* Daily logs */}
          {dailyLogs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  {tMemory('dailyLogs')} ({dailyLogs.length})
                </span>
              </div>
              {dailyLogs.map(log => {
                const isExpanded = expandedDates.has(log.date);
                return (
                  <GlassCard key={log.date} className="!p-0 overflow-hidden">
                    <button
                      onClick={() => toggleDate(log.date)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border-default)] bg-black/20 hover:bg-black/30 transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-purple-400" />
                      ) : (
                        <ChevronRight size={14} className="text-[var(--text-muted)]" />
                      )}
                      <span className="text-xs font-mono text-[var(--text-secondary)]">{log.date}</span>
                      <span className="text-[10px] text-[var(--text-muted)] ml-auto">
                        {log.content.split('\n').length} lines
                      </span>
                    </button>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 max-h-[300px] overflow-y-auto"
                      >
                        <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
                          {log.content}
                        </pre>
                      </motion.div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
