'use client';

import { Zap } from 'lucide-react';
import { FRAMEWORKS } from '@hatcher/shared';
import type { AgentFramework } from '@hatcher/shared';
import { GlassCard, FRAMEWORK_BADGE } from '../../AgentContext';

// ─── Framework capability constants ──────────────────────────
// Static decorative chips + stats per framework. Kept here so
// GenericDashboard can surface them for every framework, while
// per-framework dashboards (MiladyDashboard, HermesDashboard, etc.)
// are free to replace this card with something richer.
const FRAMEWORK_CAPABILITIES: Record<string, string[]> = {
  openclaw: [
    'Web Search',
    'Browser',
    'Memory',
    'File Mgmt',
    'Cron Jobs',
    'Sub-agents',
    'Voice/TTS',
    '20+ Platforms',
    '3200+ Skills',
  ],
  hermes: [
    'Persistent Memory',
    'Multi-Provider LLM',
    '40+ Tools',
    'Voice',
    'Learning Agent',
    'Research Mode',
  ],
  elizaos: [
    'Character Personas',
    'Plugin System',
    'Social Media Native',
    'Image Gen',
    'Blockchain',
    'Multi-Client',
  ],
  milady: [
    'Personality Presets',
    'Lightweight (120MB)',
    'Fast Start (800ms)',
    'Privacy-First',
    'Cultural Awareness',
  ],
};

const FRAMEWORK_CAP_STYLE: Record<string, string> = {
  openclaw: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  hermes: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  elizaos: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  milady: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const FRAMEWORK_STAT_COLOR: Record<string, string> = {
  openclaw: 'text-amber-400',
  hermes: 'text-purple-400',
  elizaos: 'text-cyan-400',
  milady: 'text-rose-400',
};

const FRAMEWORK_STATS: Record<string, { label: string; value: string }[]> = {
  openclaw: [
    { label: 'Startup Time', value: '~4s' },
    { label: 'Memory', value: '~380MB' },
    { label: 'Platforms', value: '20+' },
  ],
  hermes: [
    { label: 'Startup Time', value: '~3s' },
    { label: 'Memory', value: '~290MB' },
    { label: 'Platforms', value: '8' },
  ],
  elizaos: [
    { label: 'Startup Time', value: '~2s' },
    { label: 'Memory', value: '~250MB' },
    { label: 'Platforms', value: '10+' },
  ],
  milady: [
    { label: 'Startup Time', value: '~800ms' },
    { label: 'Memory', value: '~120MB' },
    { label: 'Platforms', value: '7' },
  ],
};

/**
 * Framework capabilities card — static chips + stats surfaced on the
 * generic dashboard. Each per-framework dashboard will eventually
 * replace this with live data (real skills count, live uptime, etc.)
 * but for Etapa 1 we keep the legacy behavior.
 */
export function FrameworkCapabilitiesCard({ framework }: { framework: AgentFramework }) {
  const frameworkMeta = FRAMEWORKS[framework];
  const capabilities = FRAMEWORK_CAPABILITIES[framework] ?? [];
  const stats = FRAMEWORK_STATS[framework] ?? [];

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <Zap size={14} className="text-[var(--color-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
          Framework Capabilities
        </h3>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border ${
            FRAMEWORK_BADGE[framework] ?? 'bg-[var(--bg-card)] text-white/60 border-white/10'
          }`}
        >
          {frameworkMeta?.name ?? framework}
        </span>
      </div>

      {/* Capability badges */}
      <div className="flex flex-wrap gap-2 mb-5">
        {capabilities.map((cap) => (
          <span
            key={cap}
            className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium ${
              FRAMEWORK_CAP_STYLE[framework] ?? 'bg-[var(--bg-card)] text-white/60 border-white/10'
            }`}
          >
            {cap}
          </span>
        ))}
      </div>

      {/* Framework stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)]"
          >
            <div
              className={`text-sm font-semibold tabular-nums ${
                FRAMEWORK_STAT_COLOR[framework] ?? 'text-white'
              }`}
            >
              {stat.value}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
