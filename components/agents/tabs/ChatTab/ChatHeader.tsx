'use client';

import { Bot, Menu, Phone, Volume2, VolumeX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FRAMEWORKS, type AgentFramework } from '@hatcher/shared';
import type { ActiveModelDisplay } from '@/lib/hosted-model-catalog';
import { FRAMEWORK_BADGE } from '../../AgentContext';

interface ChatHeaderProps {
  agent: { framework: AgentFramework };
  wsConnected: boolean;
  hasVoiceSupport: boolean;
  sttSupported: boolean;
  ttsSupported: boolean;
  isAuthenticated: boolean;
  autoSpeak: boolean;
  activeModel: ActiveModelDisplay;
  onOpenModelSettings: () => void;
  onOpenMobilePanel: () => void;
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
  activeModel,
  onOpenModelSettings,
  onOpenMobilePanel,
  onToggleAutoSpeak,
  onStartVoiceCall,
}: ChatHeaderProps) {
  const t = useTranslations('dashboard.agentDetail.chat');
  const frameworkMeta = FRAMEWORKS[agent.framework];

  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenMobilePanel}
          data-testid="agent-chat-open-sessions"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-default)] text-[var(--text-muted)] transition-colors hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] md:hidden"
          aria-label="Open chats sidebar"
          title="Chats"
        >
          <Menu size={14} />
        </button>
        <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border font-medium ${FRAMEWORK_BADGE[agent.framework] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
          <Bot size={10} />
          {frameworkMeta?.name ?? agent.framework}
        </span>
        {wsConnected && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-[var(--status-live-border)] bg-[var(--status-live-bg)] text-[var(--status-live)] font-medium" title="Real-time streaming via WebSocket">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-live)] animate-pulse" />
            {t('live')}
          </span>
        )}
        <button
          type="button"
          onClick={onOpenModelSettings}
          className="hidden max-w-[260px] items-center gap-1 truncate rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--color-accent)]/40 hover:text-[var(--text-primary)] sm:inline-flex"
          title={`${activeModel.provider} · ${activeModel.name} · ${activeModel.route}`}
        >
          <span className="text-[var(--color-accent)]">{activeModel.provider}</span>
          <span className="truncate">{activeModel.name}</span>
        </button>
      </div>
      <div className="flex items-center gap-2">
        {/* Voice Call button */}
        {hasVoiceSupport && sttSupported && isAuthenticated && (
          <button
            onClick={onStartVoiceCall}
            className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border border-[var(--border-default)] bg-transparent text-[var(--text-muted)] hover:border-[var(--status-live-border)] hover:text-[var(--status-live)] hover:bg-[var(--status-live-bg)] transition-all duration-200 cursor-pointer"
            title={t('voiceCallTitle')}
          >
            <Phone size={11} />
            <span className="hidden sm:inline">{t('voiceButton')}</span>
          </button>
        )}
        {ttsSupported && (
          <button
            onClick={onToggleAutoSpeak}
            className={`group flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border transition-all duration-200 cursor-pointer ${
              autoSpeak
                ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                : 'border-[var(--border-default)] bg-transparent text-[var(--text-muted)] hover:border-[var(--text-muted)]/40 hover:text-[var(--text-secondary)]'
            }`}
            title={t('autoReadTitle')}
          >
            {autoSpeak ? <Volume2 size={11} /> : <VolumeX size={11} />}
            <span>{t('autoRead')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
