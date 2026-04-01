'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Bot, CreditCard, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface QuickStatsProps {
  agentCount: number;
  activeCount: number;
}

const TIER_LABELS: Record<string, string> = {
  free:  'Free',
  basic: 'Basic',
  pro:   'Pro',
};

const TIER_COLORS: Record<string, string> = {
  free:  'text-[var(--text-muted)]',
  basic: 'text-cyan-400',
  pro:   'text-purple-400',
};

const TIER_BG: Record<string, string> = {
  free:  'bg-[rgba(113,113,122,0.1)]',
  basic: 'bg-cyan-500/10',
  pro:   'bg-purple-500/10',
};

// Daily message limits per tier (mirrors CLAUDE.md pricing)
const TIER_MSG_LIMIT: Record<string, number> = {
  free:  20,
  basic: 100,
  pro:   300,
};

const cardVariants = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export function QuickStats({ agentCount, activeCount }: QuickStatsProps) {
  const [tier, setTier]             = useState<string>('free');
  const [agentLimit, setAgentLimit] = useState<number>(1);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    api.getAccountFeatures().then(res => {
      setLoading(false);
      if (res.success) {
        setTier(res.data.tier);
        setAgentLimit(res.data.agentLimit);
      }
    });
  }, []);

  const msgLimit   = TIER_MSG_LIMIT[tier] ?? 20;
  const tierLabel  = TIER_LABELS[tier]  ?? tier;
  const tierColor  = TIER_COLORS[tier]  ?? 'text-[var(--text-muted)]';
  const tierBg     = TIER_BG[tier]      ?? 'bg-[rgba(113,113,122,0.1)]';
  const agentPct   = agentLimit > 0 ? Math.min(100, (agentCount / agentLimit) * 100) : 0;

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card glass-noise p-5">
            <div className="h-4 w-24 rounded shimmer mb-3" />
            <div className="h-8 w-16 rounded shimmer" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Agents */}
      <motion.div className="card glass-noise p-5" variants={cardVariants}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-[#06b6d4]/15 flex items-center justify-center flex-shrink-0">
            <Bot size={16} className="text-[#06b6d4]" />
          </div>
          <div className="text-xs text-[var(--text-muted)] leading-tight">Total Agents</div>
        </div>
        <div className="text-2xl font-bold text-[var(--text-primary)] mb-1.5">
          {agentCount}
          <span className="text-sm font-normal text-[var(--text-muted)] ml-1">/ {agentLimit}</span>
        </div>
        <div className="h-1 rounded-full bg-[var(--bg-hover)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#06b6d4] transition-all duration-500"
            style={{ width: `${agentPct}%` }}
          />
        </div>
      </motion.div>

      {/* Daily Message Limit */}
      <motion.div className="card glass-noise p-5" variants={cardVariants}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-amber-400" />
          </div>
          <div className="text-xs text-[var(--text-muted)] leading-tight">Msg Limit / Agent</div>
        </div>
        <div className="text-2xl font-bold text-[var(--text-primary)]">
          {msgLimit}
        </div>
        <div className="text-[10px] text-[var(--text-muted)] mt-1">per day · BYOK = unlimited</div>
      </motion.div>

      {/* Active Agents */}
      <motion.div className="card glass-noise p-5" variants={cardVariants}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <Activity size={16} className="text-emerald-400" />
          </div>
          <div className="text-xs text-[var(--text-muted)] leading-tight">Active Now</div>
        </div>
        <div className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          {activeCount}
          {activeCount > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
          )}
        </div>
        <div className="text-[10px] text-[var(--text-muted)] mt-1">
          {activeCount === 0 ? 'No agents running' : `${activeCount} agent${activeCount !== 1 ? 's' : ''} online`}
        </div>
      </motion.div>

      {/* Account Tier */}
      <motion.div className="card glass-noise p-5" variants={cardVariants}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-lg ${tierBg} flex items-center justify-center flex-shrink-0`}>
            <CreditCard size={16} className={tierColor} />
          </div>
          <div className="text-xs text-[var(--text-muted)] leading-tight">Account Tier</div>
        </div>
        <div className={`text-2xl font-bold ${tierColor}`}>{tierLabel}</div>
        {tier !== 'pro' && (
          <Link
            href="/dashboard/billing"
            className="text-[10px] text-[#06b6d4] hover:opacity-80 transition-opacity mt-1 block"
          >
            Upgrade plan
          </Link>
        )}
      </motion.div>
    </div>
  );
}
