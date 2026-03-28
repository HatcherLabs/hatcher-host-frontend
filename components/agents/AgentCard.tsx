'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Agent } from '@/lib/api';
import { shortenAddress, timeAgo } from '@/lib/utils';
import { FRAMEWORKS } from '@hatcher/shared';
import type { AgentFramework } from '@hatcher/shared';

// Framework icon colors
const FRAMEWORK_ICON_COLOR: Record<string, string> = {
  openclaw: '#06b6d4',
  hermes: '#a855f7',
  elizaos: '#f97316',
  milady: '#ec4899',
};

function FrameworkAvatarSmall({ framework }: { framework: string }) {
  const color = FRAMEWORK_ICON_COLOR[framework] ?? '#06b6d4';
  const s = 48;

  if (framework === 'hermes') {
    return (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="12" fill={color} fillOpacity="0.12" />
        <ellipse cx="24" cy="28" rx="7" ry="10" stroke={color} strokeWidth="2" fill="none" />
        <path d="M17 22 Q10 14 16 10 Q18 16 24 18" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.3" strokeLinejoin="round" />
        <path d="M31 22 Q38 14 32 10 Q30 16 24 18" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.3" strokeLinejoin="round" />
        <circle cx="24" cy="28" r="3" fill={color} />
        <line x1="24" y1="31" x2="24" y2="38" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="21" y1="36" x2="24" y2="38" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="27" y1="36" x2="24" y2="38" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (framework === 'elizaos') {
    return (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="12" fill={color} fillOpacity="0.12" />
        <path d="M16 26 Q12 22 14 17 Q16 11 22 12 Q23 9 26 9 Q32 9 33 14 Q37 14 37 19 Q38 24 34 27 Q33 32 28 33 Q26 37 24 37 Q22 37 20 33 Q15 32 16 26Z" stroke={color} strokeWidth="1.8" fill={color} fillOpacity="0.15" />
        <circle cx="20" cy="20" r="1.5" fill={color} />
        <circle cx="28" cy="18" r="1.5" fill={color} />
        <circle cx="24" cy="26" r="1.5" fill={color} />
        <circle cx="31" cy="25" r="1.5" fill={color} />
        <circle cx="18" cy="28" r="1.5" fill={color} />
        <line x1="20" y1="20" x2="28" y2="18" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
        <line x1="28" y1="18" x2="31" y2="25" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
        <line x1="20" y1="20" x2="24" y2="26" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
        <line x1="24" y1="26" x2="31" y2="25" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
        <line x1="24" y1="26" x2="18" y2="28" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
      </svg>
    );
  }

  if (framework === 'milady') {
    return (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="12" fill={color} fillOpacity="0.12" />
        <polygon points="24,10 36,20 24,38 12,20" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.2" strokeLinejoin="round" />
        <polygon points="24,10 36,20 24,22 12,20" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.35" strokeLinejoin="round" />
        <line x1="24" y1="10" x2="24" y2="22" stroke={color} strokeWidth="1.5" strokeOpacity="0.7" />
        <line x1="12" y1="20" x2="36" y2="20" stroke={color} strokeWidth="1.5" strokeOpacity="0.5" />
      </svg>
    );
  }

  // openclaw — robot
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill={color} fillOpacity="0.12" />
      <rect x="13" y="14" width="22" height="16" rx="4" stroke={color} strokeWidth="2" fill={color} fillOpacity="0.15" />
      <circle cx="19" cy="22" r="3" fill={color} fillOpacity="0.8" />
      <circle cx="29" cy="22" r="3" fill={color} fillOpacity="0.8" />
      <rect x="21" y="26" width="6" height="2" rx="1" fill={color} />
      <line x1="24" y1="14" x2="24" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="9" r="2" fill={color} />
      <line x1="13" y1="26" x2="8" y2="32" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="32" x2="6" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="32" x2="10" y2="37" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="35" y1="26" x2="40" y2="32" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="32" x2="38" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="32" x2="42" y2="37" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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
            <FrameworkAvatarSmall framework={agent.framework} />
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

        {/* Description — fall back to framework description */}
        <p className="text-xs leading-relaxed mb-4 flex-1 line-clamp-2" style={{ color: '#A5A1C2' }}>
          {agent.description ?? frameworkMeta?.description ?? 'No description provided'}
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
