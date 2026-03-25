'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Agent } from '@/lib/api';
import { shortenAddress, timeAgo, getInitials, stringToColor } from '@/lib/utils';
import { FRAMEWORKS } from '@hatcher/shared';
import type { AgentFramework } from '@hatcher/shared';

interface AgentCardProps {
  agent: Agent;
  href?: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string; pulse: boolean }> = {
  active: {
    label: 'Active',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/20',
    dot: 'bg-green-400',
    pulse: true,
  },
  paused: {
    label: 'Paused',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
    pulse: false,
  },
  sleeping: {
    label: 'Sleeping',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    dot: 'bg-blue-400',
    pulse: false,
  },
  error: {
    label: 'Error',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    dot: 'bg-red-400',
    pulse: false,
  },
  killed: {
    label: 'Killed',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    dot: 'bg-red-400',
    pulse: false,
  },
  restarting: {
    label: 'Restarting',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
    pulse: true,
  },
};

export function AgentCard({ agent, href }: AgentCardProps) {
  const [imgError, setImgError] = useState(false);
  const status = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG['paused']!;
  const gradient = stringToColor(agent.id);
  const initials = getInitials(agent.name);

  const ownerDisplay = agent.ownerUsername ?? agent.owner?.username ?? (agent.ownerAddress ? shortenAddress(agent.ownerAddress) : 'Unknown');
  const frameworkMeta = FRAMEWORKS[agent.framework as AgentFramework];

  return (
    <Link href={href ?? `/agent/${agent.id}`} className="block group">
      <div
        className="relative p-5 rounded-2xl h-full flex flex-col transition-all duration-200"
        style={{
          background: 'rgba(13, 11, 26, 0.8)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(46, 43, 74, 0.4)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
          e.currentTarget.style.boxShadow = '0 0 24px rgba(6, 182, 212, 0.1), 0 4px 24px rgba(0, 0, 0, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(46, 43, 74, 0.4)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Header: avatar + name + status */}
        <div className="flex items-start gap-3 mb-3">
          {agent.avatarUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agent.avatarUrl}
              alt={`${agent.name} avatar`}
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}
            >
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate transition-colors duration-200 group-hover:text-[#06b6d4] text-white">
              {agent.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>
                {agent.framework}
              </span>
              <span className="text-xs font-mono" style={{ color: '#71717a' }}>
                {ownerDisplay}
              </span>
            </div>
          </div>

          {/* Status badge */}
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.text} border ${status.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${status.pulse ? 'animate-pulse' : ''}`} />
            {status.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs leading-relaxed mb-4 flex-1 line-clamp-2" style={{ color: '#A5A1C2' }}>
          {agent.description ?? 'No description provided'}
        </p>

        {/* Framework features */}
        {frameworkMeta && (
          <div className="flex flex-wrap gap-1 mb-3">
            {frameworkMeta.features.slice(0, 3).map((feat) => (
              <span
                key={feat}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(6, 182, 212, 0.06)', color: '#71717a' }}
              >
                {feat.toLowerCase()}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t" style={{ borderColor: 'rgba(46, 43, 74, 0.4)' }}>
          <span className="text-xs" style={{ color: '#71717a' }}>{frameworkMeta?.name ?? agent.framework}</span>
          <span className="text-xs" style={{ color: '#71717a' }}>{timeAgo(agent.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
