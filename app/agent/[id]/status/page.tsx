'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getInitials, stringToColor } from '@/lib/utils';

interface PublicStats {
  name: string;
  description: string | null;
  framework: string;
  template: string | null;
  ownerUsername: string | null;
  messagesProcessed: number;
  daysActive: number;
  uptimePercent: number;
  status: string;
  featureCount: number;
  createdAt: string;
  lastActiveAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  active: { label: 'Online', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400' },
  sleeping: { label: 'Sleeping', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-400' },
  paused: { label: 'Offline', color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30', dot: 'bg-zinc-400' },
  error: { label: 'Error', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', dot: 'bg-red-400' },
  killed: { label: 'Stopped', color: 'text-zinc-500', bg: 'bg-zinc-500/10 border-zinc-500/30', dot: 'bg-zinc-500' },
};

function UptimeBar({ percent }: { percent: number }) {
  // Simulate 24 segments for a 24h uptime bar
  const segments = 24;
  const filledSegments = Math.round((percent / 100) * segments);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          className={`h-6 flex-1 rounded-sm ${
            i < filledSegments ? 'bg-emerald-500' : 'bg-zinc-700'
          }`}
          title={`${i < filledSegments ? 'Up' : 'Down'}`}
        />
      ))}
    </div>
  );
}

export default function AgentStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getAgentPublicStats(id).then((res) => {
      if (res.success) {
        setStats(res.data);
      } else {
        setError('Agent not found');
      }
      setLoading(false);
    }).catch(() => {
      setError('Failed to load agent status');
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#06b6d4]/30 border-t-[#06b6d4] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-zinc-400 mb-2">{error ?? 'Agent not found'}</p>
          <a href="/" className="text-sm text-[#06b6d4] hover:underline">Back to Hatcher</a>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[stats.status] ?? STATUS_CONFIG.paused;
  const isOnline = stats.status === 'active';
  const gradient = stringToColor(id);
  const initials = getInitials(stats.name);
  const lastActive = stats.lastActiveAt ? new Date(stats.lastActiveAt) : null;
  const createdAt = new Date(stats.createdAt);

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Agent identity */}
        <div className="text-center mb-8">
          <div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xl border border-[rgba(46,43,74,0.3)] mx-auto mb-4`}
          >
            {initials}
          </div>
          <h1 className="text-2xl font-bold mb-1">{stats.name}</h1>
          {stats.description && (
            <p className="text-sm text-zinc-400 max-w-md mx-auto">{stats.description}</p>
          )}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusConfig.bg} font-medium`}>
              {stats.framework}
            </span>
            {stats.ownerUsername && (
              <span className="text-[10px] text-zinc-500">by @{stats.ownerUsername}</span>
            )}
          </div>
        </div>

        {/* Status indicator */}
        <div className="rounded-2xl border border-[rgba(46,43,74,0.4)] bg-[rgba(26,23,48,0.6)] p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                {isOnline && (
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusConfig.dot} opacity-75`} />
                )}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${statusConfig.dot}`} />
              </span>
              <span className={`text-lg font-semibold ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
            <span className="text-3xl font-bold text-[#06b6d4]">
              {stats.uptimePercent.toFixed(1)}%
            </span>
          </div>

          {/* Uptime bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500">24-hour uptime</span>
              <span className="text-xs text-zinc-500">now</span>
            </div>
            <UptimeBar percent={stats.uptimePercent} />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="rounded-xl border border-[rgba(46,43,74,0.4)] bg-[rgba(26,23,48,0.6)] p-4 text-center">
            <div className="text-xl font-bold text-white">{stats.messagesProcessed.toLocaleString()}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Messages</div>
          </div>
          <div className="rounded-xl border border-[rgba(46,43,74,0.4)] bg-[rgba(26,23,48,0.6)] p-4 text-center">
            <div className="text-xl font-bold text-white">{stats.daysActive}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Days Active</div>
          </div>
          <div className="rounded-xl border border-[rgba(46,43,74,0.4)] bg-[rgba(26,23,48,0.6)] p-4 text-center">
            <div className="text-xl font-bold text-white">{stats.featureCount}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Integrations</div>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-xl border border-[rgba(46,43,74,0.4)] bg-[rgba(26,23,48,0.6)] p-4 mb-8">
          <div className="flex justify-between text-xs text-zinc-400">
            <div>
              <span className="text-zinc-600">Created</span>
              <br />
              {createdAt.toLocaleDateString()}
            </div>
            {lastActive && (
              <div className="text-right">
                <span className="text-zinc-600">Last Active</span>
                <br />
                {lastActive.toLocaleDateString()} {lastActive.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <a
            href="https://hatcher.host"
            className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-[#06b6d4] transition-colors"
          >
            Powered by Hatcher
          </a>
        </div>
      </div>
    </div>
  );
}
