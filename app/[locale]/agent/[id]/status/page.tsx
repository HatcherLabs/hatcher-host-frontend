import type { Metadata } from 'next';
import { Link } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';
import { API_URL } from '@/lib/config';
import { generateAgentAvatar } from '@/lib/avatar-generator';
import { FRAMEWORKS } from '@hatcher/shared';
import type { AgentFramework } from '@hatcher/shared';
import { Activity, Calendar, MessageSquare, Clock, ExternalLink } from 'lucide-react';

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

interface AgentBasic {
  avatarUrl?: string | null;
}

async function fetchPublicStats(id: string): Promise<PublicStats | null> {
  try {
    const res = await fetch(`${API_URL}/agents/${id}/public-stats`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data?: PublicStats };
    return json.success ? (json.data ?? null) : null;
  } catch {
    return null;
  }
}

async function fetchAgentBasic(id: string): Promise<AgentBasic | null> {
  try {
    const res = await fetch(`${API_URL}/agents/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data?: AgentBasic };
    return json.success ? (json.data ?? null) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const stats = await fetchPublicStats(id);

  if (!stats) return { title: 'Agent Status — Hatcher' };

  const statusLabel = stats.status === 'active' ? 'Online' : stats.status === 'sleeping' ? 'Sleeping' : 'Offline';
  const title = `${stats.name} — Status`;
  const description = `${stats.name} is ${statusLabel} · ${stats.uptimePercent}% uptime · ${stats.messagesProcessed.toLocaleString()} messages processed`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://hatcher.host/agent/${id}/status`,
      siteName: 'Hatcher',
      type: 'website',
    },
    twitter: { card: 'summary', title, description },
    alternates: { canonical: `https://hatcher.host/agent/${id}/status` },
  };
}

const STATUS_CONFIG: Record<string, {
  color: string;
  bg: string;
  border: string;
  dotColor: string;
  glowColor: string;
  pulse: boolean;
}> = {
  active: {
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/25',
    dotColor: 'bg-green-400',
    glowColor: 'rgba(74,222,128,0.4)',
    pulse: true,
  },
  sleeping: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/25',
    dotColor: 'bg-blue-400',
    glowColor: 'rgba(99,102,241,0.3)',
    pulse: false,
  },
  paused: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
    dotColor: 'bg-amber-400',
    glowColor: 'rgba(245,158,11,0.3)',
    pulse: false,
  },
  error: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
    dotColor: 'bg-red-400',
    glowColor: 'rgba(239,68,68,0.3)',
    pulse: false,
  },
  killed: {
    color: 'text-zinc-400',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/25',
    dotColor: 'bg-zinc-500',
    glowColor: 'rgba(99,102,241,0.2)',
    pulse: false,
  },
  restarting: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
    dotColor: 'bg-amber-400',
    glowColor: 'rgba(245,158,11,0.3)',
    pulse: true,
  },
};

function UptimeBar({ percent, label }: { percent: number; label: string }) {
  const segments = 24;
  const filled = Math.round((percent / 100) * segments);
  const color = percent >= 90 ? 'bg-green-500/80' : percent >= 70 ? 'bg-amber-500/80' : 'bg-red-500/80';
  const textColor = percent >= 90 ? 'text-green-400' : percent >= 70 ? 'text-amber-400' : 'text-red-400';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
        <span className={`text-sm font-bold tabular-nums ${textColor}`}>{percent}%</span>
      </div>
      <div className="flex gap-1" role="meter" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Uptime bar">
        {Array.from({ length: segments }, (_, i) => (
          <div
            key={i}
            className={`flex-1 h-5 rounded-sm transition-colors ${i < filled ? color : 'bg-[rgba(255,255,255,0.05)]'}`}
          />
        ))}
      </div>
    </div>
  );
}

export default async function AgentStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations('agentPublic.statusPage');
  const tStatus = await getTranslations('agentPublic.status');
  const [stats, agent] = await Promise.all([fetchPublicStats(id), fetchAgentBasic(id)]);

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card glass-noise p-10 text-center max-w-sm w-full">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="w-3 h-3 rounded-full bg-red-400" />
          </div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t('notFound.heading')}</h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            {t('notFound.body')}
          </p>
          <Link href="/dashboard/agents" className="btn-secondary text-sm inline-flex items-center gap-2 justify-center">
            {t('notFound.browseAgents')}
          </Link>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[stats.status] ?? STATUS_CONFIG['paused']!;
  const frameworkMeta = FRAMEWORKS[stats.framework as AgentFramework];
  const avatarUrl = agent?.avatarUrl;
  const isOnline = stats.status === 'active';
  const lastActive = stats.lastActiveAt ? new Date(stats.lastActiveAt) : null;
  const createdAt = new Date(stats.createdAt);

  // Build status label from translation
  const statusKeyMap: Record<string, string> = {
    active: 'active',
    sleeping: 'sleeping',
    paused: 'paused',
    error: 'error',
    killed: 'killed',
    restarting: 'restarting',
  };
  const statusKey = statusKeyMap[stats.status] ?? 'paused';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Ambient glow — SSR-safe via inline style */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-[120px]"
          style={{ background: `radial-gradient(circle, ${statusCfg.glowColor}, transparent 70%)` }}
        />
      </div>

      <div className="w-full max-w-md relative">
        {/* Powered-by link */}
        <div className="flex items-center justify-center mb-6">
          <Link
            href={`/agent/${id}`}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-200"
          >
            {t('poweredBy')}
            <span className="font-semibold text-[var(--text-secondary)]">Hatcher</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* Main card */}
        <div className="card glass-noise p-8 mb-4">
          {/* Avatar + identity */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl || generateAgentAvatar(stats.name, stats.framework)}
                alt={stats.name}
                className="w-20 h-20 rounded-2xl object-cover border border-[var(--border-default)]"
              />
              {/* Online ring */}
              {isOnline && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-[var(--bg-base)] flex items-center justify-center" aria-hidden="true">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                </span>
              )}
            </div>

            {/* agent.name is user-generated content — not wrapped */}
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">{stats.name}</h1>

            {stats.ownerUsername && (
              <p className="text-xs text-[var(--text-muted)] mb-3">by {stats.ownerUsername}</p>
            )}

            {/* Status badge */}
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
              <span className={`w-2 h-2 rounded-full ${statusCfg.dotColor} ${statusCfg.pulse ? 'animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]' : ''}`} aria-hidden="true" />
              {tStatus(statusKey)}
            </span>
          </div>

          {/* Uptime bar */}
          <div className="mb-6">
            <UptimeBar percent={stats.uptimePercent} label={t('uptimeLabel')} />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[var(--bg-elevated)] p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                <MessageSquare className="w-3 h-3" aria-hidden="true" />
                {t('messages')}
              </div>
              <div className="text-xl font-bold text-[var(--color-accent)] tabular-nums">
                {stats.messagesProcessed >= 1000
                  ? `${(stats.messagesProcessed / 1000).toFixed(1)}k`
                  : stats.messagesProcessed.toLocaleString()}
              </div>
            </div>

            <div className="rounded-xl bg-[var(--bg-elevated)] p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                <Clock className="w-3 h-3" aria-hidden="true" />
                {t('days')}
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums">
                {stats.daysActive}
              </div>
            </div>

            <div className="rounded-xl bg-[var(--bg-elevated)] p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                <Calendar className="w-3 h-3" aria-hidden="true" />
                {t('since')}
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">
                {createdAt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              </div>
            </div>
          </div>
        </div>

        {/* Framework + description card */}
        {(frameworkMeta || stats.description) && (
          <div className="card glass-noise p-5 mb-4">
            {frameworkMeta && (
              <div className="flex items-center gap-2 mb-3">
                <span className="fw-tag">{frameworkMeta.name}</span>
                <span className="text-xs text-[var(--text-muted)]">{t('framework')}</span>
              </div>
            )}
            {/* stats.description is user-generated content — not wrapped */}
            {stats.description && (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                {stats.description}
              </p>
            )}
            {lastActive && (
              <p className="text-[10px] text-[var(--text-muted)] mt-3">
                {t('lastActive', {
                  date: lastActive.toLocaleDateString(),
                  time: lastActive.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                })}
              </p>
            )}
          </div>
        )}

        {/* Footer nav */}
        <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-muted)]">
          <Link href={`/agent/${id}`} className="hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1">
            <Activity className="w-3 h-3" aria-hidden="true" />
            {t('viewProfile')}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/" className="hover:text-[var(--text-secondary)] transition-colors">
            Hatcher
          </Link>
        </div>
      </div>
    </div>
  );
}
