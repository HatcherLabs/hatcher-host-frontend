'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  MessageSquare,
  Clock,
  Cpu,
  Activity,
  ScrollText,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FRAMEWORKS } from '@hatcher/shared';
import { timeAgo } from '@/lib/utils';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
  FRAMEWORK_BADGE,
  LOG_LEVEL_COLORS,
} from '../AgentContext';

function TechnicalDetails({ chatEndpoint, port }: { chatEndpoint?: string; port?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] text-[#71717a] hover:text-[#A5A1C2] transition-colors"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Technical Details
      </button>
      {open && (
        <div className="grid sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/[0.04]">
          <div>
            <span className="text-xs block mb-1 text-[#71717a]">API Endpoint</span>
            <span className="text-sm font-mono text-[#FFFFFF]">{chatEndpoint ?? 'N/A'}</span>
          </div>
          <div>
            <span className="text-xs block mb-1 text-[#71717a]">Port</span>
            <span className="text-sm font-mono text-[#FFFFFF]">{port ?? 'N/A'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function OverviewTab() {
  const ctx = useAgentContext();
  const {
    agent,
    stats,
    isActive,
    statusInfo,
    llmProvider,
    hasApiKey,
    displayUptime,
    isLiveUptime,
    logs,
    logsLoading,
    setTab,
  } = ctx;

  const frameworkMeta = FRAMEWORKS[agent.framework];

  return (
    <motion.div key="tab-overview" className="space-y-6" variants={tabContentVariants} initial="enter" animate="center" exit="exit">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#f97316]/15 flex items-center justify-center">
              <MessageSquare size={18} className="text-[#f97316]" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-[#FFFFFF] tabular-nums">
                {stats?.messagesProcessed ?? 0}
              </div>
              <div className="text-xs text-[#71717a]">Messages</div>
              <div className="text-[10px] text-[#6B6890] mt-0.5">Since last restart</div>
            </div>
            {/* Mini bar chart indicator */}
            <div className="flex items-end gap-[2px] h-5 self-end">
              {[0.4, 0.6, 0.3, 0.8, 0.5, 0.9, 0.7].map((h, i) => (
                <div key={i} className="w-[2px] rounded-full bg-[#f97316]/30" style={{ height: `${h * 20}px` }} />
              ))}
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Clock size={18} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-[#FFFFFF] tabular-nums">
                {displayUptime < 3600
                  ? `${Math.floor(displayUptime / 60)}m`
                  : `${(displayUptime / 3600).toFixed(1)}h`}
              </div>
              <div className="text-xs text-[#71717a]">Uptime</div>
              <div className="text-[10px] text-[#6B6890] mt-0.5">{isLiveUptime ? 'Live' : 'Since creation'}</div>
            </div>
            {/* Uptime ring */}
            <svg width="28" height="28" viewBox="0 0 28 28" className="progress-ring self-end">
              <circle cx="14" cy="14" r="10" className="progress-ring-bg" strokeWidth="2.5" />
              <circle
                cx="14" cy="14" r="10"
                className="progress-ring-fill"
                strokeWidth="2.5"
                stroke="#60a5fa"
                strokeDasharray={`${Math.min(displayUptime / 86400, 1) * 62.8} 62.8`}
              />
            </svg>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Cpu size={18} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold truncate text-[#FFFFFF]">
                {llmProvider}
              </div>
              <div className="text-xs text-[#71717a]">LLM Provider</div>
            </div>
            {hasApiKey && (
              <div className="self-end">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Own Key</span>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isActive ? 'bg-emerald-500/15' : 'bg-amber-500/15'
            }`}>
              <Activity size={18} className={isActive ? 'text-emerald-400' : 'text-amber-400'} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1.5 text-lg font-bold ${
                  isActive ? 'text-emerald-400' : 'text-[#FFFFFF]'
                }`}>
                  {isActive && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                  )}
                  {statusInfo.label}
                </span>
              </div>
              <div className="text-xs text-[#71717a]">Status</div>
            </div>
            {stats?.lastActiveAt && (
              <div className="self-end text-[9px] text-[#71717a]">
                {timeAgo(stats.lastActiveAt)}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Agent info */}
      <GlassCard>
        <h3 className="text-sm font-semibold mb-4 text-[#A5A1C2]">
          Agent Details
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs block mb-1 text-[#71717a]">Framework</span>
            <span className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border ${FRAMEWORK_BADGE[agent.framework] ?? ''}`}>
              {frameworkMeta?.name ?? agent.framework}
            </span>
          </div>
          <div>
            <span className="text-xs block mb-1 text-[#71717a]">Runtime</span>
            <span className="text-sm text-[#FFFFFF]">
              {frameworkMeta?.dockerImage ?? 'N/A'}
            </span>
          </div>
          {frameworkMeta?.bestFor && (
            <div className="sm:col-span-2">
              <span className="text-xs block mb-1 text-[#71717a]">Best For</span>
              <span className="text-sm text-[#A5A1C2]">
                {frameworkMeta.bestFor}
              </span>
            </div>
          )}

          {/* Collapsible technical details */}
          <div className="sm:col-span-2">
            <TechnicalDetails
              chatEndpoint={frameworkMeta?.chatEndpoint}
              port={frameworkMeta?.port}
            />
          </div>
        </div>
      </GlassCard>

      {/* Live logs preview */}
      <GlassCard className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <ScrollText size={14} className="text-[#f97316]" />
            <h3 className="text-sm font-semibold text-[#A5A1C2]">Live Logs</h3>
            {isActive && (
              <span className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <button
            onClick={() => setTab('logs')}
            className="text-[11px] px-3 py-1 rounded-lg border border-white/10 hover:border-[#f97316]/30 hover:bg-[#f97316]/5 transition-all text-[#71717a] hover:text-[#A5A1C2]"
          >
            View All
          </button>
        </div>
        <div className="log-viewer max-h-56 overflow-y-auto py-1">
          {logsLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#71717a]">No logs available yet.</p>
            </div>
          ) : (
            logs.slice(-10).map((log, i) => (
              <div key={i} className={`log-line log-line-${log.level}`}>
                <span className="log-timestamp">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={`log-badge log-badge-${log.level}`}>
                  {log.level}
                </span>
                <span className={`truncate ${LOG_LEVEL_COLORS[log.level] ?? 'text-[#A5A1C2]'}`}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {/* Quick action buttons */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setTab('chat')}
          className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-white/[0.06] hover:border-[#f97316]/30 hover:bg-[#f97316]/5 transition-all duration-200 text-sm text-[#A5A1C2] bg-[rgba(26,23,48,0.6)]"
        >
          <div className="w-9 h-9 rounded-xl bg-[#f97316]/10 flex items-center justify-center group-hover/btn:bg-[#f97316]/15 transition-colors">
            <MessageSquare size={16} className="text-[#f97316]" />
          </div>
          Chat
        </button>
        <button
          onClick={() => setTab('logs')}
          className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-white/[0.06] hover:border-[#f97316]/30 hover:bg-[#f97316]/5 transition-all duration-200 text-sm text-[#A5A1C2] bg-[rgba(26,23,48,0.6)]"
        >
          <div className="w-9 h-9 rounded-xl bg-[#f97316]/10 flex items-center justify-center group-hover/btn:bg-[#f97316]/15 transition-colors">
            <ScrollText size={16} className="text-[#f97316]" />
          </div>
          Full Logs
        </button>
        <button
          onClick={() => setTab('config')}
          className="group/btn flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-white/[0.06] hover:border-[#f97316]/30 hover:bg-[#f97316]/5 transition-all duration-200 text-sm text-[#A5A1C2] bg-[rgba(26,23,48,0.6)]"
        >
          <div className="w-9 h-9 rounded-xl bg-[#f97316]/10 flex items-center justify-center group-hover/btn:bg-[#f97316]/15 transition-colors">
            <Settings size={16} className="text-[#f97316]" />
          </div>
          Configure
        </button>
      </div>
    </motion.div>
  );
}
