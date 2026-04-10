'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessagesSquare, RotateCcw, Hash, Info } from 'lucide-react';
import { api } from '@/lib/api';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
} from '../AgentContext';

interface ElizaRoom {
  id: string;
  name: string;
  channelId?: string;
  worldId?: string;
}

export function ElizaosSessionsTab() {
  const { agent } = useAgentContext();
  const [rooms, setRooms] = useState<ElizaRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getElizaosRooms(agent.id);
      if (res.success) {
        setRooms(res.data.rooms);
      } else {
        setError(res.error || 'Failed to load sessions');
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const isEmpty = rooms.length === 0;

  return (
    <motion.div
      key="tab-sessions-elizaos"
      className="space-y-4"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessagesSquare size={16} className="text-cyan-400" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">Chat Sessions</span>
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
          ElizaOS organizes conversations into rooms. Each platform integration (Discord, Telegram, direct chat) and each channel creates its own room, and messages within a room persist across agent restarts.
        </p>
      </div>

      {!loading && !error && !isEmpty && (
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 flex items-center gap-2">
            <Hash size={14} className="text-cyan-400/60" />
            <span className="text-xs font-semibold text-white">{rooms.length}</span>
            <span className="text-xs text-[var(--text-muted)]">rooms</span>
          </div>
        </div>
      )}

      {loading ? (
        <GlassCard>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </GlassCard>
      ) : error ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <MessagesSquare size={24} className="text-red-400/50" />
            <p className="text-sm text-red-400">{error}</p>
            <p className="text-xs text-[var(--text-muted)]">Is the agent running?</p>
          </div>
        </GlassCard>
      ) : isEmpty ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
              <MessagesSquare size={28} className="text-cyan-400" />
            </div>
            <p className="text-base font-semibold text-white mb-1">No sessions yet</p>
            <p className="text-sm text-[var(--text-muted)] max-w-xs">
              Start chatting with your agent and sessions will appear here.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {rooms.map((r) => (
            <GlassCard key={r.id} className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <MessagesSquare size={16} className="text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{r.name || '(unnamed)'}</p>
                  <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">{r.id}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </motion.div>
  );
}
