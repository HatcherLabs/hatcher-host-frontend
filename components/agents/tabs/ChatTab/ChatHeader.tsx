'use client';

import { Bot, Phone, Volume2, VolumeX } from 'lucide-react';
import { FRAMEWORKS, type AgentFramework } from '@hatcher/shared';
import { FRAMEWORK_BADGE } from '../../AgentContext';

interface ChatHeaderProps {
  agent: { framework: AgentFramework };
  wsConnected: boolean;
  hasVoiceSupport: boolean;
  sttSupported: boolean;
  ttsSupported: boolean;
  isAuthenticated: boolean;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  onStartVoiceCall: () => void;
}

export function ChatHeader({
  agent,
  wsConnected,
  hasVoiceSupport,
  sttSupported,
  ttsSupported,
  isAuthenticated,
  autoSpeak,
  onToggleAutoSpeak,
  onStartVoiceCall,
}: ChatHeaderProps) {
  const frameworkMeta = FRAMEWORKS[agent.framework];

  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border font-medium ${FRAMEWORK_BADGE[agent.framework] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
          <Bot size={10} />
          {frameworkMeta?.name ?? agent.framework}
        </span>
        {wsConnected && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 font-medium" title="Real-time streaming via WebSocket">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Voice Call button */}
        {hasVoiceSupport && sttSupported && isAuthenticated && (
          <button
            onClick={onStartVoiceCall}
            className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border border-[var(--border-default)] bg-transparent text-[var(--text-muted)] hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200 cursor-pointer"
            title="Start voice call"
          >
            <Phone size={11} />
            <span className="hidden sm:inline">Voice</span>
          </button>
        )}
        {ttsSupported && (
          <button
            onClick={onToggleAutoSpeak}
            className={`group flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border transition-all duration-200 cursor-pointer ${
              autoSpeak
                ? 'border-[#06b6d4]/40 bg-[#06b6d4]/10 text-[#06b6d4]'
                : 'border-[var(--border-default)] bg-transparent text-[var(--text-muted)] hover:border-[var(--text-muted)]/40 hover:text-[var(--text-secondary)]'
            }`}
            title="Auto-read responses"
          >
            {autoSpeak ? <Volume2 size={11} /> : <VolumeX size={11} />}
            <span>Auto-read</span>
          </button>
        )}
      </div>
    </div>
  );
}
