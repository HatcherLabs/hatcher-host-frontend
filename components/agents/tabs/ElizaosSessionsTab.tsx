'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessagesSquare, RotateCcw, Hash, Info, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
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

interface RoomMemory {
  id: string;
  type: string;
  createdAt: number;
  text: string;
  source?: string;
  roomId?: string;
}

/** Cached per-room memory state so repeated expand/collapse doesn't refetch. */
interface RoomMemoryState {
  loading: boolean;
  error: string | null;
  memories: RoomMemory[];
  total: number;
}

export function ElizaosSessionsTab() {
  const { agent } = useAgentContext();
  const [rooms, setRooms] = useState<ElizaRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [roomMemories, setRoomMemories] = useState<Record<string, RoomMemoryState>>({});

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

  const toggleRoom = useCallback(
    async (roomId: string) => {
      if (!agent?.id) return;
      if (expandedRoom === roomId) {
        setExpandedRoom(null);
        return;
      }
      setExpandedRoom(roomId);
      // Skip refetch if we've already loaded this room's memories
      if (roomMemories[roomId]?.memories.length || roomMemories[roomId]?.loading) return;
      setRoomMemories((prev) => ({
        ...prev,
        [roomId]: { loading: true, error: null, memories: [], total: 0 },
      }));
      try {
        const res = await api.getElizaosMemories(agent.id, roomId);
        if (res.success) {
          setRoomMemories((prev) => ({
            ...prev,
            [roomId]: {
              loading: false,
              error: null,
              memories: res.data.memories,
              total: res.data.total,
            },
          }));
        } else {
          setRoomMemories((prev) => ({
            ...prev,
            [roomId]: {
              loading: false,
              error: 'error' in res ? res.error : 'Failed to load',
              memories: [],
              total: 0,
            },
          }));
        }
      } catch (e) {
        setRoomMemories((prev) => ({
          ...prev,
          [roomId]: {
            loading: false,
            error: (e as Error).message,
            memories: [],
            total: 0,
          },
        }));
      }
    },
    [agent?.id, expandedRoom, roomMemories],
  );

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
          {rooms.map((r) => {
            const isExpanded = expandedRoom === r.id;
            const memoryState = roomMemories[r.id];
            return (
              <GlassCard key={r.id} className="!p-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => void toggleRoom(r.id)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-cyan-500/[0.04] transition-colors cursor-pointer"
                >
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-cyan-400/70 shrink-0" />
                  ) : (
                    <ChevronRight size={14} className="text-[var(--text-muted)] shrink-0" />
                  )}
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <MessagesSquare size={16} className="text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{r.name || '(unnamed)'}</p>
                    <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">{r.id}</p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[var(--border-default)] px-4 py-3 bg-[var(--bg-card)]/30">
                    {memoryState?.loading && (
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2">
                        <Loader2 size={12} className="animate-spin text-cyan-400" />
                        Loading memories…
                      </div>
                    )}
                    {memoryState?.error && (
                      <p className="text-xs text-red-400">Error: {memoryState.error}</p>
                    )}
                    {memoryState && !memoryState.loading && !memoryState.error && (
                      <>
                        {memoryState.memories.length === 0 ? (
                          <p className="text-xs text-[var(--text-muted)] py-2">
                            No memories in this room.
                          </p>
                        ) : (
                          <>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                              {memoryState.memories.length} of {memoryState.total} memories
                              (newest first)
                            </p>
                            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                              {memoryState.memories.map((m) => (
                                <div
                                  key={m.id}
                                  className="px-3 py-2 rounded-md bg-[var(--bg-card)] border border-[var(--border-default)]/50"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-[10px] font-mono text-cyan-400/80 uppercase">
                                      {m.type}
                                    </span>
                                    <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                                      {m.createdAt
                                        ? new Date(m.createdAt).toLocaleString([], {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })
                                        : '—'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap break-words line-clamp-4">
                                    {m.text || <span className="italic text-[var(--text-muted)]">(empty)</span>}
                                  </p>
                                  {m.source && (
                                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                      source: {m.source}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
