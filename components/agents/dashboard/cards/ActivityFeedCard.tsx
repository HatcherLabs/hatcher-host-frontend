'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Play,
  Square,
  RotateCcw,
  Wrench,
  Tag,
  PlusCircle,
} from 'lucide-react';
import type { Agent } from '@/lib/api';
import { api } from '@/lib/api';
import { GlassCard, Skeleton } from '../../AgentContext';

export type ActivityEventType =
  | 'started'
  | 'stopped'
  | 'restarted'
  | 'config_updated'
  | 'error'
  | 'message_burst'
  | 'version_deployed'
  | 'created';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  message: string;
  timestamp: string;
}

const ACTIVITY_ICON: Record<ActivityEventType, React.ComponentType<any>> = {
  started: Play,
  stopped: Square,
  restarted: RotateCcw,
  config_updated: Wrench,
  error: AlertTriangle,
  message_burst: MessageSquare,
  version_deployed: Tag,
  created: PlusCircle,
};

const ACTIVITY_COLOR: Record<ActivityEventType, string> = {
  started: 'text-emerald-400 bg-emerald-500/15',
  stopped: 'text-amber-400 bg-amber-500/15',
  restarted: 'text-blue-400 bg-blue-500/15',
  config_updated: 'text-[var(--color-accent)] bg-[var(--color-accent)]/15',
  error: 'text-red-400 bg-red-500/15',
  message_burst: 'text-purple-400 bg-purple-500/15',
  version_deployed: 'text-[var(--color-accent)] bg-[var(--color-accent)]/15',
  created: 'text-emerald-400 bg-emerald-500/15',
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/**
 * Recent-events timeline card. Fetches `/agents/:id/activity` every 30s;
 * if the backend returns no events, derives a synthetic timeline from the
 * agent's createdAt/updatedAt/status so the card still has content.
 *
 * Extracted verbatim from the legacy OverviewTab.tsx for Etapa 1 — no
 * behavior changes, same polling + derivation logic.
 */
export function ActivityFeedCard({
  agentId,
  agent,
}: {
  agentId: string;
  agent: Agent;
}) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await api.getAgentActivity(agentId);
      if (res.success && res.data.events?.length > 0) {
        setEvents(res.data.events.slice(0, 20));
        setLoading(false);
        return;
      }
    } catch {
      // fall through to derived events
    }
    // Derive events from available data when backend isn't ready
    const derived: ActivityEvent[] = [];
    const now = new Date();

    if (agent.createdAt) {
      derived.push({
        id: 'created',
        type: 'created',
        message: `Agent "${agent.name}" created`,
        timestamp: agent.createdAt,
      });
    }

    if (agent.updatedAt && agent.updatedAt !== agent.createdAt) {
      derived.push({
        id: 'updated',
        type: 'config_updated',
        message: 'Configuration updated',
        timestamp: agent.updatedAt,
      });
    }

    const statusMap: Record<string, ActivityEventType> = {
      active: 'started',
      paused: 'stopped',
      sleeping: 'stopped',
      error: 'error',
      restarting: 'restarted',
    };
    if (agent.status && statusMap[agent.status]) {
      derived.push({
        id: 'status',
        type: statusMap[agent.status],
        message: `Agent is ${agent.status}`,
        timestamp: new Date(now.getTime() - 2 * 60000).toISOString(),
      });
    }

    derived.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    setEvents(derived);
    setLoading(false);
  }, [agentId, agent]);

  useEffect(() => {
    fetchActivity();
    intervalRef.current = setInterval(fetchActivity, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchActivity]);

  return (
    <GlassCard className="!p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Activity</h3>
          <span className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded-full">
            Last 24h
          </span>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchActivity();
          }}
          className="text-[11px] px-2 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw size={10} />
          Refresh
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <Activity size={22} className="text-[var(--text-muted)] mb-2" />
            <p className="text-xs text-[var(--text-muted)]">No recent activity</p>
          </div>
        ) : (
          <div className="relative px-4 py-3">
            {/* Timeline line */}
            <div className="absolute left-[28px] top-3 bottom-3 w-px bg-[var(--bg-card)]" />
            <div className="space-y-3">
              {events.map((event, i) => {
                const Icon = ACTIVITY_ICON[event.type] ?? Activity;
                const colorClass =
                  ACTIVITY_COLOR[event.type] ?? 'text-[var(--text-secondary)] bg-white/10';
                const [iconText, iconBg] = colorClass.split(' ');
                return (
                  <motion.div
                    key={event.id}
                    className="flex items-start gap-3 relative"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.04 }}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 z-10 ${iconBg}`}
                    >
                      <Icon size={13} className={iconText} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {event.message}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {relativeTime(event.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
