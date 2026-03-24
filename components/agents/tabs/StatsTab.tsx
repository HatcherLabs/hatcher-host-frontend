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
import { useAuth } from '@/lib/auth-context';
import {
  useAgentContext,
  STATUS_STYLES,
} from '../AgentContext';

export function StatsTab() {
  const ctx = useAgentContext();
  const { user: authUser } = useAuth();
  const {
    agent,
    stats,
    displayUptime,
    isLiveUptime,
    llmProvider,
    currentProviderMeta,
    hasApiKey,
  } = ctx;
  const tierKey = authUser?.tier ?? 'free';

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
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Instance ID</p>
            <p className="text-sm font-medium text-[#fafafa] font-mono">
              {stats?.containerId ? stats.containerId.substring(0, 12) + '...' : 'Not running'}
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
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Messages</p>
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
          <h3 className="text-base font-semibold text-[#fafafa]">AI Model</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Provider</p>
            <p className="text-sm font-medium text-[#fafafa] capitalize">
              {hasApiKey ? (currentProviderMeta?.name ?? llmProvider) : 'Hatcher Platform'}
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Model</p>
            <p className="text-sm font-medium text-[#fafafa] font-mono">
              {(() => {
                if (!hasApiKey) return 'Platform Default';
                const cfg = (agent?.config ?? {}) as Record<string, unknown>;
                const byok = cfg.byok as Record<string, unknown> | undefined;
                return (byok?.model as string) ?? (cfg.model as string) ?? 'Default';
              })()}
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(46,43,74,0.3)' }}>
            <p className="text-xs text-[#71717a] mb-1 uppercase tracking-wider">Mode</p>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              hasApiKey
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20'
            }`}>
              {hasApiKey ? (
                <><Shield size={12} /> Your Own Key</>
              ) : (
                <><Zap size={12} /> Hatcher Platform</>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Your Plan */}
      <div className="rounded-2xl border p-6" style={{ background: 'rgba(26,23,48,0.8)', borderColor: 'rgba(46,43,74,0.4)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-[#f97316]" />
          <h3 className="text-base font-semibold text-[#fafafa]">Your Plan</h3>
        </div>
        {(() => {
          // Import tier info from auth context
          // tierKey from component scope
          const tierNames: Record<string, string> = { free: 'Free', unlimited: 'Unlimited', pro: 'Pro' };
          const tierName = tierNames[tierKey] ?? 'Free';
          const isPaid = tierKey !== 'free';

          const features = [
            { label: 'Messages', value: isPaid ? 'Unlimited' : '20/day' },
            { label: 'Resources', value: tierKey === 'pro' ? '2 CPU, 2GB RAM' : tierKey === 'unlimited' ? '1 CPU, 1.5GB RAM' : '0.5 CPU, 1GB RAM' },
            { label: 'Auto-sleep', value: tierKey === 'pro' ? 'Always-on' : tierKey === 'unlimited' ? '6 hours idle' : '15 min idle' },
            { label: 'File Manager', value: tierKey === 'pro' ? 'Included' : 'Add-on ($9.99)' },
            { label: 'Integrations', value: 'All included' },
          ];

          return (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(46,43,74,0.3)' }}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPaid ? 'bg-[#f97316]/15' : 'bg-white/[0.06]'}`}>
                  <Shield size={16} className={isPaid ? 'text-[#f97316]' : 'text-[#71717a]'} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{tierName} Tier</p>
                  <p className="text-[10px] text-[#71717a]">{tierKey === 'free' ? 'No charge' : tierKey === 'unlimited' ? '$9.99/mo' : '$19.99/mo'}</p>
                </div>
              </div>
              {features.map((f) => (
                <div key={f.label} className="flex items-center justify-between px-4 py-2">
                  <span className="text-xs text-[#71717a]">{f.label}</span>
                  <span className="text-xs font-medium text-[#A5A1C2]">{f.value}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </motion.div>
  );
}
