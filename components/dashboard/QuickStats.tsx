'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TIER_KEYS } from '@hatcher/shared';
import { motion } from 'framer-motion';
import { Activity, Bot, Crown, Zap, Building2, Star, Rocket, User } from 'lucide-react';
import { api } from '@/lib/api';
import { Link } from '@/i18n/routing';

interface QuickStatsProps {
  agentCount: number;
  activeCount: number;
}

// Tier display names are resolved via useTranslations('shared.tiers') at render time.
// TIER_KEYS from @hatcher/shared provides the stable key paths.

const TIER_COLORS: Record<string, string> = {
  free:            'text-[var(--text-muted)]',
  starter:         'text-[var(--color-info)]',
  pro:             'text-[var(--color-accent)]',
  business:        'text-[var(--color-success)]',
  founding_member: 'text-[var(--color-warning)]',
};

const TIER_BG: Record<string, string> = {
  free:            'bg-[var(--bg-elevated)]',
  starter:         'bg-[var(--color-info-bg)]',
  pro:             'bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]',
  business:        'bg-[var(--color-success-bg)]',
  founding_member: 'bg-[var(--color-warning-bg)]',
};

function TierIcon({ tier, className }: { tier: string; className?: string }) {
  const cls = className ?? 'w-4 h-4';
  switch (tier) {
    case 'founding_member': return <Crown className={cls} />;
    case 'business':        return <Building2 className={cls} />;
    case 'pro':             return <Star className={cls} />;
    case 'starter':         return <Rocket className={cls} />;
    default:                return <User className={cls} />;
  }
}

const cardVariants = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export function QuickStats({ agentCount, activeCount }: QuickStatsProps) {
  const t = useTranslations('dashboard.quickStats');
  const tTiers = useTranslations('shared.tiers');
  const [tier, setTier]             = useState<string>('free');
  const [agentLimit, setAgentLimit] = useState<number>(1);
  const [aiCredits, setAiCredits]   = useState<{ balance: number; monthlyGrant: number } | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    api.getAccountFeatures().then(res => {
      setLoading(false);
      if (res.success) {
        setTier(res.data.tier);
        setAgentLimit(res.data.agentLimit);
        setAiCredits(res.data.aiCredits ? {
          balance: res.data.aiCredits.balance,
          monthlyGrant: res.data.aiCredits.monthlyGrant,
        } : null);
      }
    });
  }, []);

  const validTierKey = (tier in TIER_KEYS) ? tier as keyof typeof TIER_KEYS : 'free';
  const tierLabel = tTiers(`${validTierKey}.name`);
  const tierColor = TIER_COLORS[tier]  ?? 'text-[var(--text-muted)]';
  const tierBg    = TIER_BG[tier]      ?? 'bg-zinc-500/10';
  const agentPct  = agentLimit > 0 ? Math.min(100, (agentCount / agentLimit) * 100) : 0;
  const isTopTier = tier === 'founding_member' || tier === 'business';

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
          <div className="w-9 h-9 rounded-lg bg-[var(--color-accent)]/15 flex items-center justify-center flex-shrink-0">
            <Bot size={16} className="text-[var(--color-accent)]" />
          </div>
          <div className="text-xs text-[var(--text-muted)] leading-tight">{t('totalAgents')}</div>
        </div>
        <div className="text-2xl font-bold text-[var(--text-primary)] mb-1.5">
          {agentCount}
          <span className="text-sm font-normal text-[var(--text-muted)] ml-1">/ {agentLimit}</span>
        </div>
        <div className="h-1 rounded-full bg-[var(--bg-hover)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
            style={{ width: `${agentPct}%` }}
          />
        </div>
      </motion.div>

      {/* AI Credits */}
      <motion.div className="card glass-noise p-5" variants={cardVariants}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-warning-bg)] flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-[var(--color-warning)]" />
          </div>
          <div className="text-xs text-[var(--text-muted)] leading-tight">{t('dailyMessages')}</div>
        </div>
        <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
          {aiCredits ? aiCredits.balance.toLocaleString() : '0'}
        </div>
        <div className="text-[10px] text-[var(--text-muted)] mt-1">{t('accountWide')}</div>
      </motion.div>

      {/* Active Agents */}
      <motion.div className="card glass-noise p-5" variants={cardVariants}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-success-bg)] flex items-center justify-center flex-shrink-0">
            <Activity size={16} className="text-[var(--color-success)]" />
          </div>
          <div className="text-xs text-[var(--text-muted)] leading-tight">{t('activeNow')}</div>
        </div>
        <div className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          {activeCount}
          {activeCount > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success)]" />
            </span>
          )}
        </div>
        <div className="text-[10px] text-[var(--text-muted)] mt-1">
          {activeCount === 0
            ? t('noAgentsRunning')
            : activeCount !== 1
              ? t('agentsOnlinePlural', { count: activeCount })
              : t('agentsOnline', { count: activeCount })}
        </div>
      </motion.div>

      {/* Account Tier */}
      <motion.div className="card glass-noise p-5" variants={cardVariants}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-lg ${tierBg} flex items-center justify-center flex-shrink-0`}>
            <TierIcon tier={tier} className={`w-4 h-4 ${tierColor}`} />
          </div>
          <div className="text-xs text-[var(--text-muted)] leading-tight">{t('accountTier')}</div>
        </div>
        <div className={`text-2xl font-bold ${tierColor}`}>{tierLabel}</div>
        {isTopTier ? (
          <div className="text-[10px] text-[var(--text-muted)] mt-1">
            {tier === 'founding_member' ? t('lifetimeAccess') : t('prioritySupport')}
          </div>
        ) : (
          <Link
            href="/dashboard/billing"
            className="text-[10px] text-[var(--color-accent)] hover:opacity-80 transition-opacity mt-1 block"
          >
            {t('upgradePlan')}
          </Link>
        )}
      </motion.div>
    </div>
  );
}
