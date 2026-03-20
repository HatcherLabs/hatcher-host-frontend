'use client';

import { motion } from 'framer-motion';
import {
  Settings,
  Activity,
  Cpu,
  Zap,
  Lock,
  CheckCircle,
  Shield,
} from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import {
  useAgentContext,
  STATUS_STYLES,
} from '../AgentContext';

export function StatsTab() {
  const ctx = useAgentContext();
  const {
    agent,
    stats,
    displayUptime,
    isLiveUptime,
    llmProvider,
    currentProviderMeta,
    hasApiKey,
    activeFeatures,
  } = ctx;

  return (
    <motion.div
      key="stats"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      {/* Agent Info */}
      <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Settings size={18} className="text-[#f97316]" />
          <h3 className="text-base font-semibold text-[#fafafa]">Agent Info</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Created</p>
            <p className="text-sm font-medium text-[#fafafa]">
              {agent ? new Date(agent.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '--'}
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Framework</p>
            <p className="text-sm font-medium text-[#f97316] capitalize">{agent?.framework ?? '--'}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Container ID</p>
            <p className="text-sm font-medium text-[#fafafa] font-mono">
              {stats?.containerId ? stats.containerId.substring(0, 12) + '...' : 'None'}
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Status</p>
            {(() => {
              const currentStatus = stats?.status ?? agent?.status ?? 'paused';
              const si = STATUS_STYLES[currentStatus] ?? STATUS_STYLES.paused;
              return (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${si.classes}`}>
                  {si.pulse && (
                    <span className={`w-1.5 h-1.5 rounded-full ${si.dotColor} animate-pulse`} />
                  )}
                  {si.label}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-[#f97316]" />
          <h3 className="text-base font-semibold text-[#fafafa]">Activity Summary</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Messages Processed</p>
            {stats?.messagesProcessed && stats.messagesProcessed > 0 ? (
              <p className="text-2xl font-bold text-[#fafafa]">{stats.messagesProcessed.toLocaleString()}</p>
            ) : (
              <p className="text-sm text-[#6B6890] mt-1">No messages yet</p>
            )}
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Uptime</p>
            <p className="text-2xl font-bold text-[#fafafa]">
              {displayUptime < 60
                ? `${displayUptime}s`
                : displayUptime < 3600
                ? `${Math.floor(displayUptime / 60)}m ${displayUptime % 60}s`
                : displayUptime < 86400
                ? `${Math.floor(displayUptime / 3600)}h ${Math.floor((displayUptime % 3600) / 60)}m`
                : `${Math.floor(displayUptime / 86400)}d ${Math.floor((displayUptime % 86400) / 3600)}h`}
            </p>
            <p className="text-[10px] text-[#6B6890] mt-1">{isLiveUptime ? 'Live' : 'Since creation'}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Last Active</p>
            {stats?.lastActiveAt ? (
              <p className="text-2xl font-bold text-[#fafafa]">{timeAgo(stats.lastActiveAt)}</p>
            ) : (
              <p className="text-sm text-[#6B6890] mt-1">Not yet active</p>
            )}
          </div>
        </div>
      </div>

      {/* LLM Configuration */}
      <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Cpu size={18} className="text-[#f97316]" />
          <h3 className="text-base font-semibold text-[#fafafa]">LLM Configuration</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Provider</p>
            <p className="text-sm font-medium text-[#fafafa] capitalize">{currentProviderMeta?.name ?? llmProvider}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Model</p>
            <p className="text-sm font-medium text-[#fafafa] font-mono">
              {(() => {
                const cfg = (agent?.config ?? {}) as Record<string, unknown>;
                const byok = cfg.byok as Record<string, unknown> | undefined;
                return (byok?.model as string) ?? (cfg.model as string) ?? 'Default';
              })()}
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">API Key</p>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              hasApiKey
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {hasApiKey ? (
                <><Shield size={12} /> BYOK Active</>
              ) : (
                <>Free Tier (Groq)</>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Active Features */}
      <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-[#f97316]" />
          <h3 className="text-base font-semibold text-[#fafafa]">Active Features</h3>
          <span className="ml-auto text-xs text-[#71717a]">{activeFeatures.length} unlocked</span>
        </div>
        {activeFeatures.length === 0 ? (
          <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <Lock size={24} className="mx-auto mb-2 text-[#71717a]" />
            <p className="text-sm text-[#71717a]">No features unlocked yet.</p>
            <p className="text-xs text-[#71717a] mt-1">Unlock features in the Integrations tab to power up your agent.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeFeatures.map((feat) => {
              const parts = feat.featureKey.split('.');
              const category = parts.length >= 2 ? parts[parts.length - 2] : '';
              const name = parts[parts.length - 1];
              const displayCategory = category.charAt(0).toUpperCase() + category.slice(1);
              const displayName = name.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              return (
                <div
                  key={feat.id}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: 'rgba(46,43,74,0.3)' }}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#fafafa]">{displayCategory}: {displayName}</p>
                      <p className="text-xs text-[#71717a]">{feat.type === 'subscription' ? 'Subscription' : 'One-time'}</p>
                    </div>
                  </div>
                  {feat.expiresAt && (
                    <span className="text-xs text-[#A5A1C2]">
                      Expires {new Date(feat.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
