'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brain, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
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

export function MemoryTab() {
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
          <span className="text-sm font-medium text-[#A5A1C2]">Agent Memory</span>
        </div>
        <button
          onClick={loadMemory}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg border border-[rgba(46,43,74,0.4)] text-[#71717a] hover:border-[rgba(46,43,74,0.6)] hover:text-[#A5A1C2] transition-all flex items-center gap-1.5"
        >
          <RotateCcw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

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
            <p className="text-base font-semibold text-white mb-1">No memories yet</p>
            <p className="text-sm text-[#71717a] max-w-xs">
              Your agent builds memory by chatting with users. Start a conversation and it will remember context across sessions.
            </p>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* MEMORY.md — main memory file */}
          {memoryMd && (
            <GlassCard className="!p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-black/20">
                <Brain size={14} className="text-purple-400" />
                <span className="text-xs font-mono text-[#71717a]">MEMORY.md</span>
              </div>
              <div className="p-4 max-h-[400px] overflow-y-auto">
                <pre className="text-sm text-[#A5A1C2] whitespace-pre-wrap font-mono leading-relaxed">
                  {memoryMd}
                </pre>
              </div>
            </GlassCard>
          )}

          {/* Daily logs */}
          {dailyLogs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-medium text-[#71717a] uppercase tracking-wider">
                  Daily Logs ({dailyLogs.length})
                </span>
              </div>
              {dailyLogs.map(log => {
                const isExpanded = expandedDates.has(log.date);
                return (
                  <GlassCard key={log.date} className="!p-0 overflow-hidden">
                    <button
                      onClick={() => toggleDate(log.date)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-black/20 hover:bg-black/30 transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-purple-400" />
                      ) : (
                        <ChevronRight size={14} className="text-[#71717a]" />
                      )}
                      <span className="text-xs font-mono text-[#A5A1C2]">{log.date}</span>
                      <span className="text-[10px] text-[#71717a] ml-auto">
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
                        <pre className="text-sm text-[#A5A1C2] whitespace-pre-wrap font-mono leading-relaxed">
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
