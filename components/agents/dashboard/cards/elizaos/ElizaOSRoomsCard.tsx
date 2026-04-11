'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';

interface Room {
  id: string;
  name: string;
  channelId?: string;
  worldId?: string;
}

/**
 * ElizaOS recent rooms card. Rooms = conversation sessions in the
 * ElizaOS data model. Shows a short list of the most recent rooms
 * with a link to the Sessions tab. Empty state explains the concept.
 */
export function ElizaOSRoomsCard() {
  const { agent, setTab } = useAgentContext();
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await api.getElizaosRooms(agent.id);
      if (res.success) {
        setRooms(res.data.rooms.slice(0, 6));
        setTotal(res.data.total);
        setError(null);
      } else {
        setError('error' in res ? res.error : 'Failed to load rooms');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agent.id]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  if (loading && !rooms) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      </GlassCard>
    );
  }

  if (error || !rooms) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <AlertTriangle size={14} className="text-amber-400" />
          Sessions unavailable{error ? `: ${error}` : ''}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Recent Sessions</h3>
          <span className="text-[10px] text-[var(--text-muted)]">({total} total)</span>
        </div>
        <button
          onClick={() => setTab('sessions')}
          className="text-[11px] px-3 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
        >
          View all
        </button>
      </div>

      {rooms.length === 0 ? (
        <p className="text-[11px] text-[var(--text-muted)] italic">
          No sessions yet. Chat with the agent to create one.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rooms.map((room) => (
            <li
              key={room.id}
              className="flex items-center gap-2 text-xs text-[var(--text-secondary)] px-2 py-1.5 rounded-lg hover:bg-[var(--bg-card)] transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
              <span className="truncate">{room.name || room.id.slice(0, 8)}</span>
              {room.channelId && (
                <span className="ml-auto text-[9px] text-[var(--text-muted)] truncate max-w-[60%]">
                  {room.channelId.slice(0, 16)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
